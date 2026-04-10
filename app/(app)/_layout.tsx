import { Tabs } from "expo-router";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TAB_BAR } from "@/constants/ui";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.82); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 180 }); }}
      hitSlop={6}
    >
      <Animated.View style={style}>
        <Ionicons
          name={focused ? name.replace("-outline", "") as any : name}
          size={24}
          color={color}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: TAB_BAR.backgroundColor,
          borderTopColor:  TAB_BAR.borderTopColor,
          height:          TAB_BAR.height,
          paddingBottom:   8,
        },
        tabBarActiveTintColor:   TAB_BAR.activeTintColor,
        tabBarInactiveTintColor: TAB_BAR.inactiveTintColor,
        tabBarLabelStyle: {
          fontFamily: "Inter-Medium",
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="arrow-up-circle-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="arrow-down-circle-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="people-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: "Earn",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trending-up-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings-outline" color={color} focused={focused} />
          ),
        }}
      />

      {/* Hidden modal screens — no tab entry */}
      {[
        "fund", "withdraw",
        "group/[id]", "group/new", "group/add-expense", "join",
        "stake", "unstake", "claim",
        "dca-create", "lend-deposit", "lend-withdraw",
      ].map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
