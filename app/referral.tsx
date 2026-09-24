import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";

const TIERS = [
  { level: 1, rate: "10%", color: CWAAX.green, bg: CWAAX.greenSoft, icon: "person" as const, label: "المستوى الأول", desc: "من دعوتهم مباشرة" },
  { level: 2, rate: "5%", color: CWAAX.gold, bg: "#FBF2E1", icon: "people" as const, label: "المستوى الثاني", desc: "من دعاهم أصدقاؤك" },
  { level: 3, rate: "2.5%", color: CWAAX.purple, bg: "#EEECFB", icon: "hub" as const, label: "المستوى الثالث", desc: "الدائرة الثالثة" },
];

export default function ReferralScreen() {
  const router = useRouter();
  const stats = trpc.wallet.referralStats.useQuery();

  const referralCode = stats.data?.referralCode ?? "—";
  const referralLink = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/register?ref=${referralCode}` : referralCode),
    [referralCode],
  );

  const copyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
      notify("تم النسخ", "تم نسخ كود الإحالة إلى الحافظة.");
    } else {
      notify("كود الإحالة", referralCode);
    }
  };

  const shareLink = async () => {
    const text = `انضم إلى CwaAX عبر كود الإحالة الخاص بي واحصل على مكافآت: ${referralCode}\n${referralLink}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "CwaAX", text, url: referralLink });
        return;
      } catch {
        // fall through to copy
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify("تم النسخ", "تم نسخ رابط الإحالة، شاركه مع أصدقائك.");
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <Text style={styles.title}>الإحالة والمكافآت</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.gift}>
            <MaterialIcons name="card-giftcard" size={30} color={CWAAX.white} />
          </View>
          <Text style={styles.heroTitle}>اربح مع شبكتك بالكامل</Text>
          <Text style={styles.heroSub}>عمولة تلقائية على كل إيداع يقوم به من دعوتهم — على 3 مستويات</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.isLoading ? "…" : stats.data?.totalReferred ?? 0}</Text>
              <Text style={styles.heroStatLabel}>إجمالي شبكتك</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.isLoading ? "…" : (stats.data?.totalEarned ?? 0).toFixed(2)}</Text>
              <Text style={styles.heroStatLabel}>USDT مكتسبة</Text>
            </View>
          </View>
        </View>

        {/* Referral code */}
        <Text style={styles.label}>كود الإحالة الخاص بك</Text>
        <View style={styles.code}>
          <Text style={styles.codeText}>{stats.isLoading ? "…" : referralCode}</Text>
          <Pressable onPress={copyCode} hitSlop={8}>
            <MaterialIcons name="content-copy" size={19} color={CWAAX.green} />
          </Pressable>
        </View>
        <Pressable onPress={shareLink} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <MaterialIcons name="share" size={18} color={CWAAX.white} />
          <Text style={styles.buttonText}>مشاركة رابط الدعوة</Text>
        </Pressable>

        {/* Tiers */}
        <Text style={styles.section}>نظام العمولة — 3 مستويات</Text>
        <View style={styles.tiers}>
          {TIERS.map((tier, i) => {
            const count = stats.data?.levelCounts?.[i] ?? 0;
            const earned = stats.data?.levelEarnings?.[i] ?? 0;
            return (
              <View key={tier.level} style={[styles.tierCard, { backgroundColor: tier.bg }]}>
                <View style={[styles.tierIcon, { backgroundColor: tier.color }]}>
                  <MaterialIcons name={tier.icon} size={18} color={CWAAX.white} />
                </View>
                <Text style={[styles.tierRate, { color: tier.color }]}>{tier.rate}</Text>
                <Text style={styles.tierLabel}>{tier.label}</Text>
                <Text style={styles.tierDesc}>{tier.desc}</Text>
                <View style={styles.tierFooter}>
                  <Text style={styles.tierCount}>{count} شخص</Text>
                  <Text style={[styles.tierEarned, { color: tier.color }]}>+{earned.toFixed(2)} USDT</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Card style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={16} color={CWAAX.muted} />
          <Text style={styles.infoText}>تُضاف عمولتك تلقائيًا لرصيدك بمجرد موافقة الإدارة على إيداع أي شخص في شبكتك — لا حاجة لأي إجراء إضافي منك.</Text>
        </Card>

        {/* History */}
        <Text style={styles.section}>سجل المكافآت</Text>
        <Card>
          {stats.isLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={CWAAX.green} />
            </View>
          ) : !stats.data?.history?.length ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="inbox" size={26} color={CWAAX.line} />
              <Text style={styles.emptyText}>لا توجد مكافآت بعد. شارك رابطك لتبدأ الربح.</Text>
            </View>
          ) : (
            stats.data.history.map((row: any, idx: number) => (
              <View key={row.id} style={[styles.rewardRow, idx > 0 && styles.rewardRowBorder]}>
                <View style={[styles.rewardIcon, { backgroundColor: TIERS[row.level - 1]?.bg ?? CWAAX.greenSoft }]}>
                  <Text style={[styles.rewardLevel, { color: TIERS[row.level - 1]?.color ?? CWAAX.green }]}>L{row.level}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rewardName}>عمولة من {row.sourceName || row.sourceUsername || "مستخدم"}</Text>
                  <Text style={styles.rewardMeta}>{new Date(row.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.rewardAmount}>+ {Number(row.commission).toFixed(2)} {row.currency}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { color: CWAAX.ink, fontSize: 19, fontWeight: "900" },

  hero: { alignItems: "center", backgroundColor: CWAAX.ink, borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, overflow: "hidden" },
  heroGlow: { position: "absolute", top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(11,135,84,0.35)" },
  gift: { width: 58, height: 58, borderRadius: 20, backgroundColor: CWAAX.green, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { color: CWAAX.white, fontSize: 19, fontWeight: "900", textAlign: "center" },
  heroSub: { color: "#AABBB1", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18, paddingHorizontal: 10 },
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: 22, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, paddingVertical: 14, width: "100%", justifyContent: "space-around" },
  heroStat: { alignItems: "center" },
  heroStatValue: { color: CWAAX.white, fontSize: 22, fontWeight: "900" },
  heroStatLabel: { color: "#AABBB1", fontSize: 10, marginTop: 5 },
  heroDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.15)" },

  label: { color: CWAAX.ink, fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 24, marginBottom: 8 },
  code: { height: 52, borderWidth: 1.5, borderColor: CWAAX.green, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: CWAAX.greenSoft },
  codeText: { color: CWAAX.ink, fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  button: { height: 50, borderRadius: 14, backgroundColor: CWAAX.green, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 11 },
  buttonText: { color: CWAAX.white, fontSize: 13, fontWeight: "900" },

  section: { color: CWAAX.muted, fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 26, marginBottom: 10 },
  tiers: { flexDirection: "row", gap: 10 },
  tierCard: { flex: 1, borderRadius: 18, padding: 12, alignItems: "center" },
  tierIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  tierRate: { fontSize: 20, fontWeight: "900" },
  tierLabel: { color: CWAAX.ink, fontSize: 11, fontWeight: "800", marginTop: 4, textAlign: "center" },
  tierDesc: { color: CWAAX.muted, fontSize: 9, marginTop: 2, textAlign: "center" },
  tierFooter: { marginTop: 10, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", paddingTop: 8, width: "100%" },
  tierCount: { color: CWAAX.muted, fontSize: 9 },
  tierEarned: { fontSize: 11, fontWeight: "900", marginTop: 2 },

  infoCard: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, marginTop: 16, backgroundColor: CWAAX.surface },
  infoText: { flex: 1, color: CWAAX.muted, fontSize: 10.5, lineHeight: 16, textAlign: "right" },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 8 },
  emptyText: { color: CWAAX.muted, fontSize: 11, textAlign: "center" },

  rewardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  rewardRowBorder: { borderTopWidth: 1, borderTopColor: CWAAX.line },
  rewardIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rewardLevel: { fontSize: 12, fontWeight: "900" },
  rewardName: { color: CWAAX.ink, fontSize: 12, fontWeight: "800", textAlign: "right" },
  rewardMeta: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  rewardAmount: { color: CWAAX.green, fontSize: 11, fontWeight: "900" },

  pressed: { opacity: 0.62 },
});
