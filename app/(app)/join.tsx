import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { resolveInvite, addMember } from "@/lib/groups";

export default function JoinGroup() {
  const { groupId, token } = useLocalSearchParams<{
    groupId?: string;
    token?: string;
  }>();
  const { privyUserId, starknetAddress, tongoRecipientId } = useAuthStore();

  useEffect(() => {
    if (!groupId || !token || !privyUserId) return;

    resolveInvite(groupId, token).then(async (group) => {
      if (!group) {
        Alert.alert("Invalid invite link", "This invite has expired or is not valid.");
        router.replace("/(app)/home");
        return;
      }

      const alreadyMember = group.members.some((m) => m.userId === privyUserId);
      if (!alreadyMember) {
        await addMember(groupId, {
          userId: privyUserId,
          tongoId: tongoRecipientId
            ? `tongo:${tongoRecipientId.x}:${tongoRecipientId.y}`
            : null,
          starknetAddress: starknetAddress,
          displayName: "Me",
          phoneHash: null,
        }).catch(() => {/* best-effort */});
      }

      router.replace(`/(app)/group/${groupId}`);
    });
  }, [groupId, token, privyUserId]);

  return (
    <View className="flex-1 bg-neutral-950 items-center justify-center">
      <ActivityIndicator color="#7B5EA7" size="large" />
      <Text className="text-neutral-400 mt-4">Joining group…</Text>
    </View>
  );
}
