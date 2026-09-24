import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { Card, CoinMark, CwaLogo, IconButton, SectionTitle } from "@/components/cwaax-ui";
import { CWAAX, TRADE_DAILY_RATE, TRADE_PLANS } from "@/constants/cwaax";
import { confirmAsync, notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

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

  // عندما ينتهي العدّاد: صرف الأرباح المستحقة وإعادة ضبط الوقت تلقائياً
  useEffect(() => {
    if (!contracts.data?.length) return;
    if (claimDue.isPending) return;
    const hasDue = contracts.data.some(
      (contract: any) =>
        contract.status === "active" &&
        new Date(contract.nextPayoutAt).getTime() <= now,
    );
    if (hasDue) {
      claimDue.mutate();
    }
  }, [now, contracts.data, claimDue.isPending]);

  const activeAmounts = useMemo(() => new Set(
    (contracts.data || [])
      .filter((contract: any) => contract.status === "active")
      .map((contract: any) => Number(contract.principal))
  ), [contracts.data]);
  const usdtBalance = useMemo(() => Number((balances.data || []).find((b: any) => b.currency === "USDT")?.amount || 0), [balances.data]);

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

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <CwaLogo />
          <IconButton icon="tune" label="إعدادات التداول" onPress={() => notify("عقود التداول", "اختر مبلغ العقد من البطاقات أدناه.")} />
        </View>
        <View style={styles.titleRow}>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>عقود متاحة</Text>
          </View>
          <View>
            <Text style={styles.kicker}>استثمر من رصيدك</Text>
            <Text style={styles.title}>تجارة</Text>
          </View>
        </View>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View style={styles.usdtIcon}>
              <CoinMark mark="USDT" color="#26A17B" size={48} />
            </View>
            <View style={styles.balanceText}>
              <Text style={styles.balanceTitle}>رصيد التداول</Text>
              <Text style={styles.balanceSub}>الرصيد الحقيقي في محفظتك</Text>
            </View>
          </View>
          <View style={styles.balanceBottom}>
            <Text style={styles.balanceValue}>
              {usdtBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })}{" "}
              <Text style={styles.balanceUnit}>USDT</Text>
            </Text>
            <View style={styles.realPill}>
              <MaterialIcons name="verified" size={13} color={CWAAX.green} />
              <Text style={styles.realPillText}>رصيد مباشر</Text>
            </View>
          </View>
        </Card>

        <SectionTitle title="خطط التداول" action={`${TRADE_PLANS.length} خطة`} />
        <View style={styles.planList}>
          {TRADE_PLANS.map((plan) => {
            const daily = plan.amount * TRADE_DAILY_RATE;
            const existing = (contracts.data || []).find(
              (contract: any) => contract.status === "active" && Number(contract.principal) === plan.amount,
            );
            const busy = selectedAmount === plan.amount && startContract.isPending;
            const remainingMs = existing ? Math.max(0, new Date(existing.nextPayoutAt).getTime() - now) : 0;
            const totalSeconds = Math.floor(remainingMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const countdown = [
              String(hours).padStart(2, "0"),
              String(minutes).padStart(2, "0"),
              String(seconds).padStart(2, "0"),
            ].join(":");

            return (
              <Card key={plan.amount} style={styles.planCard}>
                <View style={styles.planTop}>
                  <CoinMark mark={plan.coin || "USDT"} color={plan.color || "#26A17B"} size={42} />
                  <View style={styles.planMain}>
                    <Text style={styles.planAmount}>{plan.amount} USDT</Text>
                    <Text style={styles.planSub}>عقد تداول USDT</Text>
                  </View>
                  <View style={styles.ratePill}>
                    <Text style={styles.rateValue}>{(TRADE_DAILY_RATE * 100).toFixed(1)}%</Text>
                    <Text style={styles.rateLabel}>يومياً</Text>
                  </View>
                </View>

                <View style={styles.planMeta}>
                  <View>
                    <Text style={styles.metaLabel}>العائد اليومي المحسوب</Text>
                    <Text style={styles.metaValue}>+{daily.toFixed(2)} USDT</Text>
                  </View>
                  <View style={styles.lockRow}>
                    <MaterialIcons name="lock-outline" size={14} color={CWAAX.muted} />
                    <Text style={styles.lockText}>مدة العقد 365 يوم</Text>
                  </View>
                </View>

                {existing ? (
                  <View style={styles.activeContractBox}>
                    <View style={styles.activeContractStatus}>
                      <MaterialIcons name="check-circle" size={20} color={CWAAX.green} />
                      <Text style={styles.activeContractText}>العقد مفعل</Text>
                    </View>
                    <View style={styles.timerBox}>
                      <Text style={styles.timerLabel}>الربح القادم بعد</Text>
                      <Text style={styles.timerValue}>{countdown}</Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    disabled={startContract.isPending || activeAmounts.has(plan.amount)}
                    onPress={() => start(plan.amount)}
                    style={({ pressed }) => [
                      styles.contractButton,
                      pressed && styles.pressed,
                      (startContract.isPending || activeAmounts.has(plan.amount)) && styles.disabled,
                    ]}
                  >
                    <Text style={styles.contractButtonText}>
                      {busy ? "جاري بدء العقد..." : "ابدأ العقد"}
                    </Text>
                    <MaterialIcons name={busy ? "hourglass-top" : "arrow-back"} size={18} color={CWAAX.white} />
                  </Pressable>
                )}
              </Card>
            );
          })}
        </View>

        {contracts.data?.length ? (
          <>
            <SectionTitle title="عقودي الحالية" action={`${contracts.data.length} عقد`} />
            <View style={styles.activeList}>
              {contracts.data.slice(0, 10).map((contract: any) => {
                const matchingPlan = TRADE_PLANS.find((p) => p.amount === Number(contract.principal));
                return (
                  <View key={contract.id} style={styles.activeRow}>
                    <CoinMark mark={matchingPlan?.coin || "USDT"} color="#26A17B" size={34} />
                    <View style={styles.activeInfo}>
                      <Text style={styles.activeAmount}>
                        {Number(contract.principal).toLocaleString("en-US")} USDT
                      </Text>
                      <Text style={styles.activeMeta}>
                        {contract.status === "active" ? "نشط" : "مكتمل"} • {contract.payoutCount} دفعة
                      </Text>
                    </View>
                    <View style={styles.activeProfit}>
                      <Text style={styles.activeProfitValue}>+{Number(contract.totalProfitPaid).toFixed(2)}</Text>
                      <Text style={styles.activeProfitLabel}>USDT أرباح</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  live: { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: CWAAX.greenSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CWAAX.green },
  liveText: { color: CWAAX.green, fontSize: 11, fontWeight: "800" },
  kicker: { color: CWAAX.muted, fontSize: 11, textAlign: "right" },
  title: { color: CWAAX.ink, fontSize: 22, fontWeight: "900", textAlign: "right" },
  balanceCard: { marginBottom: 18 },
  balanceTop: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  usdtIcon: {},
  balanceText: { flex: 1 },
  balanceTitle: { color: CWAAX.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  balanceSub: { color: CWAAX.muted, fontSize: 11, textAlign: "right", marginTop: 2 },
  balanceBottom: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  balanceValue: { color: CWAAX.ink, fontSize: 22, fontWeight: "900" },
  balanceUnit: { color: CWAAX.muted, fontSize: 13, fontWeight: "700" },
  realPill: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: CWAAX.greenSoft, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  realPillText: { color: CWAAX.green, fontSize: 11, fontWeight: "800" },
  planList: { gap: 12, marginBottom: 20 },
  planCard: {},
  planTop: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  planMain: { flex: 1 },
  planAmount: { color: CWAAX.ink, fontSize: 18, fontWeight: "900", textAlign: "right" },
  planSub: { color: CWAAX.muted, fontSize: 11, textAlign: "right", marginTop: 2 },
  ratePill: { backgroundColor: CWAAX.greenSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  rateValue: { color: CWAAX.green, fontSize: 14, fontWeight: "900" },
  rateLabel: { color: CWAAX.green, fontSize: 10, fontWeight: "700" },
  planMeta: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  metaLabel: { color: CWAAX.muted, fontSize: 10, textAlign: "right" },
  metaValue: { color: CWAAX.green, fontSize: 14, fontWeight: "900", textAlign: "right", marginTop: 2 },
  lockRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  lockText: { color: CWAAX.muted, fontSize: 11 },
  activeContractBox: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: CWAAX.greenSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
  activeContractStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  activeContractText: { color: CWAAX.green, fontSize: 13, fontWeight: "800" },
  timerBox: { alignItems: "flex-start" },
  timerLabel: { color: CWAAX.muted, fontSize: 10 },
  timerValue: { color: CWAAX.ink, fontSize: 15, fontWeight: "900", marginTop: 2 },
  contractButton: { marginTop: 14, height: 48, borderRadius: 14, backgroundColor: CWAAX.green, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  contractButtonText: { color: CWAAX.white, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  activeList: { gap: 10, marginBottom: 20 },
  activeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: CWAAX.surface, borderRadius: 16, padding: 12 },
  activeInfo: { flex: 1 },
  activeAmount: { color: CWAAX.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  activeMeta: { color: CWAAX.muted, fontSize: 11, textAlign: "right", marginTop: 2 },
  activeProfit: { alignItems: "flex-start" },
  activeProfitValue: { color: CWAAX.green, fontSize: 14, fontWeight: "900" },
  activeProfitLabel: { color: CWAAX.muted, fontSize: 10, marginTop: 2 },
});
