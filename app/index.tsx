import { View, ActivityIndicator } from "react-native";

export default function Splash() {
  // useAuthGuard in root layout handles the redirect; this is a neutral splash.
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#7B5EA7" />
    </View>
  );
}
