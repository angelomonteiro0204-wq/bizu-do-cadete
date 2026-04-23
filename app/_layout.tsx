import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, ActivityIndicator, View, Text } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { AuthGateProvider, useAuthGate } from "@/lib/auth-context";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/** Navigation guard that redirects based on auth + subscription status */
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, hasActiveSubscription, isAdmin } = useAuthGate();
  const router = useRouter();
  const segments = useSegments();
  const [lastRoute, setLastRoute] = useState<string>("");
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (loading || isNavigating) return;

    const currentRoute = segments.join("/");

    // Avoid redundant navigation
    if (currentRoute === lastRoute) return;

    // Allow oauth callback to proceed
    if (currentRoute.startsWith("oauth")) return;

    let nextRoute: string | null = null;

    if (!isAuthenticated) {
      // Not logged in -> go to login
      if (currentRoute !== "login") {
        nextRoute = "/login";
      }
    } else if (!hasActiveSubscription && !isAdmin) {
      // Logged in but no active subscription and not admin -> blocked
      if (currentRoute !== "blocked" && currentRoute !== "login") {
        nextRoute = "/blocked";
      }
    } else {
      // Authenticated with active subscription (or admin) -> go to tabs
      if (currentRoute === "login" || currentRoute === "blocked") {
        nextRoute = "/(tabs)";
      }
    }

    if (nextRoute) {
      setLastRoute(nextRoute);
      setIsNavigating(true);
      // Add small delay to ensure state is settled
      const timer = setTimeout(() => {
        router.replace(nextRoute as any);
        setIsNavigating(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, hasActiveSubscription, isAdmin, segments, router, lastRoute, isNavigating]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1B2A4A" }}>
        <ActivityIndicator size="large" color="#C8A84E" />
        <Text style={{ color: "#C8A84E", marginTop: 16, fontSize: 16, fontWeight: "600" }}>
          Bizu do Cadete
        </Text>
        <Text style={{ color: "#FFFFFF", marginTop: 8, fontSize: 13, opacity: 0.7 }}>
          Verificando acesso...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthGateProvider>
            <NavigationGuard>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" options={{ animation: "fade" }} />
                <Stack.Screen name="blocked" options={{ animation: "fade" }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="quiz/[id]" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="admin" options={{ animation: "slide_from_right", presentation: "fullScreenModal" }} />
                <Stack.Screen name="debug" options={{ animation: "slide_from_right", presentation: "fullScreenModal" }} />
                <Stack.Screen name="oauth/callback" />
              </Stack>
              <StatusBar style="auto" />
            </NavigationGuard>
          </AuthGateProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
