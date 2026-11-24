import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Identity verification is intentionally stored locally on this device.
 * The key is scoped to the logged-in account, so every account has its own
 * verification state even when multiple accounts are used on the same device.
 */
const KEY_PREFIX = "cwaax_identity_verified_v2_";

function getKey(userId: number | string): string {
  return `${KEY_PREFIX}${String(userId)}`;
}

export async function isIdentityVerified(userId: number | string): Promise<boolean> {
  try {
    const key = getKey(userId);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.localStorage.getItem(key) === "1";
    }
    return (await AsyncStorage.getItem(key)) === "1";
  } catch {
    return false;
  }
}

export async function markIdentityVerified(userId: number | string): Promise<void> {
  const key = getKey(userId);
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(key, "1");
    return;
  }
  await AsyncStorage.setItem(key, "1");
}

/** Removes only this account's local verification state. */
export async function clearIdentityVerification(userId: number | string): Promise<void> {
  const key = getKey(userId);
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}
