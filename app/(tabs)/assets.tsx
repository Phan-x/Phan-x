import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { Card, CoinMark, IconButton, SectionTitle } from "@/components/cwaax-ui";
import { COINS, CWAAX } from "@/constants/cwaax";
import { notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";
import { formatAmount } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const tabs = ["نظرة عامة", "محفظة", "بطاقات", "قروض", "مدخرات"];
export default function AssetsScreen() {
  const [activeTab, setActiveTab] = useState("نظرة عامة");
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user });
  const balanceMap = useMemo(() => new Map((balances.data || []).map((b:any) => [b.currency, Number(b.amount)])), [balances.data]);
  const totalUsdt = balanceMap.get("USDT") || 0;
  const filtered = useMemo(() => COINS.filter((coin) => `${coin.symbol} ${coin.name}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
    <View style={styles.header}><View><Text style={styles.kicker}>محفظتي</Text><Text style={styles.title}>الأصول</Text></View><View style={styles.actions}><IconButton icon="search" label="بحث" onPress={() => setQuery(query ? "" : "xrp")} /><IconButton icon="more-horiz" label="المزيد" onPress={() => notify("خيارات الأصول", "استخدم البحث أو اختر إحدى العملات لعرض رصيدها.")} /></View></View>
    <View style={styles.tabs}>{tabs.map((tab) => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={({ pressed }) => [styles.tab, activeTab === tab && styles.activeTab, pressed && styles.pressed]}><Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text></Pressable>)}</View>
    <Card style={styles.totalCard}><Text style={styles.label}>إجمالي قيمة الأصول</Text><Text style={styles.total}>${totalUsdt.toFixed(2)}</Text><View style={styles.totalFoot}><Text style={styles.subtle}>USDT</Text><View style={styles.positivePill}><Text style={styles.positive}>+4.68%</Text></View></View></Card>
    <SectionTitle title="الأصول" action={`${filtered.length} عملات`} />
    <View style={styles.searchBox}><MaterialIcons name="search" size={20} color={CWAAX.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="ابحث عن عملة" placeholderTextColor="#9CA8A1" style={styles.searchInput} textAlign="right"/><Pressable onPress={() => setQuery("")}><MaterialIcons name="tune" size={19} color={CWAAX.green}/></Pressable></View>
    <FlatList data={filtered} keyExtractor={(item) => item.symbol} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable onPress={() => setQuery(item.symbol)} style={({ pressed }) => [styles.coinRow, pressed && styles.pressed]}><CoinMark mark={item.mark} color={item.color} size={43}/><View style={styles.coinName}><Text style={styles.symbol}>{item.symbol}</Text><Text style={styles.name}>{item.name}</Text></View><View style={styles.coinValue}><Text style={styles.amount}>{formatAmount(balanceMap.get(item.symbol) || 0)}</Text><Text style={styles.value}>{item.symbol === "USDT" ? `$${(balanceMap.get(item.symbol) || 0).toFixed(2)}` : "$0.00"}</Text></View><View style={styles.change}><Text style={[styles.changeText, item.change.startsWith("-") && styles.loss]}>{item.change}</Text></View></Pressable>} ListEmptyComponent={<Text style={styles.empty}>لا توجد عملات مطابقة</Text>} />
  </ScreenContainer>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 18 }, kicker: { fontSize: 12, color: CWAAX.muted, textAlign: "right", marginBottom: 3 }, title: { fontSize: 26, fontWeight: "900", color: CWAAX.ink, textAlign: "right" }, actions: { flexDirection: "row", gap: 8 }, tabs: { flexDirection: "row-reverse", gap: 7, marginBottom: 16 }, tab: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: CWAAX.surface }, activeTab: { backgroundColor: CWAAX.green }, tabText: { color: CWAAX.muted, fontSize: 10, fontWeight: "700" }, activeTabText: { color: CWAAX.white }, totalCard: { backgroundColor: "#F0F9F4", borderColor: "#D9F0E1", marginBottom: 21 }, label: { color: CWAAX.muted, fontSize: 12, textAlign: "right" }, total: { color: CWAAX.ink, fontSize: 30, fontWeight: "900", textAlign: "right", marginTop: 11 }, totalFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }, subtle: { color: CWAAX.muted, fontSize: 11 }, positivePill: { backgroundColor: CWAAX.green, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }, positive: { color: CWAAX.white, fontSize: 11, fontWeight: "800" }, searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderWidth: 1, borderColor: CWAAX.line, borderRadius: 14, paddingHorizontal: 12, marginBottom: 10 }, searchInput: { flex: 1, color: CWAAX.ink, fontSize: 13 }, list: { paddingBottom: 25 }, coinRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: CWAAX.line, gap: 11 }, coinName: { flex: 1 }, symbol: { color: CWAAX.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, name: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" }, coinValue: { alignItems: "flex-end" }, amount: { color: CWAAX.ink, fontSize: 12, fontWeight: "700" }, value: { color: CWAAX.muted, fontSize: 10, marginTop: 4 }, change: { width: 54, alignItems: "flex-end" }, changeText: { color: CWAAX.green, fontSize: 11, fontWeight: "800" }, loss: { color: CWAAX.red }, empty: { color: CWAAX.muted, textAlign: "center", padding: 30 }, pressed: { opacity: 0.6 } });
