import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Polyline } from "react-native-svg";
import { ScreenContainer } from "@/components/screen-container";
import { formatAmount } from "@/constants/currencies";
import type { CurrencyCode } from "@/lib/_core/preferences";
import * as Preferences from "@/lib/_core/preferences";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMarkets } from "@/hooks/use-live-markets";

// ألوان التصميم: أسود + أصفر (حسب المرجع)
const C = {
  bg: "#000000",
  card: "#1A1A1C",
  tile: "#1E1E20",
  border: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "#8A8A8E",
  yellow: "#FFE600",
  yellowDark: "#14120A",
  red: "#FF5C5C",
};

type IconName = keyof typeof MaterialIcons.glyphMap;

// شبكة الأيقونات (من اليمين إلى اليسار)
const GRID: { label: string; icon: IconName; route: string }[] = [
  { label: "سحب", icon: "north-east", route: "/send" },
  { label: "تحديث", icon: "sync", route: "refresh" },
  { label: "شراء / بيع", icon: "swap-horiz", route: "/trade" },
  { label: "استثمار", icon: "show-chart", route: "/trade" },
  { label: "المعاملات", icon: "receipt-long", route: "/transactions" },
  { label: "إحالة", icon: "person-add-alt-1", route: "/referral" },
  { label: "الأمان", icon: "security", route: "/settings" },
  { label: "أكثر", icon: "apps", route: "/menu" },
];

const TABS = [
  { key: "hot", label: "رائجة" },
  { key: "gainers", label: "الرابحون" },
  { key: "losers", label: "الخاسرون" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// رسم زخرفي (غير مرتبط ببيانات حقيقية)
const SPARK = "0,46 8,40 14,44 20,30 26,36 32,24 38,32 44,18 50,26 56,14 62,22 70,10 78,16 86,4";

export default function HomeScreen() {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const { user } = useAuth();
  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user });
  const markets = useLiveMarkets();
  const contracts = trpc.trade.contracts.useQuery(undefined, { enabled: !!user });
  const available = Number(balances.data?.find((b: any) => b.currency === "USDT")?.amount ?? 0);
  const lockedAmt: number = (contracts.data || [])
    .filter((c: any) => c.status === "active")
    .reduce((sum: number, c: any) => sum + Number(c.principal || 0), 0);
  const usdt = available + lockedAmt; // الإجمالي = المتاح + المحجوز في العقود
  const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  useFocusEffect(useCallback(() => { Preferences.getCurrency().then(setCurrency); }, []));
  // عدّاد: كل مرة تفتح الرئيسية يبدأ الرصيد من الصفر ويصعد بسرعة إلى قيمته
  const [runKey, setRunKey] = useState(0);
  const [shown, setShown] = useState(0);
  useFocusEffect(useCallback(() => { setRunKey((k) => k + 1); }, []));
  useEffect(() => {
    if (!(usdt > 0)) { setShown(0); return; }
    const start = Date.now();
    const DURATION = 1600;
    let raf: any;
    setShown(0);
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p >= 1 ? usdt : usdt * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runKey, usdt]);
  const total = formatAmount(shown, currency);
  const usdtText = shown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [notice, setNotice] = useState("");
  const showNotice = (message: string) => { setNotice(message); setTimeout(() => setNotice(""), 2200); };
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([balances.refetch(), contracts.refetch(), markets.refetch()]);
      showNotice("تم تحديث البيانات");
    } catch {
      showNotice("تعذر التحديث، حاول مرة أخرى");
    } finally {
      setRefreshing(false);
    }
  };

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("hot");

  const rows = useMemo(() => {
    let list = [...(markets.data ?? [])];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => `${c.symbol} ${c.name}`.toLowerCase().includes(q));
    if (tab === "gainers") list = list.filter((c) => c.change24h > 0).sort((a, b) => b.change24h - a.change24h);
    if (tab === "losers") list = list.filter((c) => c.change24h < 0).sort((a, b) => a.change24h - b.change24h);
    return list;
  }, [markets.data, query, tab]);

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.yellow} colors={[C.yellow]} progressBackgroundColor={C.card} />}
        >
          {/* الهيدر: صورة + بحث + أيقونات */}
          <View style={styles.header}>
            <Pressable onPress={() => router.push("/menu")} style={styles.avatar}>
              <MaterialIcons name="person" size={22} color={C.yellowDark} />
            </Pressable>

            <View style={styles.search}>
              <MaterialIcons name="search" size={20} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث"
                placeholderTextColor={C.muted}
                style={[styles.searchInput, noOutline]}
                underlineColorAndroid="transparent"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <HeaderIcon icon="qr-code-scanner" onPress={() => router.push("/qr-scanner")} />
            <HeaderIcon icon="headset-mic" onPress={() => router.push("/support")} />
            <HeaderIcon icon="notifications-none" dot onPress={() => router.push("/notifications")} />
          </View>

          {/* إجمالي الأصول */}
          <View style={styles.totalBlock}>
            <View style={styles.totalLabelRow}>
              <Text style={styles.totalLabel}>إجمالي الأصول</Text>
              <Pressable onPress={() => setHidden(!hidden)} hitSlop={10}>
                <MaterialIcons name={hidden ? "visibility-off" : "visibility"} size={20} color={C.muted} />
              </Pressable>
            </View>

            <View style={styles.totalRow}>
              <View style={styles.amountWrap}>
                <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
                  {hidden ? "••••••" : usdtText}
                </Text>
                <View style={styles.unit}>
                  <Text style={styles.unitText}>USDT</Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={C.text} />
                </View>
              </View>

              <View style={styles.spark}>
                <Svg width={90} height={54} viewBox="0 0 90 54">
                  <Polyline points={SPARK} fill="none" stroke={C.yellow} strokeOpacity={0.25} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
                  <Polyline points={SPARK} fill="none" stroke={C.yellow} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                </Svg>
              </View>
            </View>

            <Text style={styles.subTotal}>{hidden ? "≈ ••••" : `≈ ${total}`}</Text>
            <Text style={styles.subTotal}>
              {hidden ? "المتاح ••••  ·  محجوز ••••" : `المتاح ${fmt2(available)}  ·  محجوز في العقود ${fmt2(lockedAmt)}`}
            </Text>
          </View>

          {/* زر الإيداع */}
          <Pressable onPress={() => router.push("/receive")} style={({ pressed }) => [styles.deposit, pressed && styles.pressed]}>
            <Text style={styles.depositText}>إيداع</Text>
          </Pressable>

          {/* شبكة الإجراءات */}
          <View style={styles.grid}>
            {GRID.map((g) => (
              <Pressable key={g.label} onPress={() => { if (g.route === "refresh") { setRunKey((k) => k + 1); handleRefresh(); } else router.push(g.route as never); }} style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}>
                <View style={styles.tile}>
                  <MaterialIcons name={g.icon} size={26} color={C.text} />
                </View>
                <Text style={styles.gridLabel} numberOfLines={1}>{g.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* بانر */}
          <Pressable onPress={() => router.push("/settings")} style={({ pressed }) => [styles.promo, pressed && styles.pressed]}>
            <View style={styles.promoIcon}>
              <MaterialIcons name="bolt" size={30} color={C.yellowDark} />
            </View>
            <View style={styles.promoCopy}>
              <Text style={styles.promoSub}>حماية أعلى لمحفظتك</Text>
              <Text style={styles.promoTitle}>أكمل إعداد محفظتك وفعّل المصادقة الثنائية</Text>
            </View>
            <MaterialIcons name="chevron-left" size={24} color={C.muted} />
          </Pressable>

          {/* الأسواق */}
          <View style={styles.marketCard}>
            <View style={styles.tabs}>
              {TABS.map((t) => (
                <Pressable key={t.key} onPress={() => setTab(t.key)} hitSlop={6}>
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {markets.loading ? (
              <Text style={styles.marketLoading}>جاري تحميل الأسعار...</Text>
            ) : markets.error ? (
              <Text style={styles.marketLoading}>{markets.error}</Text>
            ) : !markets.data || markets.data.length === 0 ? (
              <Text style={styles.marketLoading}>تعذر تحميل الأسعار حالياً، حاول لاحقاً.</Text>
            ) : rows.length === 0 ? (
              <Text style={styles.marketLoading}>لا توجد نتائج مطابقة.</Text>
            ) : (
              rows.map((coin) => {
                const up = coin.change24h >= 0;
                return (
                  <Pressable key={coin.id} onPress={() => router.push("/trade")} style={({ pressed }) => [styles.marketRow, pressed && styles.pressed]}>
                    <Image source={{ uri: coin.image }} style={styles.marketIcon} />
                    <View style={styles.marketName}>
                      <Text style={styles.marketSymbol}>{String(coin.symbol).toUpperCase()}USDT</Text>
                      <Text style={styles.marketMeta} numberOfLines={1}>{coin.name}</Text>
                    </View>
                    <Text style={styles.priceText}>{formatAmount(coin.price, currency)}</Text>
                    <View style={[styles.pill, up ? styles.pillUp : styles.pillDown]}>
                      <Text style={[styles.pillText, up ? styles.pillTextUp : styles.pillTextDown]}>
                        {up ? "+" : ""}{coin.change24h.toFixed(2)}%
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>

        {notice ? (
          <View style={styles.toast}>
            <MaterialIcons name="info-outline" size={18} color={C.text} />
            <Text style={styles.toastText}>{notice}</Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function HeaderIcon({ icon, onPress, dot }: { icon: IconName; onPress: () => void; dot?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={24} color={C.text} />
      {dot ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const noOutline: any = { outlineStyle: "none", outlineWidth: 0 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  pressed: { opacity: 0.65 },

  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.yellow, alignItems: "center", justifyContent: "center" },
  search: {
    flex: 1, height: 42, borderRadius: 21, backgroundColor: C.card, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, gap: 8, overflow: "hidden", minWidth: 0,
  },
  searchInput: { flex: 1, minWidth: 0, width: "100%", color: C.text, fontSize: 14, paddingVertical: 0, paddingHorizontal: 0, backgroundColor: "transparent", borderWidth: 0 },
  headerIcon: { width: 30, height: 40, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 8, right: 2, width: 9, height: 9, borderRadius: 5, backgroundColor: C.yellow },

  totalBlock: { marginTop: 22 },
  totalLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  totalLabel: { color: C.muted, fontSize: 14, fontWeight: "700" },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  amountWrap: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  totalValue: { color: C.text, fontSize: 40, fontWeight: "800", letterSpacing: -0.5, flexShrink: 1 },
  unit: { flexDirection: "row", alignItems: "center" },
  unitText: { color: C.text, fontSize: 15, fontWeight: "700" },
  spark: { marginLeft: 4 },
  subTotal: { color: C.muted, fontSize: 12, marginTop: 6, textAlign: "right" },

  deposit: { height: 54, borderRadius: 27, backgroundColor: C.yellow, alignItems: "center", justifyContent: "center", marginTop: 20 },
  depositText: { color: C.yellowDark, fontSize: 18, fontWeight: "900" },

  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 22, rowGap: 16 },
  gridItem: { width: "25%", alignItems: "center" },
  tile: {
    width: 62, height: 62, borderRadius: 18, backgroundColor: C.tile, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  gridLabel: { color: C.muted, fontSize: 11.5, fontWeight: "600", textAlign: "center" },

  promo: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 18,
    padding: 14, marginTop: 22,
  },
  promoIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.yellow, alignItems: "center", justifyContent: "center" },
  promoCopy: { flex: 1 },
  promoSub: { color: C.muted, fontSize: 11.5, textAlign: "right" },
  promoTitle: { color: C.text, fontSize: 14, fontWeight: "800", textAlign: "right", marginTop: 4, lineHeight: 20 },

  marketCard: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6, marginTop: 16 },
  tabs: { flexDirection: "row", gap: 22, marginBottom: 12 },
  tabText: { color: C.muted, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: C.text, fontWeight: "900" },
  marketRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  marketIcon: { width: 34, height: 34, borderRadius: 17 },
  marketName: { flex: 1 },
  marketSymbol: { color: C.text, fontWeight: "800", fontSize: 14, textAlign: "right" },
  marketMeta: { color: C.muted, fontSize: 10.5, marginTop: 2, textAlign: "right" },
  priceText: { color: C.text, fontSize: 14, fontWeight: "600" },
  pill: { minWidth: 72, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  pillUp: { backgroundColor: C.yellow },
  pillDown: { backgroundColor: "rgba(255,92,92,0.2)" },
  pillText: { fontSize: 13, fontWeight: "800" },
  pillTextUp: { color: C.yellowDark },
  pillTextDown: { color: C.red },
  marketLoading: { color: C.muted, fontSize: 12, textAlign: "center", paddingVertical: 24 },

  toast: {
    position: "absolute", left: 22, right: 22, bottom: 14, borderRadius: 14, backgroundColor: C.card,
    borderWidth: 1, borderColor: "rgba(255,230,0,0.4)", padding: 13, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  toastText: { color: C.text, fontSize: 12, fontWeight: "700" },
});
