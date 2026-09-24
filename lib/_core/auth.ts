import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  username?: string | null;
  email: string | null;
  role?: "user" | "admin";
  loginMethod: string | null;
  lastSignedIn: Date;
};

// =====================================================
// In-memory cache — يحل مشكلة قراءة SecureStore البطيئة
// والمتكررة في كل طلب tRPC (سبب خطأ 10002 المتقطع).
// =====================================================
let _cachedToken: string | null = null;
let _cacheLoaded = false;
let _tokenLoadPromise: Promise<string | null> | null = null;

// fallback عام للطوارئ — يُقرأ منه trpc.ts لو فشلت getSessionToken
if (typeof globalThis !== "undefined") {
  (globalThis as any).__CWAXX_TOKEN__ = null;
}

export async function getSessionToken(options?: { forceReload?: boolean }): Promise<string | null> {
  if (options?.forceReload) _cacheLoaded = false;

  if (_cacheLoaded) {
    return _cachedToken;
  }

  if (_tokenLoadPromise) return _tokenLoadPromise;

  _tokenLoadPromise = (async () => {
    try {
    let token: string | null = null;

    if (Platform.OS === "web") {
      token = window.localStorage.getItem(SESSION_TOKEN_KEY);
    } else {
      token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    }

    _cachedToken = token;
    _cacheLoaded = true;

    // حدّث الـ fallback العام
    if (typeof globalThis !== "undefined") {
      (globalThis as any).__CWAXX_TOKEN__ = token;
    }

      return token;
    } catch (error) {
      console.error("[Auth] Failed to get session token:", error);
      // لا نضع _cacheLoaded = true هنا، حتى نعيد المحاولة لاحقاً
      return null;
    } finally {
      _tokenLoadPromise = null;
    }
  })();

  return _tokenLoadPromise;
}

export function reloadSessionToken(): Promise<string | null> {
  return getSessionToken({ forceReload: true });
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    // 1) حدّث الـ cache أولاً — هذا يحل مشكلة التوكن غير المرئي لـ trpc
    _cachedToken = token;
    _cacheLoaded = true;
    _tokenLoadPromise = null;

    if (typeof globalThis !== "undefined") {
      (globalThis as any).__CWAXX_TOKEN__ = token;
    }

    // 2) ثم احفظ في التخزين الدائم
    if (Platform.OS === "web") {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
      window.dispatchEvent(new Event("cwaax-auth-changed"));
    } else {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("[Auth] Failed to set session token:", error);
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    // 1) امسح الـ cache أولاً
    _cachedToken = null;
    _cacheLoaded = true; // نعتبر الحالة "معروفة ومفرغة"
    _tokenLoadPromise = null;

    if (typeof globalThis !== "undefined") {
      (globalThis as any).__CWAXX_TOKEN__ = null;
    }

    // 2) ثم امسح من التخزين الدائم
    if (Platform.OS === "web") {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
      window.localStorage.removeItem("app_session_token");
      window.localStorage.removeItem("manus-runtime-user-info");
      window.localStorage.removeItem(USER_INFO_KEY);
      window.dispatchEvent(new Event("cwaax-auth-changed"));
    } else {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[Auth] Failed to remove session token:", error);
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    let info: string | null = null;
    if (Platform.OS === "web") {
      info = window.localStorage.getItem(USER_INFO_KEY);
    } else {
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
    }

    if (!info) return null;
    return JSON.parse(info);
  } catch (error) {
    console.error("[Auth] Failed to get user info:", error);
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("[Auth] Failed to set user info:", error);
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    console.error("[Auth] Failed to clear user info:", error);
  }
}
