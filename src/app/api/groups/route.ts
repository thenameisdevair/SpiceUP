import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser, apiErrorResponse } from "@/lib/server-auth";
import {
  groupBundleInclude,
  serializeGroup,
  serializeGroupBundle,
} from "@/lib/server-groups";

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  members: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        color: z.string().trim().min(4).max(32),
        walletAddress: z.string().trim().min(3).max(128).optional().or(z.literal("")),
      })
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireApiUser(request);

    const groups = await db.group.findMany({
      where: {
        OR: [{ createdById: user.id }, { members: { some: { userId: user.id } } }],
      },
      include: groupBundleInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(serializeGroupBundle(groups, user.id));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireApiUser(request);
    const body = createGroupSchema.parse(await request.json());

    const group = await db.group.create({
      data: {
        name: body.name,
        createdById: user.id,
        members: {
          create: [
            {
              userId: user.id,
              displayName: user.displayName || user.email || "You",
              avatarColor: "#7B5EA7",
              walletAddress: user.starknetAddress,
            },
            ...body.members.map((member) => ({
              displayName: member.name,
              avatarColor: member.color,
              walletAddress: member.walletAddress?.trim() || null,
            })),
          ],
        },
      },
      include: groupBundleInclude,
    });

    return NextResponse.json({
      group: serializeGroup(group, user.id),
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
