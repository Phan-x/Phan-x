import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { formatAmount } from "@/lib/utils";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", danger: "#FF5C5C",
  soft: "rgba(255,230,0,0.12)", dangerSoft: "rgba(255,92,92,0.14)", grey: "rgba(255,255,255,0.08)",
};

type Kind = "deposit" | "withdrawal" | "trade";
const FILTERS: { key: "all" | Kind; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "deposit", label: "إيداع" },
  { key: "withdrawal", label: "سحب" },
  { key: "trade", label: "تجارة" },
];
const STATUS_LABEL: Record<string, string> = { pending: "قيد المراجعة", completed: "مكتمل", failed: "مرفوض/مرتجع" };

// تصنيف العملية: العنوان، الأيقونة، والاتجاه (+ وارد، - صادر، 0 محجوز)
function describe(tx: any): { title: string; icon: any; sign: "+" | "-" | ""; kind: Kind | "other" } {
  const id = String(tx.transactionId || "");
  if (tx.type === "deposit") return { title: "إيداع", icon: "south-west", sign: "+", kind: "deposit" };
  if (tx.type === "withdrawal") return { title: "سحب", icon: "north-east", sign: "-", kind: "withdrawal" };
  if (tx.type === "trade") {
    if (id.startsWith("TRADE-PAYOUT")) return { title: "ربح تجارة", icon: "trending-up", sign: "+", kind: "trade" };
    if (id.startsWith("TRADE-PRINCIPAL")) return { title: "إرجاع رأس المال", icon: "replay", sign: "+", kind: "trade" };
    if (id.startsWith("TRADE-START")) return { title: "بدء تجارة", icon: "lock-outline", sign: "", kind: "trade" };
    return { title: "تجارة", icon: "show-chart", sign: "", kind: "trade" };
  }
  return { title: String(tx.type || "عملية"), icon: "swap-horiz", sign: "", kind: "other" };
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
function dayLabel(d: Date) {
  const now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (same(d, now)) return "اليوم";
  if (same(d, y)) return "أمس";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function timeLabel(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const txs = trpc.wallet.transactions.useQuery();
  const [filter, setFilter] = useState<"all" | Kind>("all");

  const all: any[] = txs.data || [];

  const stats = useMemo(() => {
    let dep = 0, wd = 0, profit = 0;
    for (const t of all) {
      if (t.status !== "completed" || t.currency !== "USDT") continue;
      const d = describe(t);
      const a = Number(t.amount) || 0;
      if (d.kind === "deposit") dep += a;
      else if (d.kind === "withdrawal") wd += a;
      else if (d.kind === "trade" && String(t.transactionId).startsWith("TRADE-PAYOUT")) profit += a;
    }
    return { dep, wd, profit };
  }, [all]);

  const rows = useMemo(() => {
    const list = all.filter((t) => filter === "all" || describe(t).kind === filter);
    const out: any[] = [];
    let last = "";
    for (const t of list) {
      const d = new Date(t.createdAt);
      const label = dayLabel(d);
      if (label !== last) { out.push({ header: label, id: `h-${label}-${out.length}` }); last = label; }
      out.push({ tx: t, date: d, id: String(t.transactionId) });
    }
    return out;
  }, [all, filter]);

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

  const header = (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>إجمالي العمليات</Text>
        <Text style={styles.summaryValue}>
          {all.length} <Text style={styles.summaryUnit}>عملية</Text>
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>إيداعات</Text>
            <Text style={styles.statValue}>{fmt(stats.dep)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>سحوبات</Text>
            <Text style={styles.statValue}>{fmt(stats.wd)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>أرباح التجارة</Text>
            <Text style={[styles.statValue, { color: P.accent }]}>{fmt(stats.profit)}</Text>
          </View>
        </View>
        <Text style={styles.summaryNote}>القيم بعملة USDT للعمليات المكتملة</Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.circleBtn} hitSlop={8}>
            <MaterialIcons name="arrow-forward" size={22} color={P.text} />
          </Pressable>
          <Text style={styles.title}>سجل العمليات</Text>
          <View style={styles.circleBtn} />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          refreshing={txs.isRefetching}
          onRefresh={() => txs.refetch()}
          ListEmptyComponent={
            <Text style={styles.empty}>{txs.isLoading ? "جاري التحميل..." : "لا توجد عمليات"}</Text>
          }
          renderItem={({ item }) => {
            if (item.header) return <Text style={styles.dayHeader}>{item.header}</Text>;
            const t = item.tx;
            const d = describe(t);
            const failed = t.status === "failed";
            const pending = t.status === "pending";
            const income = d.sign === "+";
            return (
              <View style={styles.row}>
                <View style={[styles.icon, income && !failed && { backgroundColor: P.soft }]}>
                  <MaterialIcons name={d.icon} size={22} color={income && !failed ? P.accent : P.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{d.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {timeLabel(item.date)} · {t.transactionId}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-start", gap: 6 }}>
                  <Text
                    style={[
                      styles.amount,
                      income && !failed && { color: P.accent },
                      failed && { color: P.muted, textDecorationLine: "line-through" },
                    ]}
                  >
                    {d.sign}{d.sign ? " " : ""}{formatAmount(t.amount)} {t.currency}
                  </Text>
                  <View style={[styles.tag, failed && { backgroundColor: P.dangerSoft }, pending && { backgroundColor: P.grey }]}>
                    <Text style={[styles.tagText, failed && { color: P.danger }, pending && { color: P.text }]}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: P.card, borderWidth: 1, borderColor: P.border },
  title: { color: P.text, fontSize: 20, fontWeight: "900" },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  summary: { marginTop: 10, backgroundColor: P.card, borderWidth: 1, borderColor: "rgba(255,230,0,0.35)", borderRadius: 24, padding: 18 },
  summaryLabel: { color: P.muted, fontSize: 13, textAlign: "right" },
  summaryValue: { color: P.text, fontSize: 34, fontWeight: "900", textAlign: "right", marginTop: 6 },
  summaryUnit: { color: P.muted, fontSize: 15, fontWeight: "700" },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F0F10", borderRadius: 16, paddingVertical: 12, marginTop: 16 },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { color: P.muted, fontSize: 11 },
  statValue: { color: P.text, fontSize: 15, fontWeight: "900", marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: P.border },
  summaryNote: { color: P.muted, fontSize: 11, textAlign: "right", marginTop: 10 },
  filters: { flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 4 },
  chip: { paddingHorizontal: 18, height: 38, borderRadius: 19, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: P.accent, borderColor: P.accent },
  chipText: { color: P.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: P.onAccent },
  dayHeader: { color: P.muted, fontSize: 13, fontWeight: "700", textAlign: "right", marginTop: 18, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 18, padding: 12, marginTop: 8 },
  icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: P.grey, alignItems: "center", justifyContent: "center" },
  txTitle: { color: P.text, fontSize: 15, fontWeight: "800", textAlign: "right" },
  meta: { color: P.muted, fontSize: 11, marginTop: 4, textAlign: "right" },
  amount: { color: P.text, fontSize: 14, fontWeight: "900" },
  tag: { backgroundColor: P.soft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tagText: { color: P.accent, fontSize: 11, fontWeight: "800" },
  empty: { color: P.muted, textAlign: "center", marginTop: 40 },
});
