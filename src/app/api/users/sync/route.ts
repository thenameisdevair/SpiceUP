import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser, apiErrorResponse } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireApiUser(request);

    return NextResponse.json({
      user: {
        id: user.id,
        privyUserId: user.privyUserId,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        starknetAddress: user.starknetAddress,
        tongoRecipientId: user.tongoRecipientId,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
