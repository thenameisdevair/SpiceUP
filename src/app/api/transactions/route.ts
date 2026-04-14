import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser, apiErrorResponse } from "@/lib/server-auth";

const createTransactionSchema = z.object({
  type: z.enum([
    "send",
    "receive",
    "fund",
    "withdraw",
    "stake",
    "unstake",
    "claim_rewards",
    "dca_create",
    "lend_deposit",
    "lend_withdraw",
  ]),
  amount: z.string().trim().min(1),
  token: z.string().trim().min(1).max(16),
  counterparty: z.string().trim().min(1),
  txHash: z.string().trim().nullable().optional(),
  isPrivate: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireApiUser(request);

    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        token: tx.token,
        counterparty: tx.counterparty ?? "",
        timestamp: tx.timestamp.getTime(),
        txHash: tx.txHash,
        isPrivate: tx.isPrivate,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireApiUser(request);
    const body = createTransactionSchema.parse(await request.json());

    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: body.type,
        amount: body.amount,
        token: body.token,
        counterparty: body.counterparty,
        txHash: body.txHash ?? null,
        isPrivate: body.isPrivate,
      },
    });

    return NextResponse.json({
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
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireApiUser(request);

    await db.transaction.deleteMany({
      where: { userId: user.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
