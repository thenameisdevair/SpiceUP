import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser, apiErrorResponse, ApiAuthError } from "@/lib/server-auth";
import {
  buildClientMemberIdMap,
  groupBundleInclude,
  resolveClientMemberId,
  serializeSettlement,
} from "@/lib/server-groups";

const addSettlementSchema = z.object({
  fromMemberId: z.string().trim().min(1),
  toMemberId: z.string().trim().min(1),
  amount: z.number().positive(),
  token: z.string().trim().min(1).max(12).default("USDC"),
  isPrivate: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireApiUser(request);
    const { id } = await context.params;
    const body = addSettlementSchema.parse(await request.json());

    const group = await db.group.findFirst({
      where: {
        id,
        members: { some: { userId: user.id } },
      },
      include: groupBundleInclude,
    });

    if (!group) {
      throw new ApiAuthError(404, "Group not found");
    }

    const fromMemberId = resolveClientMemberId(group, user.id, body.fromMemberId);
    const toMemberId = resolveClientMemberId(group, user.id, body.toMemberId);

    if (!fromMemberId || !toMemberId) {
      throw new ApiAuthError(400, "Settlement members were not found");
    }

    const settlement = await db.settlement.create({
      data: {
        groupId: id,
        fromMemberId,
        toMemberId,
        amount: body.amount,
        token: body.token,
        isPrivate: body.isPrivate,
      },
      include: {
        fromMember: true,
        toMember: true,
      },
    });

    const memberIdMap = buildClientMemberIdMap(group.members, user.id);

    return NextResponse.json({
      settlement: serializeSettlement(settlement, memberIdMap),
    });
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
