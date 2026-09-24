import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: "#9AA59F",
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginBottom: 2 },
        tabBarStyle: { height: 63 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: colors.background, borderTopColor: "#E7ECE9", borderTopWidth: 1 },
      }}
    >
      <Tabs.Screen name="messages" options={{ title: "المحادثات", tabBarIcon: ({ color }) => <IconSymbol size={22} name="message.fill" color={color} /> }} />
      <Tabs.Screen name="assets" options={{ title: "الأصول", tabBarIcon: ({ color }) => <IconSymbol size={22} name="wallet.fill" color={color} /> }} />
      <Tabs.Screen name="trade" options={{ title: "تجارة", tabBarIcon: ({ color }) => <IconSymbol size={22} name="chart.bar.fill" color={color} /> }} />
      <Tabs.Screen name="predict" options={{ title: "توقع", tabBarIcon: ({ color }) => <IconSymbol size={22} name="sparkles" color={color} /> }} />
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} /> }} />
    </Tabs>
  );
}
