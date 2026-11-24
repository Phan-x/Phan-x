import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { useTranslation } from "@/lib/_core/i18n";
import type { LocaleCode } from "@/lib/_core/preferences";

const options: { code: LocaleCode; labelKey: "arabic" | "english" }[] = [
  { code: "ar", labelKey: "arabic" },
  { code: "en", labelKey: "english" },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label={t("back")} onPress={() => router.back()} />
          <Text style={styles.title}>{t("chooseLanguage")}</Text>
          <View style={{ width: 42 }} />
        </View>

        <Card>
          {options.map((opt, i) => (
            <Pressable
              key={opt.code}
              onPress={() => setLocale(opt.code)}
              style={({ pressed }) => [
                styles.row,
                i === options.length - 1 && { borderBottomWidth: 0 },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.label}>{t(opt.labelKey)}</Text>
              {locale === opt.code && <MaterialIcons name="check-circle" size={20} color={CWAAX.green} />}
            </Pressable>
          ))}
        </Card>

        <Text style={styles.note}>
          {locale === "ar"
            ? "ملاحظة: التبديل حالياً يشمل صفحة الإعدادات فقط، وبقية التطبيق ستُترجم تباعاً."
            : "Note: switching currently applies to the Settings screen only — the rest of the app will be translated over time."}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 23 },
  title: { color: CWAAX.ink, fontSize: 20, fontWeight: "900" },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: CWAAX.line },
  label: { color: CWAAX.ink, fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.62 },
  note: { color: CWAAX.muted, fontSize: 10, textAlign: "center", marginTop: 18, lineHeight: 16 },
});
