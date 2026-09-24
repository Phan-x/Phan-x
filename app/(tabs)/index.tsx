import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { Card, CwaLogo, IconButton, SectionTitle } from "@/components/cwaax-ui";
import { CWAAX, quickActions } from "@/constants/cwaax";
import { formatAmount } from "@/constants/currencies";
import type { CurrencyCode } from "@/lib/_core/preferences";
import * as Preferences from "@/lib/_core/preferences";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMarkets } from "@/hooks/use-live-markets";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function HomeScreen() {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const { user } = useAuth();
  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user });
  const markets = useLiveMarkets();
  const usdt = Number(balances.data?.find((b:any) => b.currency === "USDT")?.amount ?? 0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  useFocusEffect(useCallback(() => { Preferences.getCurrency().then(setCurrency); }, []));
  const total = formatAmount(usdt, currency);
  const [notice, setNotice] = useState("");
  const showNotice = (message: string) => { setNotice(message); setTimeout(() => setNotice(""), 2200); };
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([balances.refetch(), markets.refetch()]);
      showNotice("تم تحديث البيانات");
    } catch {
      showNotice("تعذر التحديث، حاول مرة أخرى");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <CwaLogo />
          <View style={styles.headerActions}>
            <IconButton icon={refreshing ? "hourglass-empty" : "refresh"} label="تحديث" onPress={handleRefresh}/>
            <IconButton icon="search" label="البحث" onPress={() => showNotice("ابحث عن أصل أو سوق")}/>
            <IconButton icon="notifications-none" label="الإشعارات" onPress={() => router.push("/notifications")} />
            <IconButton icon="account-circle" label="الحساب" onPress={() => router.push("/menu")} />
          </View>
        </View>

        <View style={styles.greetingRow}>
          <View><Text style={styles.welcome}>إليك نظرة سريعة على محفظتك</Text></View>
          <Pressable onPress={() => router.push("/transactions")} style={({ pressed }) => [styles.history, pressed && styles.pressed]}><MaterialIcons name="history" size={18} color={CWAAX.green}/><Text style={styles.historyText}>السجل</Text></Pressable>
        </View>

        <Card style={styles.assetCard}>
          <View style={styles.assetTop}><Text style={styles.cardLabel}>إجمالي الأصول</Text><Pressable onPress={() => setHidden(!hidden)} style={({ pressed }) => [pressed && styles.pressed]}><MaterialIcons name={hidden ? "visibility-off" : "visibility"} size={20} color={CWAAX.white}/></Pressable></View>
          <Text style={styles.assetValue}>{hidden ? "••••••" : total}</Text>
          <View style={styles.assetBottom}><View style={styles.changeBadge}><MaterialIcons name="trending-up" size={15} color={CWAAX.white}/><Text style={styles.changeText}>متاح</Text></View><Text style={styles.assetSub}>رصيد USDT</Text></View>
          <View style={styles.assetGlowOne}/><View style={styles.assetGlowTwo}/>
        </Card>

        <View style={styles.quickGrid}>{quickActions.map((action) => <Pressable key={action.label} onPress={() => router.push(action.route as never)} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}><View style={styles.quickIcon}><MaterialIcons name={action.icon} size={21} color={CWAAX.green}/></View><Text style={styles.quickLabel}>{action.label}</Text></Pressable>)}</View>

        <Pressable onPress={() => router.push("/settings")} style={({ pressed }) => [styles.promo, pressed && styles.pressed]}><View style={styles.promoIcon}><MaterialIcons name="bolt" size={24} color={CWAAX.gold}/></View><View style={styles.promoCopy}><Text style={styles.promoTitle}>أكمل إعداد محفظتك</Text><Text style={styles.promoSubtitle}>فعّل المصادقة الثنائية لتحصل على حماية أعلى</Text></View><MaterialIcons name="chevron-left" size={22} color={CWAAX.ink}/></Pressable>

        <SectionTitle title="ابدأ مع CwaAX" action="عرض الكل" onAction={() => router.push("/menu")} />
        <View style={styles.startRow}><Card style={styles.startCard} onPress={() => router.push("/receive")}><View style={[styles.startIcon, { backgroundColor: "#E9F7EF" }]}><MaterialIcons name="call-received" size={21} color={CWAAX.green}/></View><Text style={styles.startTitle}>استقبل عملة</Text><Text style={styles.startSub}>أضف أول أصل لمحفظتك</Text></Card><Card style={styles.startCard} onPress={() => router.push("/trade")}><View style={[styles.startIcon, { backgroundColor: "#FFF3DD" }]}><MaterialIcons name="swap-horizontal-circle" size={21} color={CWAAX.gold}/></View><Text style={styles.startTitle}>جرّب التبديل</Text><Text style={styles.startSub}>بدّل أصولك بسهولة</Text></Card></View>

        <SectionTitle title="الأسواق" action="كل الأسواق" onAction={() => router.push("/trade")} />
        <Card style={styles.marketCard}>
          {markets.loading ? (
            <Text style={styles.marketLoading}>جاري تحميل الأسعار...</Text>
          ) : markets.error ? (
            <Text style={styles.marketLoading}>{markets.error}</Text>
          ) : !markets.data || markets.data.length === 0 ? (
            <Text style={styles.marketLoading}>تعذر تحميل الأسعار حالياً، حاول لاحقاً.</Text>
          ) : (
            markets.data.map((coin, index) => (
              <Pressable
                key={coin.id}
                onPress={() => router.push("/trade")}
                style={({ pressed }) => [styles.marketRow, index < markets.data!.length - 1 && styles.marketBorder, pressed && styles.pressed]}
              >
                <Image source={{ uri: coin.image }} style={styles.marketIcon} />
                <View style={styles.marketName}>
                  <Text style={styles.marketSymbol}>{coin.symbol}/USDT</Text>
                  <Text style={styles.marketMeta} numberOfLines={1}>{coin.name}</Text>
                </View>
                <View style={styles.marketPrice}>
                  <Text style={styles.priceText}>{formatAmount(coin.price, currency)}</Text>
                  <Text style={coin.change24h >= 0 ? styles.positive : styles.negative}>
                    {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
      {notice ? <View style={styles.toast}><MaterialIcons name="info-outline" size={18} color={CWAAX.white}/><Text style={styles.toastText}>{notice}</Text></View> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerActions: { flexDirection: "row", gap: 8 },
  greetingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 },
  eyebrow: { color: CWAAX.muted, fontSize: 13, marginBottom: 4, textAlign: "right" },
  welcome: { color: CWAAX.ink, fontSize: 18, fontWeight: "800", textAlign: "right" },
  history: { flexDirection: "row", alignItems: "center", gap: 5, padding: 8 },
  historyText: { color: CWAAX.green, fontWeight: "700", fontSize: 12 },
  assetCard: { backgroundColor: CWAAX.green, borderColor: CWAAX.green, minHeight: 158, overflow: "hidden", marginBottom: 20 },
  assetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { color: "#C6EBD7", fontSize: 13, fontWeight: "700" },
  assetValue: { color: CWAAX.white, fontSize: 34, fontWeight: "900", letterSpacing: -1, marginTop: 14, textAlign: "right" },
  assetBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  changeBadge: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "rgba(255,255,255,.17)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  changeText: { color: CWAAX.white, fontWeight: "800", fontSize: 12 }, assetSub: { color: "#B4E2C9", fontSize: 12, fontWeight: "600" },
  assetGlowOne: { position: "absolute", width: 160, height: 160, borderRadius: 100, borderWidth: 22, borderColor: "rgba(255,255,255,.08)", right: -64, top: -90 },
  assetGlowTwo: { position: "absolute", width: 100, height: 100, borderRadius: 80, borderWidth: 14, borderColor: "rgba(255,255,255,.08)", right: 54, bottom: -76 },
  quickGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  quickItem: { alignItems: "center", width: "19%" }, quickIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: CWAAX.greenSoft, justifyContent: "center", alignItems: "center", marginBottom: 7 }, quickLabel: { color: CWAAX.ink, fontSize: 11, fontWeight: "700", textAlign: "center" },
  promo: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#FFF9EC", padding: 13, borderRadius: 17, marginBottom: 24, borderWidth: 1, borderColor: "#F8E6BA" }, promoIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FFF1CC", justifyContent: "center", alignItems: "center" }, promoCopy: { flex: 1 }, promoTitle: { color: CWAAX.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, promoSubtitle: { color: CWAAX.muted, fontSize: 11, marginTop: 4, textAlign: "right" },
  startRow: { flexDirection: "row", gap: 10, marginBottom: 25 }, startCard: { flex: 1, borderRadius: 18, padding: 14 }, startIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 }, startTitle: { fontSize: 13, color: CWAAX.ink, fontWeight: "800", textAlign: "right" }, startSub: { color: CWAAX.muted, fontSize: 10, marginTop: 5, lineHeight: 15, textAlign: "right" },
  marketCard: { paddingVertical: 3 }, marketRow: { minHeight: 65, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }, marketBorder: { borderBottomWidth: 1, borderBottomColor: CWAAX.line }, marketIcon: { width: 33, height: 33, borderRadius: 16 }, marketName: { flex: 1 }, marketSymbol: { color: CWAAX.ink, fontWeight: "800", fontSize: 12 }, marketMeta: { color: CWAAX.muted, fontSize: 10, marginTop: 2 }, marketPrice: { alignItems: "flex-end" }, priceText: { color: CWAAX.ink, fontSize: 12, fontWeight: "800" }, positive: { color: CWAAX.green, fontSize: 11, fontWeight: "700", marginTop: 3 }, negative: { color: "#D95C55", fontSize: 11, fontWeight: "700", marginTop: 3 }, marketLoading: { color: CWAAX.muted, fontSize: 12, textAlign: "center", paddingVertical: 24 }, pressed: { opacity: 0.62 }, toast: { position: "absolute", left: 22, right: 22, bottom: 14, borderRadius: 14, backgroundColor: CWAAX.ink, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, toastText: { color: CWAAX.white, fontSize: 12, fontWeight: "700" },
});
