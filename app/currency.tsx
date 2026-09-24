import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { CURRENCIES } from "@/constants/currencies";
import * as Preferences from "@/lib/_core/preferences";
import type { CurrencyCode } from "@/lib/_core/preferences";
import { useTranslation } from "@/lib/_core/i18n";

export default function CurrencyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<CurrencyCode>("USD");

  useEffect(() => {
    Preferences.getCurrency().then(setSelected);
  }, []);

  const handleSelect = async (code: CurrencyCode) => {
    setSelected(code);
    await Preferences.setCurrency(code);
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label={t("back")} onPress={() => router.back()} />
          <Text style={styles.title}>{t("chooseCurrency")}</Text>
          <View style={{ width: 42 }} />
        </View>

        <Card>
          {CURRENCIES.map((c, i) => (
            <Pressable
              key={c.code}
              onPress={() => handleSelect(c.code)}
              style={({ pressed }) => [
                styles.row,
                i === CURRENCIES.length - 1 && { borderBottomWidth: 0 },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.copy}>
                <Text style={styles.label}>{c.name}</Text>
                <Text style={styles.sub}>{c.code} · {c.symbol}</Text>
              </View>
              {selected === c.code && <MaterialIcons name="check-circle" size={20} color={CWAAX.green} />}
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 23 },
  title: { color: CWAAX.ink, fontSize: 20, fontWeight: "900" },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: CWAAX.line },
  copy: { flex: 1 },
  label: { color: CWAAX.ink, fontSize: 13, fontWeight: "800", textAlign: "right" },
  sub: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  pressed: { opacity: 0.62 },
});
