import { NextResponse, type NextRequest } from "next/server";
import {
  ApiAuthError,
  apiErrorResponse,
  ensureStarknetWallet,
  requireApiUser,
} from "@/lib/server-auth";
import { getAllLiveTokenBalances } from "@/lib/server-starknet";

export async function GET(request: NextRequest) {
  try {
    const { user, identity } = await requireApiUser(request);
    const ensuredWallet =
      user.starknetAddress || !identity.privyUserId
        ? null
        : await ensureStarknetWallet(identity.privyUserId, identity.displayName);
    const address = user.starknetAddress ?? ensuredWallet?.address;

    if (!address) {
      throw new ApiAuthError(
        500,
        "Starknet wallet is not available for this user."
      );
    }

    const balances = await getAllLiveTokenBalances(address);

    return NextResponse.json({
      address,
      balances,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
