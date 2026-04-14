import { NextResponse, type NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { db } from "@/lib/db";
import {
  getPrivyDisplayName,
  getPrivyEmail,
  getPrivyPhone,
  getWalletAddress,
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

async function getVerifiedIdentity(
  request: NextRequest
): Promise<IdentityShape | null> {
  if (!privyClient) return null;

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!token) return null;

  const privyUser = await privyClient.users().get({ id_token: token });
  const user = privyUser as unknown as { id?: string };

  if (!user.id) {
    throw new ApiAuthError(401, "Authenticated request is missing a Privy user ID");
  }

  return {
    privyUserId: user.id,
    email: getPrivyEmail(privyUser),
    displayName: getPrivyDisplayName(privyUser),
    phoneNumber: getPrivyPhone(privyUser),
    starknetAddress: getWalletAddress(privyUser, undefined),
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

function mergeDefinedFields(identity: IdentityShape) {
  return {
    ...(identity.email !== null ? { email: identity.email } : {}),
    ...(identity.displayName !== null
      ? { displayName: identity.displayName }
      : {}),
    ...(identity.phoneNumber !== null
      ? { phoneNumber: identity.phoneNumber }
      : {}),
    ...(identity.starknetAddress !== null
      ? { starknetAddress: identity.starknetAddress }
      : {}),
    ...(identity.tongoRecipientId !== null
      ? { tongoRecipientId: identity.tongoRecipientId }
      : {}),
  };
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

    identity = getFallbackIdentity(request);
  }

  if (!identity?.privyUserId) {
    throw new ApiAuthError(401, "Authentication required");
  }

  const user = await db.user.upsert({
    where: { privyUserId: identity.privyUserId },
    create: {
      privyUserId: identity.privyUserId,
      ...mergeDefinedFields(identity),
    },
    update: mergeDefinedFields(identity),
  });

  return { user, identity };
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
