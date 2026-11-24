import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CoinMark } from "@/components/cwaax-ui";
import { useLiveMarkets } from "@/hooks/use-live-markets";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", danger: "#FF5C5C",
  soft: "rgba(255,230,0,0.12)", track: "#2A2A2D",
};

type Asset = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  outlook: string;
  color: string;
  score: number;
  bars: number[];
  support: string;
  resistance: string;
  momentum: number;
  volume: number;
  volatility: number;
  tip: string;
};

const BASE_ASSETS: Asset[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: "$67,240",
    change: "+2.1%",
    outlook: "إيجابي",
    color: "#D98931",
    score: 82,
    bars: [28, 34, 30, 42, 38, 48, 52, 46, 58, 62, 55, 68],
    support: "$65,800",
    resistance: "$69,200",
    momentum: 74,
    volume: 81,
    volatility: 42,
    tip: "الزخم الشرائي قوي قرب الدعم. راقب الإغلاق فوق 68K.",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: "$3,487",
    change: "+0.6%",
    outlook: "مستقر",
    color: "#6675D1",
    score: 68,
    bars: [40, 38, 44, 42, 48, 46, 50, 49, 52, 51, 53, 50],
    support: "$3,320",
    resistance: "$3,610",
    momentum: 55,
    volume: 60,
    volatility: 38,
    tip: "حركة عرضية. انتظر كسر النطاق قبل دخول قوي.",
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: "$0.4671",
    change: "+1.4%",
    outlook: "إيجابي",
    color: "#232B32",
    score: 76,
    bars: [22, 26, 24, 32, 30, 36, 40, 38, 44, 48, 45, 52],
    support: "$0.4410",
    resistance: "$0.4920",
    momentum: 70,
    volume: 66,
    volatility: 48,
    tip: "اختراق تدريجي صاعد. إدارة حجم الصفقة مهمة بسبب التذبذب.",
  },
];

const TIMEFRAMES = ["24س", "7أيام", "30يوم"] as const;

function formatLivePrice(n: number): string {
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.meter}>
      <View style={styles.meterTop}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MiniChart({ bars }: { bars: number[] }) {
  const max = Math.max(...bars);
  return (
    <View style={styles.chartRow}>
      {bars.map((v, i) => (
        <View key={i} style={styles.chartBarWrap}>
          <View
            style={{
              width: "100%",
              borderRadius: 4,
              height: Math.max(8, (v / max) * 72),
              backgroundColor: i === bars.length - 1 ? P.accent : "rgba(255,230,0,0.28)",
            }}
          />
        </View>
      ))}
    </View>
  );
}

function FearGauge({ score }: { score: number }) {
  const label = score >= 75 ? "طمع مرتفع" : score >= 55 ? "إيجابي" : score >= 40 ? "محايد" : "خوف";
  const color = score >= 55 ? P.accent : score >= 40 ? P.text : P.danger;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <MaterialIcons name="speed" size={22} color={P.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>مؤشر الخوف والطمع</Text>
          <Text style={styles.cardSub}>{label} · تقدير محلي مبسّط</Text>
        </View>
        <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
      </View>
      <View style={[styles.track, { marginTop: 16 }]}>
        <View style={[styles.fill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>طمع</Text>
        <Text style={styles.legendText}>خوف</Text>
      </View>
    </View>
  );
}

export default function PredictScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState("BTC");
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>("7أيام");
  const { data: live } = useLiveMarkets();

  const ASSETS = useMemo(() => {
    if (!live) return BASE_ASSETS;
    const bySymbol = new Map(live.map((c) => [c.symbol, c]));
    return BASE_ASSETS.map((a) => {
      const coin = bySymbol.get(a.symbol);
      if (!coin) return a;
      const sign = coin.change24h >= 0 ? "+" : "";
      return { ...a, price: formatLivePrice(coin.price), change: `${sign}${coin.change24h.toFixed(1)}%` };
    });
  }, [live]);

  const asset = useMemo(() => ASSETS.find((a) => a.symbol === selected) || ASSETS[0], [selected, ASSETS]);

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>تحليلات مبسطة</Text>
              <Text style={styles.title}>توقع السوق</Text>
            </View>
            <Pressable onPress={() => router.push("/notifications")} style={styles.circleBtn}>
              <MaterialIcons name="notifications-none" size={22} color={P.text} />
            </Pressable>
          </View>

          <View style={[styles.card, styles.row, { borderColor: "rgba(255,230,0,0.35)" }]}>
            <View style={[styles.iconBox, { backgroundColor: P.accent }]}>
              <MaterialIcons name="auto-awesome" size={22} color={P.onAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>مؤشر السوق العام</Text>
              <Text style={styles.cardSub}>الاتجاه الحالي يميل للصعود</Text>
            </View>
            <Text style={[styles.gaugeScore, { color: P.accent }]}>+6.4%</Text>
          </View>

          <View style={styles.tfRow}>
            {TIMEFRAMES.map((item) => (
              <Pressable key={item} onPress={() => setTf(item)} style={[styles.chip, tf === item && styles.chipActive]}>
                <Text style={[styles.chipText, tf === item && styles.chipTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <FearGauge score={64} />

          <Text style={styles.section}>الأصول المتابعة</Text>
          {ASSETS.map((item) => {
            const neg = item.change.startsWith("-");
            return (
              <Pressable
                key={item.symbol}
                onPress={() => setSelected(item.symbol)}
                style={({ pressed }) => [
                  styles.card, styles.row,
                  selected === item.symbol && { borderColor: P.accent },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <CoinMark mark={item.symbol} color={item.color} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.symbol}/USDT</Text>
                  <Text style={styles.cardSub}>
                    {item.price} · <Text style={{ color: neg ? P.danger : P.accent, fontWeight: "800" }}>{item.change}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: "flex-start", gap: 6 }}>
                  <View style={styles.pill}><Text style={styles.pillText}>{item.outlook}</Text></View>
                  <Text style={styles.cardSub}>ثقة {item.score}%</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={[styles.card, { marginTop: 6 }]}>
            <View style={styles.row}>
              <CoinMark mark={asset.symbol} color={asset.color} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{asset.name}</Text>
                <Text style={styles.cardSub}>{asset.symbol}/USDT · إطار {tf}</Text>
              </View>
              <View style={styles.pill}><Text style={styles.pillText}>{asset.outlook}</Text></View>
            </View>
            <MiniChart bars={asset.bars} />
            <View style={styles.levels}>
              {[["دعم", asset.support], ["مقاومة", asset.resistance], ["ثقة", `${asset.score}%`]].map(([l, v], i) => (
                <View key={l} style={styles.levelBox}>
                  <Text style={styles.cardSub}>{l}</Text>
                  <Text style={[styles.levelValue, i === 2 && { color: P.accent }]}>{v}</Text>
                </View>
              ))}
            </View>
            <Meter label="زخم الشراء" value={asset.momentum} color={P.accent} />
            <Meter label="نشاط الحجم" value={asset.volume} color="#FFFFFF" />
            <Meter label="التذبذب" value={asset.volatility} color="#8A8A8E" />
            <View style={styles.tip}>
              <MaterialIcons name="tips-and-updates" size={18} color={P.accent} />
              <Text style={styles.tipText}>{asset.tip}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  kicker: { color: P.muted, fontSize: 13, textAlign: "right" },
  title: { color: P.text, fontSize: 30, fontWeight: "900", textAlign: "right", marginTop: 2 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 20, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: P.soft, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: P.text, fontSize: 15, fontWeight: "800", textAlign: "right" },
  cardSub: { color: P.muted, fontSize: 12, marginTop: 3, textAlign: "right" },
  gaugeScore: { fontSize: 24, fontWeight: "900" },
  tfRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 18, height: 38, borderRadius: 19, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: P.accent, borderColor: P.accent },
  chipText: { color: P.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: P.onAccent },
  track: { height: 8, borderRadius: 4, backgroundColor: P.track, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  legendText: { color: P.muted, fontSize: 11 },
  section: { color: P.text, fontSize: 18, fontWeight: "800", textAlign: "right", marginTop: 8 },
  pill: { backgroundColor: P.soft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  pillText: { color: P.accent, fontSize: 12, fontWeight: "800" },
  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 80, marginTop: 18 },
  chartBarWrap: { flex: 1, justifyContent: "flex-end" },
  levels: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 6 },
  levelBox: { flex: 1, backgroundColor: "#0F0F10", borderRadius: 14, paddingVertical: 10, alignItems: "center" },
  levelValue: { color: P.text, fontSize: 14, fontWeight: "800", marginTop: 4 },
  meter: { marginTop: 12 },
  meterTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  meterLabel: { color: P.muted, fontSize: 12 },
  meterValue: { color: P.text, fontSize: 12, fontWeight: "800" },
  tip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: P.soft, borderRadius: 14, padding: 12, marginTop: 16 },
  tipText: { color: P.text, fontSize: 12, flex: 1, textAlign: "right", lineHeight: 19 },
});
