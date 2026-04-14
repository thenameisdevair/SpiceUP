import { Prisma, type GroupMember as DbGroupMember } from "@prisma/client";
import { SELF_MEMBER_ID, type Expense, type Group, type Settlement } from "@/lib/groups";

export const groupBundleInclude = {
  members: {
    orderBy: { joinedAt: "asc" },
  },
  expenses: {
    include: {
      splits: true,
      paidBy: true,
    },
    orderBy: { createdAt: "desc" },
  },
  settlements: {
    include: {
      fromMember: true,
      toMember: true,
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.GroupInclude;

export type DbGroupBundle = Prisma.GroupGetPayload<{
  include: typeof groupBundleInclude;
}>;

function mapMemberId(member: DbGroupMember, currentUserId: string) {
  return member.userId === currentUserId ? SELF_MEMBER_ID : member.id;
}

function mapMemberName(member: DbGroupMember, currentUserId: string) {
  return member.userId === currentUserId ? "You" : member.displayName;
}

export function buildClientMemberIdMap(
  members: DbGroupMember[],
  currentUserId: string
) {
  return new Map(
    members.map((member) => [member.id, mapMemberId(member, currentUserId)])
  );
}

export function serializeGroup(
  group: DbGroupBundle,
  currentUserId: string
): Group {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.getTime(),
    members: group.members.map((member) => ({
      id: mapMemberId(member, currentUserId),
      name: mapMemberName(member, currentUserId),
      avatarColor: member.avatarColor,
    })),
  };
}

export function serializeExpense(
  expense: DbGroupBundle["expenses"][number],
  memberIdMap: Map<string, string>
): Expense {
  return {
    id: expense.id,
    groupId: expense.groupId,
    description: expense.description,
    amount: Number(expense.amount),
    token: expense.token,
    paidBy: memberIdMap.get(expense.paidById) ?? expense.paidById,
    splitMode: expense.splitMode,
    splits: expense.splits.map((split) => ({
      memberId: memberIdMap.get(split.memberId) ?? split.memberId,
      amount: Number(split.amount),
    })),
    createdAt: expense.createdAt.getTime(),
  };
}

export function serializeSettlement(
  settlement: DbGroupBundle["settlements"][number],
  memberIdMap: Map<string, string>
): Settlement {
  return {
    id: settlement.id,
    groupId: settlement.groupId,
    fromMemberId:
      memberIdMap.get(settlement.fromMemberId) ?? settlement.fromMemberId,
    toMemberId: memberIdMap.get(settlement.toMemberId) ?? settlement.toMemberId,
    amount: Number(settlement.amount),
    token: settlement.token,
    isPrivate: settlement.isPrivate,
    createdAt: settlement.createdAt.getTime(),
  };
}

export function serializeGroupBundle(groups: DbGroupBundle[], currentUserId: string) {
  const memberIdMap = new Map<string, string>();

  for (const group of groups) {
    for (const member of group.members) {
      memberIdMap.set(member.id, mapMemberId(member, currentUserId));
    }
  }

  const expenses: Expense[] = groups.flatMap((group) =>
    group.expenses.map((expense) => ({
      id: expense.id,
      groupId: expense.groupId,
      description: expense.description,
      amount: Number(expense.amount),
      token: expense.token,
      paidBy: memberIdMap.get(expense.paidById) ?? expense.paidById,
      splitMode: expense.splitMode,
      splits: expense.splits.map((split) => ({
        memberId: memberIdMap.get(split.memberId) ?? split.memberId,
        amount: Number(split.amount),
      })),
      createdAt: expense.createdAt.getTime(),
    }))
  );

  const settlements: Settlement[] = groups.flatMap((group) =>
    group.settlements.map((settlement) => ({
      id: settlement.id,
      groupId: settlement.groupId,
      fromMemberId:
        memberIdMap.get(settlement.fromMemberId) ?? settlement.fromMemberId,
      toMemberId: memberIdMap.get(settlement.toMemberId) ?? settlement.toMemberId,
      amount: Number(settlement.amount),
      token: settlement.token,
      isPrivate: settlement.isPrivate,
      createdAt: settlement.createdAt.getTime(),
    }))
  );

  return {
    groups: groups.map((group) => serializeGroup(group, currentUserId)),
    expenses,
    settlements,
  };
}

export function resolveClientMemberId(
  group: DbGroupBundle,
  currentUserId: string,
  clientMemberId: string
) {
  if (clientMemberId === SELF_MEMBER_ID) {
    return (
      group.members.find((member) => member.userId === currentUserId)?.id ?? null
    );
  }

  return group.members.find((member) => member.id === clientMemberId)?.id ?? null;
}
