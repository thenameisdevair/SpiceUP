import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiAuthError, apiErrorResponse, requireApiUser } from "@/lib/server-auth";

const updateMemberSchema = z.object({
  walletAddress: z.string().trim().min(3).max(128).nullable(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { user } = await requireApiUser(request);
    const { id, memberId } = await context.params;
    const body = updateMemberSchema.parse(await request.json());

    const group = await db.group.findFirst({
      where: {
        id,
        members: { some: { userId: user.id } },
      },
      select: {
        id: true,
        members: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!group) {
      throw new ApiAuthError(404, "Group not found");
    }

    const memberExists = group.members.some((member) => member.id === memberId);

    if (!memberExists) {
      throw new ApiAuthError(404, "Group member not found");
    }

    const member = await db.groupMember.update({
      where: { id: memberId },
      data: {
        walletAddress: body.walletAddress,
      },
      select: {
        id: true,
        walletAddress: true,
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    return apiErrorResponse(error);
  }
}
