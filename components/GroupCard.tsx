// components/GroupCard.tsx
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "@/constants/ui";

function avatarColor(name: string): string {
  const palette = [
    "#7B5EA7", "#3B82F6", "#10B981", "#F59E0B",
    "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface GroupMemberPreview {
  displayName: string;
}

interface Props {
  name: string;
  members: GroupMemberPreview[];
  /** Positive = they owe you. Negative = you owe them. null = settled. */
  netBalance: number | null;
  currency?: string;
  onPress: () => void;
}

const MAX_AVATARS = 3;

export function GroupCard({ name, members, netBalance, currency = "USD", onPress }: Props) {
  const overflowCount = Math.max(0, members.length - MAX_AVATARS);
  const shownMembers  = members.slice(0, MAX_AVATARS);

  const settled     = netBalance === null || netBalance === 0;
  const youOwe      = !settled && netBalance! < 0;
  const badgeColor  = settled ? COLORS.textMuted : youOwe ? COLORS.negative : COLORS.positive;
  const badgeBg     = settled ? COLORS.surface : youOwe ? COLORS.errorSubtle : COLORS.successSubtle;
  const badgeLabel  = settled
    ? "Settled"
    : youOwe
    ? `You owe $${Math.abs(netBalance!).toFixed(2)}`
    : `You get $${netBalance!.toFixed(2)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      })}
    >
      {/* Left: name + member avatars */}
      <View style={{ gap: SPACING.xs }}>
        <Text style={{ color: COLORS.textPrimary, fontFamily: "Inter-SemiBold", fontSize: 15 }}>
          {name}
        </Text>

        {/* Avatar row */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {shownMembers.map((m, i) => (
            <View
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: avatarColor(m.displayName),
                alignItems: "center",
                justifyContent: "center",
                marginLeft: i === 0 ? 0 : -6,
                borderWidth: 1.5,
                borderColor: COLORS.background,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter-Bold" }}>
                {initials(m.displayName)}
              </Text>
            </View>
          ))}
          {overflowCount > 0 && (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: COLORS.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: -6,
                borderWidth: 1.5,
                borderColor: COLORS.background,
              }}
            >
              <Text style={{ color: COLORS.textTertiary, fontSize: 8, fontFamily: "Inter-Bold" }}>
                +{overflowCount}
              </Text>
            </View>
          )}
          <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginLeft: 6, fontFamily: "Inter-Regular" }}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Right: balance badge + chevron */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
        <View style={{
          backgroundColor: badgeBg,
          paddingHorizontal: SPACING.sm,
          paddingVertical: 4,
          borderRadius: RADIUS.full,
        }}>
          <Text style={{ color: badgeColor, fontFamily: "Inter-Medium", fontSize: 12 }}>
            {badgeLabel}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
}
