import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CURRENCIES } from "@/constants/currencies";
import { notify } from "@/lib/_core/native-alert";
import { useTranslation } from "@/lib/_core/i18n";
import * as Preferences from "@/lib/_core/preferences";
import type { CurrencyCode } from "@/lib/_core/preferences";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A",
};

function Row({ label, value, onPress, accent }: { label: string; value?: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.end}>
        {value ? <Text style={[styles.value, accent && { color: P.accent }]} numberOfLines={1}>{value}</Text> : null}
        <MaterialIcons name="chevron-left" size={22} color={P.text} />
      </View>
    </Pressable>
  );
}

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

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <MaterialIcons name="arrow-forward" size={22} color={P.text} />
          </Pressable>
          <Text style={styles.title}>{t("settingsTitle")}</Text>
          <View style={styles.back} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.section}>{t("settingsSecuritySection")}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{t("twoFactor")}</Text>
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: "#3A3A3D", true: "rgba(255,230,0,0.45)" }}
              thumbColor={twoFactor ? P.accent : "#FFFFFF"}
            />
          </View>
          <Row label={t("notifications")} value={t("notificationsSub")} onPress={() => router.push("/notifications")} />
          <Row label={t("currency")} value={`${currencyInfo.code} · ${currencyInfo.name}`} onPress={() => router.push("/currency")} />
          <Row label={t("language")} value={locale === "ar" ? t("arabic") : t("english")} onPress={() => router.push("/language")} accent />

          <Text style={[styles.section, { marginTop: 22 }]}>{t("settingsSupportSection")}</Text>
          <Row label={t("supportCenter")} value={t("supportCenterSub")} onPress={() => router.push("/support")} />
          <Row
            label={t("terms")}
            value={t("termsSub")}
            onPress={() =>
              notify(
                t("terms"),
                locale === "ar"
                  ? "سيتم عرض شروط الاستخدام وسياسة الخصوصية هنا."
                  : "Terms of service and privacy policy will be shown here.",
              )
            }
          />

          <Text style={styles.version}>{t("version")}</Text>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { color: P.text, fontSize: 20, fontWeight: "900" },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  section: { color: P.muted, fontSize: 13, fontWeight: "700", textAlign: "right", marginBottom: 6 },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { color: P.text, fontSize: 16, fontWeight: "600", textAlign: "right" },
  end: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  value: { color: P.muted, fontSize: 13, flexShrink: 1 },
  version: { color: P.muted, fontSize: 12, textAlign: "center", marginTop: 36 },
});
