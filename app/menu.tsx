import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { confirmAsync, notify } from "@/lib/_core/native-alert";
import { useAuth } from "@/hooks/use-auth";

/* ---------- الألوان: غيّر P إلى LIGHT للحصول على النسخة الفاتحة ---------- */
const DARK = {
  bg: "#000000",
  card: "#1A1A1C",
  sheet: "#141416",
  border: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "#8A8A8E",
  accent: "#FFE600",
  onAccent: "#14120A",
  pill: "#232326",
  danger: "#FF5C5C",
};
const LIGHT = {
  bg: "#FFFFFF",
  card: "#F6F6F9",
  sheet: "#FFFFFF",
  border: "#EAEBEF",
  text: "#111214",
  muted: "#8A8F98",
  accent: "#F0B90B",
  onAccent: "#14120A",
  pill: "#F1F2F5",
  danger: "#E5484D",
};
const P = DARK;

type IconName = keyof typeof MaterialIcons.glyphMap;
type Item = { label: string; icon: IconName; route: string; badge?: string };

const GROUPS: Item[][] = [
  [
    { label: "الإشعارات", icon: "notifications-none", route: "/notifications" },
    { label: "الإعدادات", icon: "settings", route: "/settings" },
    { label: "تأكيد الهوية", icon: "verified-user", route: "/verify-identity" },
  ],
  [
    { label: "العقود الآجلة", icon: "show-chart", route: "/(tabs)/trade" },
    { label: "معركة السوق", icon: "flash-on", route: "/(tabs)/trade" },
    { label: "تجارة الاتجاه", icon: "insights", route: "/(tabs)/trade" },
  ],
  [
    { label: "الإحالة والمكافآت", icon: "card-giftcard", route: "/referral" },
    { label: "المساعدة والدعم", icon: "support-agent", route: "/support" },
  ],
];

const LANGUAGES = ["العربية", "English", "Русский"];

export default function MenuScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(true);
  const [language, setLanguage] = useState("العربية");
  const [languageOpen, setLanguageOpen] = useState(false);

  const isAdmin = ["admin", "owner", "superadmin", "administrator"].includes(
    String(user?.role ?? "").toLowerCase().trim(),
  );

  const email = user?.email || user?.username || user?.name || "المستخدم";
  const uid = user?.id ?? "—";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const copyUid = () => {
    const text = String(uid);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      notify("تم النسخ", "تم نسخ رقم الحساب (UID).");
    } else {
      notify("UID", text);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmAsync("تسجيل الخروج", "هل تريد تسجيل الخروج من CwaAX؟", "تسجيل الخروج");
    if (confirmed) {
      await logout();
      router.replace("/login");
    }
  };

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={styles.root}>
        {/* الشريط العلوي */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <MaterialIcons name="chevron-right" size={30} color={P.text} />
          </Pressable>
          <View style={styles.topLeft}>
            <Pressable onPress={() => setLanguageOpen(true)} hitSlop={8} style={styles.langBtn}>
              <MaterialIcons name="arrow-drop-down" size={22} color={P.text} />
              <Text style={styles.langText}>{language}</Text>
            </Pressable>
            <Pressable onPress={() => setDark(!dark)} hitSlop={8} style={styles.iconBtn}>
              <MaterialIcons name={dark ? "dark-mode" : "light-mode"} size={26} color={P.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* الملف الشخصي */}
          <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [styles.profile, pressed && styles.pressed]}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={44} color={P.onAccent} />
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.email} numberOfLines={1} adjustsFontSizeToFit>{email}</Text>
              <Pressable onPress={copyUid} hitSlop={8} style={styles.uidRow}>
                <MaterialIcons name="content-copy" size={18} color={P.text} />
                <Text style={styles.uid}>UID:{uid}</Text>
              </Pressable>
              <View style={styles.badges}>
                <Pressable onPress={() => router.push("/verify-identity")} style={styles.badge}>
                  <MaterialIcons name="verified" size={18} color={P.muted} />
                  <Text style={styles.badgeText}>الهوية</Text>
                  <MaterialIcons name="chevron-left" size={16} color={P.muted} />
                </Pressable>
                <Pressable onPress={() => router.push("/referral")} style={styles.badge}>
                  <MaterialIcons name="workspace-premium" size={18} color={P.accent} />
                  <Text style={styles.badgeText}>VIP</Text>
                  <MaterialIcons name="chevron-left" size={16} color={P.muted} />
                </Pressable>
              </View>
            </View>
            <MaterialIcons name="chevron-left" size={26} color={P.muted} />
          </Pressable>

          {/* القوائم */}
          {GROUPS.map((group, gi) => (
            <View key={gi}>
              {gi > 0 ? <View style={styles.groupDivider} /> : <View style={{ height: 14 }} />}
              {group.map((item) => (
                <MenuRow key={item.label} item={item} onPress={() => router.push(item.route as never)} />
              ))}
            </View>
          ))}

          {isAdmin ? (
            <>
              <View style={styles.groupDivider} />
              <MenuRow item={{ label: "لوحة تحكم المسؤول", icon: "admin-panel-settings", route: "/admin" }} onPress={() => router.push("/admin")} />
            </>
          ) : null}

          <View style={styles.groupDivider} />
          <Pressable onPress={handleLogout} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <MaterialIcons name="logout" size={27} color={P.danger} />
            <Text style={[styles.rowLabel, { color: P.danger }]}>تسجيل الخروج</Text>
            <View style={{ width: 22 }} />
          </Pressable>
        </ScrollView>

        {/* التذييل */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>CwaAX</Text>
          <Text style={styles.footerVersion}>الإصدار: {version}</Text>
        </View>

        {/* اختيار اللغة */}
        <Modal visible={languageOpen} transparent animationType="fade" onRequestClose={() => setLanguageOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setLanguageOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text style={styles.sheetTitle}>اختيار اللغة</Text>
              {LANGUAGES.map((item) => {
                const selected = language === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setLanguage(item);
                      setLanguageOpen(false);
                    }}
                    style={({ pressed }) => [styles.langOption, selected && styles.langOptionSelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.langOptionText, selected && styles.langOptionTextSelected]}>{item}</Text>
                    {selected ? (
                      <View style={styles.check}>
                        <MaterialIcons name="check" size={15} color={P.onAccent} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

function MenuRow({ item, onPress }: { item: Item; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <MaterialIcons name={item.icon} size={27} color={P.text} />
      <Text style={styles.rowLabel}>{item.label}</Text>
      {item.badge ? (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <MaterialIcons name="chevron-left" size={24} color={P.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  pressed: { opacity: 0.65 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  langBtn: { flexDirection: "row", alignItems: "center" },
  langText: { color: P.text, fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 },

  profile: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 8 },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
  profileCopy: { flex: 1 },
  email: { color: P.text, fontSize: 21, fontWeight: "800", textAlign: "right" },
  uidRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 8, alignSelf: "flex-start" },
  uid: { color: P.muted, fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  badges: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: P.pill, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: P.text, fontSize: 14, fontWeight: "600" },

  groupDivider: { height: 1, backgroundColor: P.border, marginVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 60 },
  rowLabel: { flex: 1, color: P.text, fontSize: 17, fontWeight: "600", textAlign: "right" },
  newBadge: { backgroundColor: "#EF4444", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  newBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20,
    paddingTop: 14, paddingBottom: Platform.OS === "web" ? 16 : 20, borderTopWidth: 1, borderTopColor: P.border,
  },
  footerText: { color: P.text, fontSize: 15, fontWeight: "800" },
  footerVersion: { color: P.muted, fontSize: 14, fontWeight: "600" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: P.sheet, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: P.border },
  sheetTitle: { color: P.text, fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: 12 },
  langOption: { minHeight: 52, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  langOptionSelected: { backgroundColor: P.pill },
  langOptionText: { color: P.text, fontSize: 15, fontWeight: "700" },
  langOptionTextSelected: { fontWeight: "900" },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
});
