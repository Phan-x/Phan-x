import { useMemo } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";

/* ---------- الألوان: غيّر P إلى LIGHT للحصول على النسخة الفاتحة ---------- */
const DARK = {
  bg: "#000000",
  card: "#1A1A1C",
  card2: "#232326",
  border: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "#8A8A8E",
  accent: "#FFE600",
  onAccent: "#14120A",
  accentSoft: "rgba(255,230,0,0.14)",
};
const LIGHT = {
  bg: "#FFFFFF",
  card: "#F6F6F9",
  card2: "#EDEEF2",
  border: "#E7E8EC",
  text: "#111214",
  muted: "#8A8F98",
  accent: "#F0B90B",
  onAccent: "#14120A",
  accentSoft: "rgba(240,185,11,0.16)",
};
const P = DARK;
const YELLOW = "#FFE600";

const TIERS = [
  { level: 1, rate: "10%", label: "المستوى الأول", desc: "من دعوتهم مباشرة", icon: "workspace-premium" as const },
  { level: 2, rate: "5%", label: "المستوى الثاني", desc: "من دعاهم أصدقاؤك", icon: "groups" as const },
  { level: 3, rate: "2.5%", label: "المستوى الثالث", desc: "الدائرة الثالثة", icon: "hub" as const },
];

const STEPS = [
  { icon: "share" as const, title: "شارك رابطك", desc: "أرسل كود الإحالة أو رابط الدعوة لأصدقائك." },
  { icon: "person-add-alt-1" as const, title: "يسجّل صديقك ويودع", desc: "عند أول إيداع تتم الموافقة عليه من الإدارة." },
  { icon: "payments" as const, title: "تصلك العمولة", desc: "تُضاف تلقائياً إلى رصيدك على 3 مستويات." },
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
    // رسالة واحدة فيها الرابط مرة واحدة فقط (لا نمرّر url منفصل حتى لا يتكرر)
    const text =
      `🎁 انضم إلي في CwaAX واستفد من مكافآت التسجيل!\n\n` +
      `✅ سجّل عبر رابط الدعوة الخاص بي وابدأ خلال دقائق\n` +
      `🔑 كود الدعوة: ${referralCode}\n\n` +
      `👇 اضغط للتسجيل الآن\n${referralLink}`;
    try {
      if (Platform.OS !== "web") {
        await Share.share({ message: text });
        return;
      }
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ text });
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return; // المستخدم أغلق نافذة المشاركة
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify("تم النسخ", "تم نسخ رسالة الدعوة، شاركها مع أصدقائك.");
    }
  };

  const totalReferred = stats.isLoading ? "…" : String(stats.data?.totalReferred ?? 0);
  const totalEarned = stats.isLoading ? "…" : (stats.data?.totalEarned ?? 0).toFixed(2);

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={styles.root}>
        {/* الهيدر */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
            <MaterialIcons name="chevron-right" size={30} color={P.text} />
          </Pressable>
          <Text style={styles.title}>الإحالة والمكافآت</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* البطاقة الرئيسية */}
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.gift}>
              <MaterialIcons name="card-giftcard" size={34} color={P.onAccent} />
            </View>
            <Text style={styles.heroTitle}>اربح مع شبكتك بالكامل</Text>
            <Text style={styles.heroSub}>عمولة تلقائية على كل إيداع يقوم به من دعوتهم — على 3 مستويات</Text>
          </View>

          {/* الإحصائيات */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="groups" size={22} color={P.accent} />
              <Text style={styles.statValue}>{totalReferred}</Text>
              <Text style={styles.statLabel}>إجمالي شبكتك</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="savings" size={22} color={P.accent} />
              <Text style={styles.statValue}>{totalEarned}</Text>
              <Text style={styles.statLabel}>USDT مكتسبة</Text>
            </View>
          </View>

          {/* كود الإحالة */}
          <View style={styles.codeCard}>
            <Text style={styles.cardLabel}>كود الإحالة الخاص بك</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>{stats.isLoading ? "…" : referralCode}</Text>
              <Pressable onPress={copyCode} hitSlop={8} style={({ pressed }) => [styles.copyChip, pressed && styles.pressed]}>
                <MaterialIcons name="content-copy" size={16} color={P.onAccent} />
                <Text style={styles.copyChipText}>نسخ</Text>
              </Pressable>
            </View>
            <Pressable onPress={shareLink} style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}>
              <MaterialIcons name="share" size={20} color="#14120A" />
              <Text style={styles.shareBtnText}>مشاركة رابط الدعوة</Text>
            </Pressable>
          </View>

          {/* نظام العمولة */}
          <Text style={styles.section}>نظام العمولة — 3 مستويات</Text>
          {TIERS.map((tier, i) => {
            const count = stats.data?.levelCounts?.[i] ?? 0;
            const earned = stats.data?.levelEarnings?.[i] ?? 0;
            return (
              <View key={tier.level} style={styles.tierCard}>
                <View style={styles.tierRate}>
                  <Text style={styles.tierRateText}>{tier.rate}</Text>
                </View>
                <View style={styles.tierBody}>
                  <View style={styles.tierTitleRow}>
                    <View style={styles.tierNum}>
                      <Text style={styles.tierNumText}>{tier.level}</Text>
                    </View>
                    <Text style={styles.tierLabel}>{tier.label}</Text>
                  </View>
                  <Text style={styles.tierDesc}>{tier.desc}</Text>
                </View>
                <View style={styles.tierStats}>
                  <Text style={styles.tierEarned}>+{earned.toFixed(2)} USDT</Text>
                  <Text style={styles.tierCount}>{count} شخص</Text>
                </View>
              </View>
            );
          })}

          {/* كيف تعمل */}
          <Text style={styles.section}>كيف تعمل الإحالة؟</Text>
          <View style={styles.stepsCard}>
            {STEPS.map((s, i) => (
              <View key={s.title} style={[styles.stepRow, i > 0 && styles.stepBorder]}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name={s.icon} size={22} color={P.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* السجل */}
          <Text style={styles.section}>سجل المكافآت</Text>
          <View style={styles.historyCard}>
            {stats.isLoading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color={P.accent} />
              </View>
            ) : !stats.data?.history?.length ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="inbox" size={30} color={P.muted} />
                <Text style={styles.emptyText}>لا توجد مكافآت بعد. شارك رابطك لتبدأ الربح.</Text>
              </View>
            ) : (
              stats.data.history.map((row: any, idx: number) => (
                <View key={row.id} style={[styles.rewardRow, idx > 0 && styles.rewardBorder]}>
                  <View style={styles.rewardIcon}>
                    <Text style={styles.rewardLevel}>L{row.level}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rewardName}>عمولة من {row.sourceName || row.sourceUsername || "مستخدم"}</Text>
                    <Text style={styles.rewardMeta}>{new Date(row.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.rewardAmount}>+ {Number(row.commission).toFixed(2)} {row.currency}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.noteRow}>
            <MaterialIcons name="info-outline" size={16} color={P.muted} />
            <Text style={styles.note}>
              تُضاف عمولتك تلقائياً إلى رصيدك بمجرد موافقة الإدارة على إيداع أي شخص في شبكتك، ولا حاجة لأي إجراء إضافي منك.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  pressed: { opacity: 0.65 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: P.text, fontSize: 19, fontWeight: "800" },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  hero: { backgroundColor: P.card, borderRadius: 26, borderWidth: 1, borderColor: P.border, alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, overflow: "hidden" },
  heroGlow: { position: "absolute", top: -70, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,230,0,0.10)" },
  gift: { width: 68, height: 68, borderRadius: 34, backgroundColor: YELLOW, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroTitle: { color: P.text, fontSize: 21, fontWeight: "900", textAlign: "center" },
  heroSub: { color: P.muted, fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 8, paddingHorizontal: 8 },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: P.card, borderRadius: 20, borderWidth: 1, borderColor: P.border, alignItems: "center", paddingVertical: 18, gap: 6 },
  statValue: { color: P.text, fontSize: 26, fontWeight: "900" },
  statLabel: { color: P.muted, fontSize: 12 },

  codeCard: { backgroundColor: P.card, borderRadius: 22, borderWidth: 1, borderColor: P.border, padding: 16, marginTop: 14 },
  cardLabel: { color: P.muted, fontSize: 13, textAlign: "right", marginBottom: 12 },
  codeBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: P.bg === "#000000" ? "#0E0E10" : "#FFFFFF",
    borderRadius: 14, borderWidth: 1, borderColor: P.border, height: 58, paddingHorizontal: 14,
  },
  codeText: { color: P.text, fontSize: 19, fontWeight: "900", letterSpacing: 1.5 },
  copyChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: YELLOW, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  copyChipText: { color: "#14120A", fontSize: 12.5, fontWeight: "800" },
  shareBtn: { height: 54, borderRadius: 27, backgroundColor: YELLOW, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 },
  shareBtnText: { color: "#14120A", fontSize: 16, fontWeight: "900" },

  section: { color: P.text, fontSize: 16, fontWeight: "800", textAlign: "right", marginTop: 26, marginBottom: 12 },

  tierCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: P.card, borderRadius: 18, borderWidth: 1, borderColor: P.border, padding: 14, marginBottom: 10 },
  tierRate: { minWidth: 72, height: 46, borderRadius: 14, backgroundColor: YELLOW, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  tierRateText: { color: "#14120A", fontSize: 19, fontWeight: "900" },
  tierBody: { flex: 1 },
  tierTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: P.card2, alignItems: "center", justifyContent: "center" },
  tierNumText: { color: P.text, fontSize: 12, fontWeight: "900" },
  tierLabel: { color: P.text, fontSize: 15, fontWeight: "800" },
  tierDesc: { color: P.muted, fontSize: 12, marginTop: 5, textAlign: "right" },
  tierStats: { alignItems: "flex-start" },
  tierEarned: { color: P.accent, fontSize: 13, fontWeight: "900" },
  tierCount: { color: P.muted, fontSize: 11.5, marginTop: 4 },

  stepsCard: { backgroundColor: P.card, borderRadius: 20, borderWidth: 1, borderColor: P.border, paddingHorizontal: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  stepBorder: { borderTopWidth: 1, borderTopColor: P.border },
  stepIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: P.accentSoft, alignItems: "center", justifyContent: "center" },
  stepTitle: { color: P.text, fontSize: 14.5, fontWeight: "800", textAlign: "right" },
  stepDesc: { color: P.muted, fontSize: 12, lineHeight: 18, marginTop: 3, textAlign: "right" },

  historyCard: { backgroundColor: P.card, borderRadius: 20, borderWidth: 1, borderColor: P.border, paddingHorizontal: 14 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 10 },
  emptyText: { color: P.muted, fontSize: 12.5, textAlign: "center" },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  rewardBorder: { borderTopWidth: 1, borderTopColor: P.border },
  rewardIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: P.accentSoft, alignItems: "center", justifyContent: "center" },
  rewardLevel: { color: P.accent, fontSize: 13, fontWeight: "900" },
  rewardName: { color: P.text, fontSize: 13.5, fontWeight: "700", textAlign: "right" },
  rewardMeta: { color: P.muted, fontSize: 11, marginTop: 4, textAlign: "right" },
  rewardAmount: { color: P.accent, fontSize: 13, fontWeight: "900" },

  noteRow: { flexDirection: "row", gap: 8, marginTop: 20, paddingHorizontal: 2 },
  note: { flex: 1, color: P.muted, fontSize: 11.5, lineHeight: 18, textAlign: "right" },
});
