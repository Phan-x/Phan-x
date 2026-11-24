import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { CoinMark } from "@/components/cwaax-ui";
import { COINS } from "@/constants/cwaax";
import { notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";
import { formatAmount } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", danger: "#FF5C5C",
  soft: "rgba(255,230,0,0.12)",
};
const noOutline: any = { outlineStyle: "none", outlineWidth: 0 };
const TABS = ["نظرة عامة", "محفظة", "بطاقات", "قروض", "مدخرات"];

export default function AssetsScreen() {
  const [activeTab, setActiveTab] = useState("نظرة عامة");
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user });
  const balanceMap = useMemo(
    () => new Map((balances.data || []).map((b: any) => [b.currency, Number(b.amount)])),
    [balances.data],
  );
  const contracts = trpc.trade.contracts.useQuery(undefined, { enabled: !!user });
  const lockedAmt: number = (contracts.data || [])
    .filter((c: any) => c.status === "active")
    .reduce((sum: number, c: any) => sum + Number(c.principal || 0), 0);
  const availableUsdt = balanceMap.get("USDT") || 0;
  const totalUsdt = availableUsdt + lockedAmt; // المتاح + المحجوز في العقود
  const filtered = useMemo(
    () => COINS.filter((c) => `${c.symbol} ${c.name}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const header = (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>محفظتي</Text>
          <Text style={styles.title}>الأصول</Text>
        </View>
        <Pressable
          onPress={() => notify("خيارات الأصول", "استخدم البحث أو اختر إحدى العملات لعرض رصيدها.")}
          style={styles.circleBtn}
        >
          <MaterialIcons name="more-horiz" size={22} color={P.text} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.chip, activeTab === tab && styles.chipActive]}>
            <Text style={[styles.chipText, activeTab === tab && styles.chipTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.total}>
        <Text style={styles.totalLabel}>إجمالي قيمة الأصول</Text>
        <Text style={styles.totalValue}>${totalUsdt.toFixed(2)}</Text>
        <Text style={styles.lockedLine}>
          المتاح ${availableUsdt.toFixed(2)} · محجوز في العقود ${lockedAmt.toFixed(2)}
        </Text>
        <View style={styles.totalFoot}>
          <Text style={styles.totalUnit}>USDT</Text>
          <View style={styles.pill}><Text style={styles.pillText}>+4.68%</Text></View>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>الأصول</Text>
        <Text style={styles.count}>{filtered.length} عملات</Text>
      </View>

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color={P.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن عملة"
          placeholderTextColor={P.muted}
          style={[styles.searchInput, noOutline]}
          underlineColorAndroid="transparent"
          textAlign="right"
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}>
            <MaterialIcons name="close" size={18} color={P.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.symbol}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد عملات مطابقة</Text>}
          renderItem={({ item }) => {
            const amount = balanceMap.get(item.symbol) || 0;
            const hasChange = item.change !== "—";
            return (
              <Pressable onPress={() => setQuery(item.symbol)} style={({ pressed }) => [styles.coinRow, pressed && { opacity: 0.7 }]}>
                <CoinMark mark={item.mark} color={item.color} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                <View style={{ alignItems: "flex-start" }}>
                  <Text style={styles.amount}>{formatAmount(item.symbol === "USDT" ? amount + lockedAmt : amount)}</Text>
                  <Text style={styles.value}>{item.symbol === "USDT" ? `$${(amount + lockedAmt).toFixed(2)}` : "$0.00"}</Text>
                </View>
                <Text style={[styles.change, hasChange && item.change.startsWith("-") && { color: P.danger }]}>{item.change}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { color: P.muted, fontSize: 13, textAlign: "right" },
  title: { color: P.text, fontSize: 30, fontWeight: "900", textAlign: "right", marginTop: 2 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 8, marginTop: 18, flexWrap: "wrap" },
  chip: { paddingHorizontal: 16, height: 38, borderRadius: 19, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: P.accent, borderColor: P.accent },
  chipText: { color: P.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: P.onAccent },
  total: { marginTop: 18, backgroundColor: P.card, borderWidth: 1, borderColor: "rgba(255,230,0,0.35)", borderRadius: 24, padding: 20 },
  totalLabel: { color: P.muted, fontSize: 13, textAlign: "right" },
  totalValue: { color: P.text, fontSize: 38, fontWeight: "900", textAlign: "right", marginTop: 8 },
  lockedLine: { color: P.muted, fontSize: 12, textAlign: "right", marginTop: 8 },
  totalFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  totalUnit: { color: P.muted, fontSize: 13, fontWeight: "700" },
  pill: { backgroundColor: P.accent, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  pillText: { color: P.onAccent, fontSize: 12, fontWeight: "900" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
  section: { color: P.text, fontSize: 19, fontWeight: "800" },
  count: { color: P.accent, fontSize: 13, fontWeight: "700" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, borderRadius: 16, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, paddingHorizontal: 14, marginTop: 14, marginBottom: 6 },
  searchInput: { flex: 1, minWidth: 0, color: P.text, fontSize: 14 },
  coinRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: P.border },
  symbol: { color: P.text, fontSize: 16, fontWeight: "900", textAlign: "right" },
  name: { color: P.muted, fontSize: 12, marginTop: 3, textAlign: "right" },
  amount: { color: P.text, fontSize: 15, fontWeight: "800" },
  value: { color: P.muted, fontSize: 12, marginTop: 3 },
  change: { color: P.accent, fontSize: 13, fontWeight: "800", minWidth: 20, textAlign: "center" },
  empty: { color: P.muted, textAlign: "center", marginTop: 40 },
});
