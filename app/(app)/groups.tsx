import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGroups } from "@/hooks/useGroups";
import { useGroupsStore } from "@/stores/groups";
import { useAuthStore } from "@/stores/auth";
import { GroupCard } from "@/components/GroupCard";

export default function GroupsScreen() {
  const { refresh } = useGroups();
  const { groups, loading } = useGroupsStore();
  const { privyUserId } = useAuthStore();

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-4 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">Groups</Text>
      </View>

      {loading && groups.length === 0 ? (
        <ActivityIndicator color="#7B5EA7" className="mt-8" />
      ) : groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={48} color="#4b5563" />
          <Text className="text-neutral-500 text-center mt-4">
            No groups yet — create one to start splitting expenses
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <GroupCard
              name={item.name}
              members={item.members}
              netBalance={null}
              onPress={() => router.push(`/(app)/group/${item.id}`)}
            />
          )}
          refreshing={loading}
          onRefresh={refresh}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}

      <Pressable
        onPress={() => router.push("/(app)/group/new")}
        className="absolute bottom-8 right-6 bg-purple-700 w-14 h-14 rounded-full items-center justify-center"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}
