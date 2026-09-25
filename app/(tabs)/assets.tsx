import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton } from "@/components/phanx-ui";
import { PHANX } from "@/constants/phanx";
import { notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

export default function AssetsScreen() {
  const { user } = useAuth();
  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user });
  const balanceMap = useMemo(() => new Map((balances.data || []).map((b: any) => [b.currency, Number(b.amount)])), [balances.data]);
  const totalUsdt = balanceMap.get("USDT") || 0;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>محفظتي</Text>
          <Text style={styles.title}>الأصول</Text>
        </View>
        <View style={styles.actions}>
          <IconButton icon="more-horiz" label="المزيد" onPress={() => notify("خيارات الأصول", "إجمالي رصيدك من USDT يظهر هنا.")} />
        </View>
      </View>

      <Card style={styles.totalCard}>
        <Text style={styles.label}>إجمالي قيمة الأصول</Text>
        <Text style={styles.total}>${totalUsdt.toFixed(2)}</Text>
        <View style={styles.totalFoot}>
          <Text style={styles.subtle}>USDT</Text>
          <View style={styles.positivePill}>
            <Text style={styles.positive}>+4.68%</Text>
          </View>
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 18 },
  kicker: { fontSize: 12, color: PHANX.muted, textAlign: "right", marginBottom: 3 },
  title: { fontSize: 26, fontWeight: "900", color: PHANX.ink, textAlign: "right" },
  actions: { flexDirection: "row", gap: 8 },
  totalCard: { backgroundColor: "#F0F9F4", borderColor: "#D9F0E1", marginBottom: 21 },
  label: { color: PHANX.muted, fontSize: 12, textAlign: "right" },
  total: { color: PHANX.ink, fontSize: 30, fontWeight: "900", textAlign: "right", marginTop: 11 },
  totalFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  subtle: { color: PHANX.muted, fontSize: 11 },
  positivePill: { backgroundColor: PHANX.green, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  positive: { color: PHANX.white, fontSize: 11, fontWeight: "800" },
});
