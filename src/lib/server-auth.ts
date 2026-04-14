import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { PrivyClient } from "@privy-io/node";
import { db } from "@/lib/db";
import {
  getPrivyDisplayName,
  getPrivyEmail,
  getPrivyPhone,
} from "@/lib/auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const privyAppSecret = process.env.PRIVY_APP_SECRET ?? "";

const privyClient =
  privyAppId && privyAppSecret
    ? new PrivyClient({
        appId: privyAppId,
        appSecret: privyAppSecret,
      })
    : null;

type IdentityShape = {
  privyUserId: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  starknetAddress: string | null;
  tongoRecipientId: string | null;
};

export class ApiAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readHeader(request: NextRequest, key: string): string | null {
  const value = request.headers.get(key);
  return value && value.trim() ? value.trim() : null;
}

export function readBearerAccessToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  return token && token.length > 0 ? token : null;
}

export function getPrivyClient() {
  return privyClient;
}

export function getPrivyClientOrThrow() {
  if (!privyClient) {
    throw new ApiAuthError(
      500,
      "Privy server authentication is not configured. Set PRIVY_APP_SECRET."
    );
  }

  return privyClient;
}

async function getVerifiedIdentity(
  request: NextRequest
): Promise<IdentityShape | null> {
  if (!privyClient) return null;

  const token = readBearerAccessToken(request);

  if (!token) return null;

  const verifiedAccessToken = await privyClient.utils().auth().verifyAccessToken(token);
  const identityToken = readHeader(request, "x-privy-identity-token");
  let privyUser: unknown = null;

  if (identityToken) {
    try {
      privyUser = await privyClient.users().get({ id_token: identityToken });
    } catch (error) {
      console.warn("Privy identity token could not be parsed, falling back to request metadata.", error);
    }
  }

  if (!verifiedAccessToken.user_id) {
    throw new ApiAuthError(401, "Authenticated request is missing a Privy user ID");
  }

  return {
    privyUserId: verifiedAccessToken.user_id,
    email: privyUser ? getPrivyEmail(privyUser) : readHeader(request, "x-user-email"),
    displayName: privyUser
      ? getPrivyDisplayName(privyUser)
      : readHeader(request, "x-user-name"),
    phoneNumber: privyUser
      ? getPrivyPhone(privyUser)
      : readHeader(request, "x-user-phone"),
    starknetAddress: null,
    tongoRecipientId: readHeader(request, "x-tongo-recipient-id"),
  };
}

function getFallbackIdentity(request: NextRequest): IdentityShape | null {
  const privyUserId = readHeader(request, "x-privy-user-id");

  if (!privyUserId) return null;

  return {
    privyUserId,
    email: readHeader(request, "x-user-email"),
    displayName: readHeader(request, "x-user-name"),
    phoneNumber: readHeader(request, "x-user-phone"),
    starknetAddress: readHeader(request, "x-wallet-address"),
    tongoRecipientId: readHeader(request, "x-tongo-recipient-id"),
  };
}

export async function findFirstStarknetWallet(privyUserId: string) {
  if (!privyClient) return null;

  for await (const wallet of privyClient.wallets().list({
    user_id: privyUserId,
    chain_type: "starknet",
  })) {
    return wallet;
  }

  return null;
}

export async function ensureStarknetWallet(
  privyUserId: string,
  displayName: string | null
) {
  if (!privyClient) return null;

  const existingWallet = await findFirstStarknetWallet(privyUserId);
  if (existingWallet) return existingWallet;

  try {
    return await privyClient.wallets().create({
      chain_type: "starknet",
      owner: { user_id: privyUserId },
      ...(displayName
        ? { display_name: `${displayName.slice(0, 40)} Starknet` }
        : {}),
    });
  } catch (error) {
    const walletAfterRetry = await findFirstStarknetWallet(privyUserId);

    if (walletAfterRetry) {
      return walletAfterRetry;
    }

    throw error;
  }
}

function mergeDefinedFields(identity: IdentityShape) {
  const createData = {} as Prisma.UserUncheckedCreateInput;

  if (identity.email !== null) {
    createData.email = identity.email;
  }
  if (identity.displayName !== null) {
    createData.displayName = identity.displayName;
  }
  if (identity.phoneNumber !== null) {
    createData.phoneNumber = identity.phoneNumber;
  }
  if (identity.starknetAddress !== null) {
    createData.starknetAddress = identity.starknetAddress;
  }
  if (identity.tongoRecipientId !== null) {
    createData.tongoRecipientId = identity.tongoRecipientId;
  }

  return createData;
}

export async function requireApiUser(request: NextRequest) {
  let identity: IdentityShape | null = null;

  try {
    identity = await getVerifiedIdentity(request);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  if (!identity) {
    if (process.env.NODE_ENV === "production" && !privyClient) {
      throw new ApiAuthError(
        500,
        "Privy server authentication is not configured. Set PRIVY_APP_SECRET."
      );
    }

    if (process.env.NODE_ENV === "production") {
      throw new ApiAuthError(401, "Authentication required");
    }

    identity = getFallbackIdentity(request);
  }

  if (!identity?.privyUserId) {
    throw new ApiAuthError(401, "Authentication required");
  }

  const existingUser = await db.user.findUnique({
    where: { privyUserId: identity.privyUserId },
    select: { starknetAddress: true },
  });

  const starknetWallet =
    existingUser?.starknetAddress === null || existingUser?.starknetAddress === undefined
      ? await ensureStarknetWallet(identity.privyUserId, identity.displayName)
      : null;
  const canonicalIdentity: IdentityShape = {
    ...identity,
    starknetAddress:
      existingUser?.starknetAddress ?? starknetWallet?.address ?? identity.starknetAddress,
  };

  const user = await db.user.upsert({
    where: { privyUserId: canonicalIdentity.privyUserId },
    create: {
      privyUserId: canonicalIdentity.privyUserId,
      ...mergeDefinedFields(canonicalIdentity),
    },
    update: mergeDefinedFields(canonicalIdentity),
  });

  return { user, identity: canonicalIdentity };
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
