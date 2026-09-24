import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, CoinMark, CwaLogo, IconButton, StatusPill } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { useLiveMarkets } from "@/hooks/use-live-markets";

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
        <Text style={styles.meterValue}>{value}%</Text>
        <Text style={styles.meterLabel}>{label}</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MiniChart({ bars, color }: { bars: number[]; color: string }) {
  const max = Math.max(...bars);
  return (
    <View style={styles.chartRow}>
      {bars.map((v, i) => (
        <View key={i} style={styles.chartBarWrap}>
          <View
            style={[
              styles.chartBar,
              {
                height: Math.max(8, (v / max) * 72),
                backgroundColor: i === bars.length - 1 ? color : `${color}55`,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function FearGauge({ score }: { score: number }) {
  const label =
    score >= 75 ? "طمع مرتفع" : score >= 55 ? "إيجابي" : score >= 40 ? "محايد" : "خوف";
  const color =
    score >= 75 ? "#E07A2F" : score >= 55 ? CWAAX.green : score >= 40 ? CWAAX.gold : CWAAX.red;
  return (
    <Card style={styles.gaugeCard}>
      <View style={styles.gaugeHeader}>
        <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.gaugeTitle}>مؤشر الخوف والطمع</Text>
          <Text style={styles.gaugeSub}>{label} · تقدير محلي مبسّط</Text>
        </View>
        <View style={[styles.gaugeIcon, { backgroundColor: `${color}22` }]}>
          <MaterialIcons name="speed" size={20} color={color} />
        </View>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.gaugeLegend}>
        <Text style={styles.gaugeLegendText}>طمع</Text>
        <Text style={styles.gaugeLegendText}>خوف</Text>
      </View>
    </Card>
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
      return {
        ...a,
        price: formatLivePrice(coin.price),
        change: `${sign}${coin.change24h.toFixed(1)}%`,
      };
    });
  }, [live]);

  const asset = useMemo(
    () => ASSETS.find((a) => a.symbol === selected) || ASSETS[0],
    [selected, ASSETS],
  );

  const marketScore = 64;

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <CwaLogo />
          <IconButton
            icon="notifications-none"
            label="الإشعارات"
            onPress={() => router.push("/notifications")}
          />
        </View>

        <Text style={styles.kicker}>تحليلات مبسطة</Text>
        <Text style={styles.title}>توقع السوق</Text>

        <Card style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="auto-awesome" size={22} color={CWAAX.green} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>مؤشر السوق العام</Text>
            <Text style={styles.heroSub}>الاتجاه الحالي يميل للصعود</Text>
          </View>
          <Text style={styles.heroScore}>+6.4%</Text>
        </Card>

        <View style={styles.tfRow}>
          {TIMEFRAMES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setTf(item)}
              style={[styles.tfChip, tf === item && styles.tfChipActive]}
            >
              <Text style={[styles.tfText, tf === item && styles.tfTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <FearGauge score={marketScore} />

        <Text style={styles.sectionLabel}>الأصول المتابعة</Text>
        {ASSETS.map((item) => (
          <Pressable
            key={item.symbol}
            onPress={() => setSelected(item.symbol)}
            style={({ pressed }) => [
              styles.assetRow,
              selected === item.symbol && styles.assetSelected,
              pressed && styles.pressed,
            ]}
          >
            <CoinMark mark={item.symbol} color={item.color} size={38} />
            <View style={styles.assetName}>
              <Text style={styles.assetSymbol}>{item.symbol}/USDT</Text>
              <Text style={styles.assetPrice}>
                {item.price} · <Text style={{ color: item.change.startsWith("-") ? CWAAX.red : CWAAX.green }}>{item.change}</Text>
              </Text>
            </View>
            <View style={styles.signal}>
              <StatusPill>{item.outlook}</StatusPill>
              <Text style={styles.signalScore}>ثقة {item.score}%</Text>
            </View>
          </Pressable>
        ))}

        <Card style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleRow}>
              <View>
                <Text style={styles.detailTitle}>{asset.name}</Text>
                <Text style={styles.detailSub}>
                  {asset.symbol}/USDT · إطار {tf}
                </Text>
              </View>
              <CoinMark mark={asset.symbol} color={asset.color} size={40} />
            </View>
            <View style={[styles.detailBadge, { backgroundColor: `${asset.color}18` }]}>
              <Text style={[styles.detailBadgeText, { color: asset.color }]}>{asset.outlook}</Text>
            </View>
          </View>

          <MiniChart bars={asset.bars} color={asset.color} />

          <View style={styles.levels}>
            <View style={styles.levelBox}>
              <Text style={styles.levelLabel}>دعم</Text>
              <Text style={styles.levelValue}>{asset.support}</Text>
            </View>
            <View style={styles.levelBox}>
              <Text style={styles.levelLabel}>مقاومة</Text>
              <Text style={styles.levelValue}>{asset.resistance}</Text>
            </View>
            <View style={styles.levelBox}>
              <Text style={styles.levelLabel}>ثقة</Text>
              <Text style={[styles.levelValue, { color: CWAAX.green }]}>{asset.score}%</Text>
            </View>
          </View>

          <Meter label="زخم الشراء" value={asset.momentum} color={CWAAX.green} />
          <Meter label="نشاط الحجم" value={asset.volume} color={CWAAX.purple} />
          <Meter label="التذبذب" value={asset.volatility} color={CWAAX.gold} />

          <View style={styles.assetTip}>
            <MaterialIcons name="tips-and-updates" size={18} color={CWAAX.gold} />
            <Text style={styles.assetTipText}>{asset.tip}</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  kicker: { color: CWAAX.muted, textAlign: "right", fontSize: 12 },
  title: { color: CWAAX.ink, textAlign: "right", fontSize: 28, fontWeight: "900", marginTop: 4 },
  subtitle: { color: CWAAX.muted, textAlign: "right", fontSize: 12, marginTop: 6, marginBottom: 16, lineHeight: 18 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9F4",
    borderColor: "#D8F0E1",
    marginBottom: 14,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: CWAAX.white,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, marginHorizontal: 11 },
  heroTitle: { color: CWAAX.ink, fontSize: 13, fontWeight: "800", textAlign: "right" },
  heroSub: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  heroScore: { color: CWAAX.green, fontWeight: "900", fontSize: 16 },
  tfRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 14 },
  tfChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CWAAX.surface,
    borderWidth: 1,
    borderColor: CWAAX.line,
  },
  tfChipActive: { backgroundColor: CWAAX.green, borderColor: CWAAX.green },
  tfText: { color: CWAAX.muted, fontSize: 12, fontWeight: "800" },
  tfTextActive: { color: CWAAX.white },
  gaugeCard: { marginBottom: 18, paddingVertical: 14 },
  gaugeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 12 },
  gaugeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  gaugeTitle: { color: CWAAX.ink, fontSize: 13, fontWeight: "800", textAlign: "right" },
  gaugeSub: { color: CWAAX.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  gaugeScore: { fontSize: 22, fontWeight: "900", minWidth: 40, textAlign: "left" },
  gaugeTrack: { height: 10, borderRadius: 8, backgroundColor: CWAAX.surface, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 8 },
  gaugeLegend: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  gaugeLegendText: { color: CWAAX.muted, fontSize: 10 },
  sectionLabel: { color: CWAAX.ink, fontWeight: "800", fontSize: 16, textAlign: "right", marginBottom: 10 },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CWAAX.line,
    marginBottom: 9,
  },
  assetSelected: { backgroundColor: "#FAFDFC", borderColor: "#BDE4CB" },
  assetName: { flex: 1 },
  assetSymbol: { color: CWAAX.ink, fontSize: 13, fontWeight: "800", textAlign: "right" },
  assetPrice: { color: CWAAX.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  signal: { alignItems: "flex-end", gap: 5 },
  signalScore: { color: CWAAX.muted, fontSize: 9 },
  detailCard: { marginTop: 12, marginBottom: 18 },
  detailHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  detailTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, flex: 1 },
  detailTitle: { color: CWAAX.ink, fontSize: 16, fontWeight: "900", textAlign: "right" },
  detailSub: { color: CWAAX.muted, fontSize: 11, marginTop: 3, textAlign: "right" },
  detailBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  detailBadgeText: { fontSize: 12, fontWeight: "800" },
  chartRow: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4, marginBottom: 14 },
  chartBarWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  chartBar: { width: "80%", borderRadius: 6 },
  levels: { flexDirection: "row-reverse", gap: 8, marginBottom: 14 },
  levelBox: {
    flex: 1,
    backgroundColor: CWAAX.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  levelLabel: { color: CWAAX.muted, fontSize: 10, marginBottom: 4 },
  levelValue: { color: CWAAX.ink, fontSize: 12, fontWeight: "900" },
  meter: { marginBottom: 10 },
  meterTop: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 4 },
  meterLabel: { color: CWAAX.muted, fontSize: 11 },
  meterValue: { color: CWAAX.ink, fontSize: 11, fontWeight: "800" },
  meterTrack: { height: 8, borderRadius: 6, backgroundColor: CWAAX.surface, overflow: "hidden" },
  meterFill: { height: "100%", borderRadius: 6 },
  assetTip: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 8,
    backgroundColor: "#FFF9EC",
    borderRadius: 12,
    padding: 10,
  },
  assetTipText: { flex: 1, color: CWAAX.ink, fontSize: 11, lineHeight: 17, textAlign: "right" },
  tipCard: { marginBottom: 14 },
  tipHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 8 },
  tipTitle: { color: CWAAX.ink, fontSize: 13, fontWeight: "900", flex: 1, textAlign: "right" },
  tipText: { color: CWAAX.muted, fontSize: 12, lineHeight: 18, textAlign: "right" },
  tipDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CWAAX.line },
  dotActive: { backgroundColor: CWAAX.green, width: 16 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF9EC",
    borderColor: "#F6E5B8",
  },
  noteCopy: { flex: 1 },
  noteTitle: { color: CWAAX.ink, fontWeight: "800", textAlign: "right", fontSize: 12 },
  noteText: { color: CWAAX.muted, fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 4 },
  pressed: { opacity: 0.6 },
});
