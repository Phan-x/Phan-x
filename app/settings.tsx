import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { CURRENCIES } from "@/constants/currencies";
import { notify } from "@/lib/_core/native-alert";
import { useTranslation } from "@/lib/_core/i18n";
import * as Preferences from "@/lib/_core/preferences";
import type { CurrencyCode } from "@/lib/_core/preferences";

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [twoFactor, setTwoFactor] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  useFocusEffect(
    useCallback(() => {
      Preferences.getCurrency().then(setCurrency);
    }, []),
  );

  const currencyInfo = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const items = [
    { key: "twoFactor", label: t("twoFactor"), icon: "verified-user" as const, sub: t("twoFactorSub") },
    { key: "notifications", label: t("notifications"), icon: "notifications-none" as const, sub: t("notificationsSub") },
    { key: "currency", label: t("currency"), icon: "paid" as const, sub: `${currencyInfo.code} · ${currencyInfo.name}` },
    { key: "language", label: t("language"), icon: "language" as const, sub: locale === "ar" ? t("arabic") : t("english") },
  ];

  const onRowPress = (key: string) => {
    if (key === "notifications") { router.push("/notifications"); return; }
    if (key === "currency") { router.push("/currency"); return; }
    if (key === "language") { router.push("/language"); return; }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label={t("back")} onPress={() => router.back()} />
          <Text style={styles.title}>{t("settingsTitle")}</Text>
          <View style={{ width: 42 }} />
        </View>

        <Card style={styles.banner}>
          <MaterialIcons name="security" size={23} color={CWAAX.green} />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>{t("settingsBannerTitle")}</Text>
            <Text style={styles.bannerSub}>{t("settingsBannerSub")}</Text>
          </View>
          <Pressable onPress={() => setTwoFactor(!twoFactor)} style={({ pressed }) => [styles.enable, pressed && styles.pressed]}>
            <Text style={styles.enableText}>{twoFactor ? t("settingsEnabled") : t("settingsEnable")}</Text>
          </Pressable>
        </Card>

        <Text style={styles.section}>{t("settingsSecuritySection")}</Text>
        <Card>
          {items.map((item, i) => (
            <Pressable
              key={item.key}
              disabled={item.key === "twoFactor"}
              onPress={() => onRowPress(item.key)}
              style={({ pressed }) => [
                styles.row,
                i === items.length - 1 && { borderBottomWidth: 0 },
                pressed && item.key !== "twoFactor" && styles.pressed,
              ]}
            >
              <View style={styles.icon}>
                <MaterialIcons name={item.icon} size={18} color={CWAAX.green} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.sub}>{item.sub}</Text>
              </View>
              {item.key === "twoFactor" ? (
                <Switch
                  value={twoFactor}
                  onValueChange={setTwoFactor}
                  trackColor={{ false: "#DDE4E0", true: "#9BD5B4" }}
                  thumbColor={twoFactor ? CWAAX.green : "#fff"}
                />
              ) : (
                <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
              )}
            </Pressable>
          ))}
        </Card>

        <Text style={styles.section}>{t("settingsSupportSection")}</Text>
        <Card>
          <Pressable onPress={() => router.push("/support")} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={[styles.icon, { backgroundColor: "#FFF5DE" }]}>
              <MaterialIcons name="support-agent" size={18} color={CWAAX.gold} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.label}>{t("supportCenter")}</Text>
              <Text style={styles.sub}>{t("supportCenterSub")}</Text>
            </View>
            <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
          </Pressable>
          <Pressable
            onPress={() => notify(t("terms"), locale === "ar" ? "سيتم عرض شروط الاستخدام وسياسة الخصوصية هنا." : "Terms of service and privacy policy will be shown here.")}
            style={({ pressed }) => [styles.row, { borderBottomWidth: 0 }, pressed && styles.pressed]}
          >
            <View style={[styles.icon, { backgroundColor: "#F2F3F2" }]}>
              <MaterialIcons name="description" size={18} color={CWAAX.ink} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.label}>{t("terms")}</Text>
              <Text style={styles.sub}>{t("termsSub")}</Text>
            </View>
            <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
          </Pressable>
        </Card>

        <Text style={styles.version}>{t("version")}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 23 },
  title: { color: CWAAX.ink, fontSize: 20, fontWeight: "900" },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F0F9F4", borderColor: "#D8F0E1", marginBottom: 22 },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: CWAAX.ink, fontSize: 12, fontWeight: "900", textAlign: "right" },
  bannerSub: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  enable: { backgroundColor: CWAAX.green, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  enableText: { color: CWAAX.white, fontSize: 10, fontWeight: "800" },
  section: { color: CWAAX.muted, fontWeight: "800", fontSize: 12, textAlign: "right", marginBottom: 9, marginTop: 5 },
  row: { minHeight: 65, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: CWAAX.line },
  icon: { width: 35, height: 35, borderRadius: 12, backgroundColor: CWAAX.greenSoft, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  label: { color: CWAAX.ink, fontSize: 12, fontWeight: "800", textAlign: "right" },
  sub: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  version: { color: "#A3AEA7", textAlign: "center", fontSize: 10, marginTop: 23 },
  pressed: { opacity: 0.62 },
});
