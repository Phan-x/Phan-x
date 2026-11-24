import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const CURRENCY_KEY = "cwaax_currency";
const LOCALE_KEY = "cwaax_locale";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "SAR" | "AED" | "EGP";
export type LocaleCode = "ar" | "en";

async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function writeKey(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event("cwaax-prefs-changed"));
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function getCurrency(): Promise<CurrencyCode> {
  const value = await readKey(CURRENCY_KEY);
  return (value as CurrencyCode) || "USD";
}

export async function setCurrency(code: CurrencyCode): Promise<void> {
  await writeKey(CURRENCY_KEY, code);
}

export async function getLocale(): Promise<LocaleCode> {
  const value = await readKey(LOCALE_KEY);
  return (value as LocaleCode) || "ar";
}

export async function setLocale(code: LocaleCode): Promise<void> {
  await writeKey(LOCALE_KEY, code);
}
