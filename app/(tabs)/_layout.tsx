import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { IconCustom } from "@/components/ui/icon-custom";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => (
            <IconCustom size={28} name="pm-star" />
          ),
        }}
      />
      <Tabs.Screen
        name="new-quiz"
        options={{
          title: "Novo",
          tabBarIcon: ({ color }) => (
            <IconCustom size={28} name="pm-book" />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color }) => (
            <IconCustom size={28} name="pm-laurel" />
          ),
        }}
      />
      <Tabs.Screen
        name="my-account"
        options={{
          title: "Conta",
          tabBarIcon: ({ color }) => (
            <IconCustom size={28} name="pm-badge" />
          ),
        }}
      />
    </Tabs>
  );
}
