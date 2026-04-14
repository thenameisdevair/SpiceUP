import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateAndParseAddress } from "starknet";
import { db } from "@/lib/db";
import {
  ApiAuthError,
  apiErrorResponse,
  ensureStarknetWallet,
  getPrivyClientOrThrow,
  readBearerAccessToken,
  requireApiUser,
} from "@/lib/server-auth";
import {
  SUPPORTED_TOKEN_SYMBOLS,
  getAllLiveTokenBalances,
  getLiveTokenBalanceRaw,
  isStarknetAccountDeployed,
  parseTokenAmount,
  sendSponsoredTokenTransfer,
  type SupportedTokenSymbol,
} from "@/lib/server-starknet";
import { getNetwork } from "@/constants/network";
import { TOKEN_BY_SYMBOL } from "@/constants/tokens";

const sendSchema = z.object({
  mode: z.enum(["public", "private"]).default("public"),
  recipient: z.string().trim().min(1, "Recipient address is required."),
  token: z.enum(SUPPORTED_TOKEN_SYMBOLS),
  amount: z.string().trim().min(1, "Amount is required."),
});

export async function POST(request: NextRequest) {
  try {
    const { user, identity } = await requireApiUser(request);
    const body = sendSchema.parse(await request.json());

    if (body.mode !== "public") {
      throw new ApiAuthError(
        400,
        "Private transfers are still being wired to Tongo. Public sends are live first."
      );
    }

    const accessToken = readBearerAccessToken(request);

    if (!accessToken) {
      throw new ApiAuthError(
        401,
        "Your secure session is missing. Please sign in again and retry."
      );
    }

    const privyClient = getPrivyClientOrThrow();
    const ensuredWallet = await ensureStarknetWallet(
      identity.privyUserId,
      identity.displayName
    );

    if (!ensuredWallet) {
      throw new ApiAuthError(500, "Could not load the linked Starknet wallet.");
    }

    const wallet = ensuredWallet.public_key
      ? ensuredWallet
      : await privyClient.wallets().get(ensuredWallet.id);
    const senderAddress = user.starknetAddress ?? wallet.address;
    const recipient = validateAndParseAddress(body.recipient);
    const sender = validateAndParseAddress(senderAddress);

    if (recipient === sender) {
      throw new ApiAuthError(
        400,
        "Choose a different recipient address for this transfer."
      );
    }

    const token = TOKEN_BY_SYMBOL[body.token as SupportedTokenSymbol];
    const amountBaseUnits = parseTokenAmount(body.amount, token.decimals);
    const currentBalance = await getLiveTokenBalanceRaw(
      sender,
      body.token as SupportedTokenSymbol
    );

    if (currentBalance < amountBaseUnits) {
      throw new ApiAuthError(
        400,
        `Insufficient ${body.token} balance for this transfer.`
      );
    }

    const deployedBeforeSend = await isStarknetAccountDeployed(sender);
    const execution = await sendSponsoredTokenTransfer({
      client: privyClient,
      wallet,
      accessToken,
      token: body.token as SupportedTokenSymbol,
      recipient,
      amount: amountBaseUnits,
    });
    const balances = await getAllLiveTokenBalances(sender);
    const network = getNetwork().name;

    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: "send",
        amount: body.amount,
        token: body.token,
        counterparty: recipient,
        txHash: execution.txHash,
        isPrivate: false,
        network,
      },
    });

    return NextResponse.json({
      txHash: execution.txHash,
      deploymentTxHash: execution.deploymentTxHash,
      deployedBeforeSend,
      balances,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        token: transaction.token,
        counterparty: transaction.counterparty ?? "",
        timestamp: transaction.timestamp.getTime(),
        txHash: transaction.txHash,
        isPrivate: transaction.isPrivate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    return apiErrorResponse(error);
  }
}
