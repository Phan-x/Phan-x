import "@/global.css";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  Stack,
  useRouter,
  useSegments,
} from "expo-router";

import { StatusBar } from "expo-status-bar";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Platform,
  View,
} from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import "react-native-reanimated";

import "@/lib/_core/nativewind-pressable";

import { ThemeProvider } from "@/lib/theme-provider";

import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import type {
  EdgeInsets,
  Metrics,
  Rect,
} from "react-native-safe-area-context";

import {
  trpc,
  createTRPCClient,
} from "@/lib/trpc";
import * as Auth from "@/lib/_core/auth";

import {
  initManusRuntime,
  subscribeSafeAreaInsets,
} from "@/lib/_core/manus-runtime";

import { LocaleProvider } from "@/lib/_core/i18n";


/* =========================================================
   Safe Area Defaults
========================================================= */

const DEFAULT_WEB_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const DEFAULT_WEB_FRAME: Rect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};


/* =========================================================
   Expo Router
========================================================= */

export const unstable_settings = {
  anchor: "(tabs)",
};


/* =========================================================
   Public Routes
========================================================= */

/*
 * هذه الصفحات يمكن فتحها بدون تسجيل دخول.
 *
 * جميع الصفحات الأخرى تحتاج إلى Session صحيحة.
 */
const PUBLIC_ROUTES = [
  "login",
  "register",
  "forgot-password",
  "oauth",
];


/* =========================================================
   Authentication Guard
========================================================= */

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSessionToken, setHasSessionToken] = useState(false);

  // The local token is the source of truth for the navigation guard.
  // Server validation remains enforced by protected tRPC procedures.
  useEffect(() => {
    let active = true;

    const refreshSessionState = async () => {
      const token = await Auth.getSessionToken();
      if (!active) return;
      setHasSessionToken(Boolean(token));
      setSessionReady(true);
    };

    void refreshSessionState();

    if (typeof window !== "undefined") {
      const handleAuthChanged = () => {
        void refreshSessionState();
      };
      window.addEventListener("cwaax-auth-changed", handleAuthChanged);
      return () => {
        active = false;
        window.removeEventListener("cwaax-auth-changed", handleAuthChanged);
      };
    }

    return () => {
      active = false;
    };
  }, []);

  const firstSegment = segments[0];
  const isPublicRoute =
    typeof firstSegment === "string" &&
    PUBLIC_ROUTES.includes(firstSegment);

  useEffect(() => {
    if (!sessionReady) return;

    if (!hasSessionToken && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (hasSessionToken && isPublicRoute) {
      router.replace("/(tabs)");
    }
  }, [sessionReady, hasSessionToken, isPublicRoute, router]);

  // Do not block the navigation tree with a second server-side auth check.
  // This avoids the Home -> Login race after a successful login.
  if (!sessionReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#078A5B" />
      </View>
    );
  }

  if ((!hasSessionToken && !isPublicRoute) || (hasSessionToken && isPublicRoute)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#078A5B" />
      </View>
    );
  }

  return null;
}

/* =========================================================
   Root Layout
========================================================= */

export default function RootLayout() {

  const initialInsets =
    initialWindowMetrics?.insets ??
    DEFAULT_WEB_INSETS;

  const initialFrame =
    initialWindowMetrics?.frame ??
    DEFAULT_WEB_FRAME;


  /* =======================================================
     Safe Area State
  ======================================================= */

  const [insets, setInsets] =
    useState<EdgeInsets>(
      initialInsets,
    );

  const [frame, setFrame] =
    useState<Rect>(
      initialFrame,
    );


  /* =======================================================
     Manus Runtime
  ======================================================= */

  useEffect(() => {
    initManusRuntime();
  }, []);


  /* =======================================================
     Safe Area Updates
  ======================================================= */

  const handleSafeAreaUpdate =
    useCallback(
      (metrics: Metrics) => {
        setInsets(metrics.insets);
        setFrame(metrics.frame);
      },
      [],
    );


  useEffect(() => {

    if (Platform.OS !== "web") {
      return;
    }

    const unsubscribe =
      subscribeSafeAreaInsets(
        handleSafeAreaUpdate,
      );

    return () => {
      unsubscribe();
    };

  }, [
    handleSafeAreaUpdate,
  ]);


  /* =======================================================
     React Query
  ======================================================= */

  const [queryClient] =
    useState(
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


  /* =======================================================
     tRPC
  ======================================================= */

  const [trpcClient] =
    useState(
      () =>
        createTRPCClient(),
    );


  /* =======================================================
     Safe Area Metrics
  ======================================================= */

  const providerInitialMetrics =
    useMemo(() => {

      const metrics =
        initialWindowMetrics ?? {
          insets: initialInsets,
          frame: initialFrame,
        };

      return {
        ...metrics,

        insets: {
          ...metrics.insets,

          top: Math.max(
            metrics.insets.top,
            16,
          ),

          bottom: Math.max(
            metrics.insets.bottom,
            12,
          ),
        },
      };

    }, [
      initialInsets,
      initialFrame,
    ]);


  /* =======================================================
     Navigation
  ======================================================= */

  const content = (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >

      <LocaleProvider>

      <trpc.Provider
        client={trpcClient}
        queryClient={queryClient}
      >

        <QueryClientProvider
          client={queryClient}
        >

          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >

            {/* Authentication */}

            <Stack.Screen
              name="login"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="register"
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="forgot-password"
              options={{
                headerShown: false,
              }}
            />


            {/* Main Application */}

            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />


            {/* OAuth */}

            <Stack.Screen
              name="oauth/callback"
              options={{
                headerShown: false,
              }}
            />

          </Stack>


          {/* Authentication Protection */}

          <AuthGate />


          <StatusBar
            style="auto"
          />

        </QueryClientProvider>

      </trpc.Provider>

      </LocaleProvider>

    </GestureHandlerRootView>
  );


  /* =======================================================
     Web Safe Area
  ======================================================= */

  const shouldOverrideSafeArea =
    Platform.OS === "web";


  if (shouldOverrideSafeArea) {

    return (
      <ThemeProvider>

        <SafeAreaProvider
          initialMetrics={
            providerInitialMetrics
          }
        >

          <SafeAreaFrameContext.Provider
            value={frame}
          >

            <SafeAreaInsetsContext.Provider
              value={insets}
            >

              {content}

            </SafeAreaInsetsContext.Provider>

          </SafeAreaFrameContext.Provider>

        </SafeAreaProvider>

      </ThemeProvider>
    );
  }


  /* =======================================================
     Native
  ======================================================= */

  return (
    <ThemeProvider>

      <SafeAreaProvider
        initialMetrics={
          providerInitialMetrics
        }
      >

        {content}

      </SafeAreaProvider>

    </ThemeProvider>
  );
}
