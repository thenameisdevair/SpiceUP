import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser, apiErrorResponse, ApiAuthError } from "@/lib/server-auth";
import {
  buildClientMemberIdMap,
  groupBundleInclude,
  resolveClientMemberId,
  serializeExpense,
} from "@/lib/server-groups";

const addExpenseSchema = z.object({
  description: z.string().trim().min(1).max(140),
  amount: z.number().positive(),
  token: z.string().trim().min(1).max(12),
  paidBy: z.string().trim().min(1),
  splitMode: z.enum(["equal", "custom"]),
  splits: z
    .array(
      z.object({
        memberId: z.string().trim().min(1),
        amount: z.number().min(0),
      })
    )
    .min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireApiUser(request);
    const { id } = await context.params;
    const body = addExpenseSchema.parse(await request.json());

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

    const paidById = resolveClientMemberId(group, user.id, body.paidBy);
    if (!paidById) {
      throw new ApiAuthError(400, "Payer was not found in this group");
    }

    const splitRows = body.splits.map((split) => {
      const memberId = resolveClientMemberId(group, user.id, split.memberId);
      if (!memberId) {
        throw new ApiAuthError(400, "One of the split members was not found");
      }

      return {
        memberId,
        amount: split.amount,
      };
    });

    const expense = await db.expense.create({
      data: {
        groupId: id,
        description: body.description,
        amount: body.amount,
        token: body.token,
        paidById,
        splitMode: body.splitMode,
        splits: {
          create: splitRows,
        },
      },
      include: {
        splits: true,
        paidBy: true,
      },
    });

    const memberIdMap = buildClientMemberIdMap(group.members, user.id);

    return NextResponse.json({
      expense: serializeExpense(expense, memberIdMap),
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
