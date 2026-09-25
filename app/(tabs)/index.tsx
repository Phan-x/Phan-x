import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { Card, PhanLogo, IconButton, SectionTitle } from "@/components/phanx-ui";
import { PHANX, quickActions } from "@/constants/phanx";
import { formatAmount } from "@/constants/currencies";
import type { CurrencyCode } from "@/lib/_core/preferences";
import * as Preferences from "@/lib/_core/preferences";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useLiveMarkets } from "@/hooks/use-live-markets";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

const HIGHLIGHTS = [
  { title: "حماية متقدمة", sub: "تشفير كامل ومصادقة ثنائية لحسابك", icon: "verified-user" as const, tint: "#3B6EF5" },
];

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
          <PhanLogo />
          <View style={styles.headerActions}>
            <IconButton icon={refreshing ? "hourglass-empty" : "refresh"} label="تحديث" onPress={handleRefresh}/>
            <IconButton icon="search" label="البحث" onPress={() => showNotice("ابحث عن أصل أو سوق")}/>
            <IconButton icon="notifications-none" label="الإشعارات" onPress={() => router.push("/notifications")} />
            <IconButton icon="account-circle" label="الحساب" onPress={() => router.push("/menu")} />
          </View>
        </View>

        <View style={styles.greetingRow}>
          <Pressable onPress={() => router.push("/transactions")} style={({ pressed }) => [styles.history, pressed && styles.pressed]}><MaterialIcons name="history" size={18} color={PHANX.green}/><Text style={styles.historyText}>السجل</Text></Pressable>
        </View>

        <Card style={styles.assetCard}>
          <View style={styles.assetTop}>
            <Text style={styles.cardLabel}>إجمالي الأصول (USDT)</Text>
            <Pressable onPress={() => setHidden(!hidden)} style={({ pressed }) => [styles.eyeBtn, pressed && styles.pressed]}>
              <MaterialIcons name={hidden ? "visibility-off" : "visibility"} size={17} color={PHANX.white}/>
            </Pressable>
          </View>
          <Text style={styles.assetValue}>{hidden ? "••••••" : total}</Text>
          <View style={styles.assetBottom}>
            <View style={styles.assetPill}><MaterialIcons name="trending-up" size={14} color={PHANX.white}/><Text style={styles.assetPillText}>متاح للتداول</Text></View>
            <View style={styles.assetPill}><MaterialIcons name="lock" size={13} color={PHANX.white}/><Text style={styles.assetPillText}>محفوظ بأمان</Text></View>
          </View>
          <View style={styles.assetGlowOne}/><View style={styles.assetGlowTwo}/>
        </Card>

        <View style={styles.quickGrid}>
          {quickActions.map((action, index) => (
            <Pressable key={action.label} onPress={() => router.push(action.route as never)} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
              <View style={[styles.quickIcon, index === 0 && styles.quickIconPrimary]}>
                <MaterialIcons name={action.icon} size={21} color={index === 0 ? PHANX.white : PHANX.green}/>
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle title="ابدأ مع Phan-x" action="عرض الكل" onAction={() => router.push("/menu")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightScroll} contentContainerStyle={styles.highlightRow}>
          {HIGHLIGHTS.map((h) => (
            <View key={h.title} style={styles.highlightCard}>
              <View style={[styles.highlightIcon, { backgroundColor: h.tint }]}><MaterialIcons name={h.icon} size={18} color={PHANX.white}/></View>
              <Text style={styles.highlightTitle}>{h.title}</Text>
              <Text style={styles.highlightSub}>{h.sub}</Text>
            </View>
          ))}
          <Pressable onPress={() => router.push("/receive")} style={styles.highlightCard}>
            <View style={[styles.highlightIcon, { backgroundColor: PHANX.greenSoft }]}><MaterialIcons name="call-received" size={18} color={PHANX.green}/></View>
            <Text style={styles.highlightTitle}>استقبل عملة</Text>
            <Text style={styles.highlightSub}>أضف أول أصل لمحفظتك</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/trade")} style={styles.highlightCard}>
            <View style={[styles.highlightIcon, { backgroundColor: "#FFF3DD" }]}><MaterialIcons name="swap-horizontal-circle" size={18} color={PHANX.gold}/></View>
            <Text style={styles.highlightTitle}>جرّب التبديل</Text>
            <Text style={styles.highlightSub}>بدّل أصولك بسهولة</Text>
          </Pressable>
        </ScrollView>

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
      {notice ? <View style={styles.toast}><MaterialIcons name="info-outline" size={18} color={PHANX.white}/><Text style={styles.toastText}>{notice}</Text></View> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  headerActions: { flexDirection: "row", gap: 8 },
  greetingRow: { flexDirection: "row", justifyContent: "flex-start", alignItems: "flex-end", marginBottom: 14 },
  eyebrow: { color: PHANX.muted, fontSize: 13, marginBottom: 4, textAlign: "right" },
  welcome: { color: PHANX.ink, fontSize: 18, fontWeight: "800", textAlign: "right" },
  history: { flexDirection: "row", alignItems: "center", gap: 5, padding: 8 },
  historyText: { color: PHANX.green, fontWeight: "700", fontSize: 12 },

  assetCard: { backgroundColor: PHANX.green, borderColor: PHANX.green, minHeight: 168, overflow: "hidden", marginBottom: 20, borderRadius: 26, padding: 20 },
  assetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { color: "#C6EBD7", fontSize: 13, fontWeight: "700" },
  eyeBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  assetValue: { color: PHANX.white, fontSize: 38, fontWeight: "900", letterSpacing: -1, marginTop: 12, marginBottom: 16, textAlign: "right" },
  assetBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  assetPill: { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "rgba(255,255,255,.18)", paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999 },
  assetPillText: { color: PHANX.white, fontWeight: "700", fontSize: 11.5 },
  assetGlowOne: { position: "absolute", width: 180, height: 180, borderRadius: 100, backgroundColor: "rgba(255,255,255,.06)", right: -74, top: -100 },
  assetGlowTwo: { position: "absolute", width: 110, height: 110, borderRadius: 80, backgroundColor: "rgba(255,255,255,.05)", right: 44, bottom: -70 },

  quickGrid: { flexDirection: "row", justifyContent: "space-evenly", marginBottom: 22 },
  quickItem: { alignItems: "center", width: 78 },
  quickIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: PHANX.white, borderWidth: 1, borderColor: PHANX.line, justifyContent: "center", alignItems: "center", marginBottom: 7 },
  quickIconPrimary: { backgroundColor: PHANX.green, borderColor: PHANX.green, shadowColor: PHANX.green, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  quickLabel: { color: PHANX.ink, fontSize: 11, fontWeight: "700", textAlign: "center" },

  promo: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: PHANX.greenSoft, padding: 14, borderRadius: 18, marginBottom: 24 },
  promoIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: PHANX.gold, justifyContent: "center", alignItems: "center" },
  promoCopy: { flex: 1 },
  promoTitle: { color: PHANX.ink, fontSize: 13.5, fontWeight: "800", textAlign: "right" },
  promoSubtitle: { color: PHANX.muted, fontSize: 11, marginTop: 4, textAlign: "right" },

  highlightScroll: { marginBottom: 26 },
  highlightRow: { gap: 12, paddingRight: 2 },
  highlightCard: { width: 148, borderRadius: 18, padding: 15, backgroundColor: PHANX.white, borderWidth: 1, borderColor: PHANX.line, justifyContent: "space-between", minHeight: 108 },
  highlightIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  highlightTitle: { fontSize: 12.5, color: PHANX.ink, fontWeight: "800", textAlign: "right" },
  highlightSub: { color: PHANX.muted, fontSize: 10, marginTop: 5, lineHeight: 14, textAlign: "right" },

  marketCard: { paddingVertical: 3 }, marketRow: { minHeight: 65, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }, marketBorder: { borderBottomWidth: 1, borderBottomColor: PHANX.line }, marketIcon: { width: 33, height: 33, borderRadius: 16 }, marketName: { flex: 1 }, marketSymbol: { color: PHANX.ink, fontWeight: "800", fontSize: 12 }, marketMeta: { color: PHANX.muted, fontSize: 10, marginTop: 2 }, marketPrice: { alignItems: "flex-end" }, priceText: { color: PHANX.ink, fontSize: 12, fontWeight: "800" }, positive: { color: PHANX.green, fontSize: 11, fontWeight: "700", marginTop: 3 }, negative: { color: "#D95C55", fontSize: 11, fontWeight: "700", marginTop: 3 }, marketLoading: { color: PHANX.muted, fontSize: 12, textAlign: "center", paddingVertical: 24 }, pressed: { opacity: 0.62 }, toast: { position: "absolute", left: 22, right: 22, bottom: 14, borderRadius: 14, backgroundColor: PHANX.ink, padding: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, toastText: { color: PHANX.white, fontSize: 12, fontWeight: "700" },
});
