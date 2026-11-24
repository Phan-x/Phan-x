import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { CoinMark } from "@/components/cwaax-ui";
import { TRADE_DAILY_RATE, TRADE_PLANS } from "@/constants/cwaax";
import { confirmAsync, notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", danger: "#FF5C5C",
  soft: "rgba(255,230,0,0.12)",
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default function TradeScreen() {
  const { user } = useAuth();
  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user, staleTime: 15_000 });
  const contracts = trpc.trade.contracts.useQuery(undefined, { enabled: !!user, staleTime: 10_000 });
  const startContract = trpc.trade.startContract.useMutation({
    onSuccess: async () => {
      await Promise.all([balances.refetch(), contracts.refetch()]);
    },
  });
  const claimDue = trpc.trade.claimDuePayouts.useMutation({
    onSuccess: async (result) => {
      if (result?.paid && result.paid > 0) {
        await Promise.all([balances.refetch(), contracts.refetch()]);
      } else {
        await contracts.refetch();
      }
    },
  });
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeAmounts = useMemo(() => new Set(
    (contracts.data || [])
      .filter((contract: any) => contract.status === "active")
      .map((contract: any) => Number(contract.principal))
  ), [contracts.data]);
  const lockedAmt: number = (contracts.data || [])
    .filter((c: any) => c.status === "active")
    .reduce((sum: number, c: any) => sum + Number(c.principal || 0), 0);
  const usdtBalance = useMemo(() => Number((balances.data || []).find((b: any) => b.currency === "USDT")?.amount || 0), [balances.data]);

  const claim = async (daily: number) => {
    try {
      const result = await claimDue.mutateAsync();
      if (result?.paid && result.paid > 0) {
        notify("تم استلام الربح", `أُضيف ${daily.toFixed(2)} USDT إلى رصيدك وتم تجديد الوقت.`);
      } else {
        notify("لا يوجد ربح الآن", "لم يحن موعد الربح بعد.");
      }
    } catch (error: any) {
      notify("تعذر استلام الربح", error?.message || "حدث خطأ، حاول مرة أخرى.");
    }
  };

  const start = async (amount: number) => {
    if (!user) {
      notify("تسجيل الدخول مطلوب", "سجّل الدخول أولاً لبدء العقد.");
      return;
    }
    if (usdtBalance < amount) {
      notify("الرصيد غير كافٍ", `رصيدك المتاح ${usdtBalance.toFixed(2)} USDT.`);
      return;
    }
    const dailyProfit = amount * TRADE_DAILY_RATE;
    const confirmed = await confirmAsync(
      "تأكيد بدء العقد",
      `المبلغ: ${amount.toFixed(2)} USDT\nالربح اليومي التقديري: ${dailyProfit.toFixed(2)} USDT\n\nسيتم حجز المبلغ من رصيدك فوراً عند التأكيد.`,
      "تأكيد البدء",
    );
    if (!confirmed) return;
    setSelectedAmount(amount);
    try {
      await startContract.mutateAsync({ amount });
      notify("تم بدء العقد", `تم حجز ${amount.toFixed(2)} USDT، وأُضيف ربحك الفوري مباشرة لرصيدك.`);
    } catch (error: any) {
      notify("تعذر بدء العقد", error?.message || "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setSelectedAmount(null);
    }
  };

  const pending = startContract.isPending;
  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>استثمر من رصيدك</Text>
              <Text style={styles.title}>تجارة</Text>
            </View>
            <View style={styles.live}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>عقود متاحة</Text>
            </View>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.row}>
              <CoinMark mark="USDT" color="#26A17B" size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceTitle}>رصيد التداول</Text>
                <Text style={styles.sub}>الرصيد الحقيقي في محفظتك</Text>
              </View>
              <View style={styles.pill}>
                <MaterialIcons name="verified" size={13} color={P.accent} />
                <Text style={styles.pillText}>رصيد مباشر</Text>
              </View>
            </View>
            <Text style={styles.balanceValue}>
              {usdtBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })}{" "}
              <Text style={styles.balanceUnit}>USDT</Text>
            </Text>
            <Text style={styles.sub}>
              متاح للسحب والتداول · محجوز في العقود {lockedAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.section}>خطط التداول</Text>
            <Text style={styles.count}>{TRADE_PLANS.length} خطة</Text>
          </View>

          {TRADE_PLANS.map((plan) => {
            const daily = plan.amount * TRADE_DAILY_RATE;
            const existing = (contracts.data || []).find(
              (c: any) => c.status === "active" && Number(c.principal) === plan.amount,
            );
            const busy = selectedAmount === plan.amount && pending;
            const remainingMs = existing ? Math.max(0, new Date(existing.nextPayoutAt).getTime() - now) : 0;
            const total = Math.floor(remainingMs / 1000);
            const countdown = [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
              .map((n) => String(n).padStart(2, "0"))
              .join(":");
            const disabled = pending || activeAmounts.has(plan.amount);
            return (
              <View key={plan.amount} style={styles.planCard}>
                <View style={styles.row}>
                  <View style={styles.coinRing}>
                    <CoinMark mark={plan.coin || "USDT"} color={plan.color || "#26A17B"} size={40} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planAmount}>{plan.amount} USDT</Text>
                    <Text style={styles.sub}>عقد تداول USDT</Text>
                  </View>
                  <View style={styles.rate}>
                    <MaterialIcons name="trending-up" size={15} color={P.accent} />
                    <Text style={styles.rateValue}>{(TRADE_DAILY_RATE * 100).toFixed(1)}% يومياً</Text>
                  </View>
                </View>

                <View style={styles.stats}>
                  <View style={styles.statCell}>
                    <Text style={styles.sub}>العائد اليومي</Text>
                    <Text style={styles.profit}>+{daily.toFixed(2)} USDT</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCell}>
                    <Text style={styles.sub}>مدة التجارة</Text>
                    <View style={styles.lockRow}>
                      <MaterialIcons name="lock-outline" size={14} color={P.text} />
                      <Text style={styles.days}>365 يوم</Text>
                    </View>
                  </View>
                </View>

                {existing ? (
                  remainingMs <= 0 ? (
                    <View style={styles.readyBox}>
                      <View style={styles.row}>
                        <View style={styles.check}>
                          <MaterialIcons name="bolt" size={15} color={P.onAccent} />
                        </View>
                        <Text style={styles.activeText}>الربح جاهز للاستلام</Text>
                      </View>
                      <Pressable
                        disabled={claimDue.isPending}
                        onPress={() => claim(Number(existing.principal) * TRADE_DAILY_RATE)}
                        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }, claimDue.isPending && { opacity: 0.5 }]}
                      >
                        <Text style={styles.ctaText}>{claimDue.isPending ? "جاري الاستلام..." : "أكمل المهام"}</Text>
                        <View style={styles.ctaArrow}>
                          <MaterialIcons name={claimDue.isPending ? "hourglass-top" : "check"} size={18} color={P.accent} />
                        </View>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.activeBox}>
                      <View style={styles.row}>
                        <View style={styles.check}>
                          <MaterialIcons name="check" size={14} color={P.onAccent} />
                        </View>
                        <Text style={styles.activeText}>يتم التداول</Text>
                      </View>
                      <View style={{ alignItems: "flex-start" }}>
                        <Text style={styles.sub}>الربح القادم بعد</Text>
                        <Text style={styles.timer}>{countdown}</Text>
                      </View>
                    </View>
                  )
                ) : (
                  <Pressable
                    disabled={disabled}
                    onPress={() => start(plan.amount)}
                    style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }, disabled && { opacity: 0.5 }]}
                  >
                    <Text style={styles.ctaText}>{busy ? "جاري الشراء..." : "شراء الآن"}</Text>
                    <View style={styles.ctaArrow}>
                      <MaterialIcons name={busy ? "hourglass-top" : "arrow-back"} size={18} color={P.accent} />
                    </View>
                  </Pressable>
                )}
              </View>
            );
          })}

          {contracts.data?.length ? (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>عقودي الحالية</Text>
                <Text style={styles.count}>{contracts.data.length} عقد</Text>
              </View>
              <View style={styles.listCard}>
                {contracts.data.slice(0, 10).map((contract: any, i: number, arr: any[]) => {
                  const plan = TRADE_PLANS.find((p) => p.amount === Number(contract.principal));
                  return (
                    <View key={contract.id} style={[styles.activeRow, i < arr.length - 1 && styles.rowDivider]}>
                      <View style={[styles.coinRing, { width: 44, height: 44 }]}>
                        <CoinMark mark={plan?.coin || "USDT"} color={plan?.color || "#26A17B"} size={30} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activeAmount}>{Number(contract.principal).toLocaleString("en-US")} USDT</Text>
                        <Text style={styles.sub}>
                          {contract.status === "active" ? "نشط" : "مكتمل"} • {contract.payoutCount} دفعة
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-start" }}>
                        <Text style={styles.profit}>+{Number(contract.totalProfitPaid).toFixed(2)}</Text>
                        <Text style={styles.sub}>USDT أرباح</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { color: P.muted, fontSize: 13, textAlign: "right" },
  title: { color: P.text, fontSize: 30, fontWeight: "900", textAlign: "right", marginTop: 2 },
  live: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: P.soft, paddingHorizontal: 14, height: 36, borderRadius: 18 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P.accent },
  liveText: { color: P.accent, fontSize: 12, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  sub: { color: P.muted, fontSize: 12, marginTop: 3, textAlign: "right" },
  balanceCard: { backgroundColor: P.card, borderWidth: 1, borderColor: "rgba(255,230,0,0.35)", borderRadius: 24, padding: 18 },
  balanceTitle: { color: P.text, fontSize: 16, fontWeight: "800", textAlign: "right" },
  balanceValue: { color: P.text, fontSize: 34, fontWeight: "900", textAlign: "right", marginTop: 18 },
  balanceUnit: { color: P.muted, fontSize: 16, fontWeight: "700" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: P.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pillText: { color: P.accent, fontSize: 11, fontWeight: "800" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  section: { color: P.text, fontSize: 19, fontWeight: "800" },
  count: { color: P.accent, fontSize: 13, fontWeight: "700" },
  planCard: { backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 26, padding: 16, gap: 14 },
  coinRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#0F0F10", borderWidth: 1, borderColor: "rgba(255,230,0,0.35)", alignItems: "center", justifyContent: "center" },
  planAmount: { color: P.text, fontSize: 22, fontWeight: "900", textAlign: "right" },
  rate: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: P.soft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  rateValue: { color: P.accent, fontSize: 12, fontWeight: "900" },
  stats: { flexDirection: "row", alignItems: "center", backgroundColor: "#0F0F10", borderRadius: 18, paddingVertical: 14 },
  statCell: { flex: 1, paddingHorizontal: 14 },
  statDivider: { width: 1, height: 34, backgroundColor: P.border },
  days: { color: P.text, fontSize: 16, fontWeight: "900" },
  
  profit: { color: P.accent, fontSize: 16, fontWeight: "900", marginTop: 4, textAlign: "right" },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cta: { height: 56, borderRadius: 28, backgroundColor: P.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  ctaArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: P.onAccent, alignItems: "center", justifyContent: "center" },
  ctaText: { color: P.onAccent, fontSize: 16, fontWeight: "900" },
  activeBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.soft, borderRadius: 16, padding: 14 },
  readyBox: { backgroundColor: P.soft, borderRadius: 16, padding: 14, gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
  activeText: { color: P.accent, fontSize: 15, fontWeight: "800" },
  timer: { color: P.text, fontSize: 18, fontWeight: "900", marginTop: 2 },
  listCard: { backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 22, paddingHorizontal: 14 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: P.border },
  activeAmount: { color: P.text, fontSize: 15, fontWeight: "800", textAlign: "right" },
});
