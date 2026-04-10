import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0D0D0D",
          borderTopColor: "#1a1a1a",
        },
        tabBarActiveTintColor: "#7B5EA7",
        tabBarInactiveTintColor: "#666",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-up-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-down-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: "Earn",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="fund" options={{ href: null }} />
      <Tabs.Screen name="withdraw" options={{ href: null }} />
      <Tabs.Screen name="group/[id]" options={{ href: null }} />
      <Tabs.Screen name="group/new" options={{ href: null }} />
      <Tabs.Screen name="group/add-expense" options={{ href: null }} />
      <Tabs.Screen name="join" options={{ href: null }} />
      <Tabs.Screen name="stake"        options={{ href: null }} />
      <Tabs.Screen name="unstake"      options={{ href: null }} />
      <Tabs.Screen name="claim"        options={{ href: null }} />
      <Tabs.Screen name="dca-create"   options={{ href: null }} />
      <Tabs.Screen name="lend-deposit" options={{ href: null }} />
      <Tabs.Screen name="lend-withdraw" options={{ href: null }} />
    </Tabs>
  );
}
