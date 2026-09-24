import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import * as Preferences from "@/lib/_core/preferences";
import type { LocaleCode } from "@/lib/_core/preferences";

/*
 * A real, working translation system. It currently only covers the
 * Settings screen's strings as a proof that switching locale actually
 * works end-to-end (persisted + re-rendered). The rest of the app's
 * ~25 screens still use hardcoded Arabic text and need to be migrated
 * to `t("key")` one screen at a time to be fully bilingual.
 */
const dictionaries = {
  ar: {
    settingsTitle: "الإعدادات",
    settingsBannerTitle: "اجعل حسابك أكثر أماناً",
    settingsBannerSub: "فعّل المصادقة الثنائية الآن",
    settingsEnable: "تفعيل",
    settingsEnabled: "مفعّلة",
    settingsSecuritySection: "الأمان والخصوصية",
    settingsSupportSection: "الدعم",
    twoFactor: "المصادقة الثنائية",
    twoFactorSub: "حماية إضافية لحسابك",
    notifications: "الإشعارات",
    notificationsSub: "تنبيهات الأسعار والعمليات",
    currency: "العملة الأصلية",
    language: "اللغة",
    supportCenter: "مركز الدعم",
    supportCenterSub: "نحن هنا لمساعدتك",
    terms: "الشروط والسياسات",
    termsSub: "آخر تحديث: سبتمبر 2026",
    back: "رجوع",
    version: "CwaAX Wallet · الإصدار 1.0.0",
    chooseCurrency: "اختر العملة",
    chooseLanguage: "اختر اللغة",
    arabic: "العربية",
    english: "English",
  },
  en: {
    settingsTitle: "Settings",
    settingsBannerTitle: "Make your account safer",
    settingsBannerSub: "Enable two-factor authentication now",
    settingsEnable: "Enable",
    settingsEnabled: "Enabled",
    settingsSecuritySection: "Security & Privacy",
    settingsSupportSection: "Support",
    twoFactor: "Two-Factor Authentication",
    twoFactorSub: "Extra protection for your account",
    notifications: "Notifications",
    notificationsSub: "Price and activity alerts",
    currency: "Base Currency",
    language: "Language",
    supportCenter: "Support Center",
    supportCenterSub: "We're here to help",
    terms: "Terms & Policies",
    termsSub: "Last updated: September 2026",
    back: "Back",
    version: "CwaAX Wallet · v1.0.0",
    chooseCurrency: "Choose currency",
    chooseLanguage: "Choose language",
    arabic: "العربية",
    english: "English",
  },
} as const;

export type TranslationKey = keyof typeof dictionaries.ar;

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ar",
  setLocale: () => {},
  t: (key) => dictionaries.ar[key],
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("ar");

  useEffect(() => {
    Preferences.getLocale().then(setLocaleState);

    if (Platform.OS === "web") {
      const onChange = () => Preferences.getLocale().then(setLocaleState);
      window.addEventListener("cwaax-prefs-changed", onChange);
      return () => window.removeEventListener("cwaax-prefs-changed", onChange);
    }
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    Preferences.setLocale(next);
  }, []);

  const t = useCallback((key: TranslationKey) => dictionaries[locale][key], [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  return useContext(LocaleContext);
}
