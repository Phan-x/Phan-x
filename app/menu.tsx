import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, CwaLogo, IconButton, StatusPill } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { confirmAsync } from "@/lib/_core/native-alert";
import { useAuth } from "@/hooks/use-auth";

const common = [
  { label: "الإحالة والمكافآت", icon: "card-giftcard" as const, route: "/referral" },
  { label: "الإشعارات", icon: "notifications-none" as const, route: "/notifications" },
  { label: "الإعدادات", icon: "settings" as const, route: "/settings" },
];

const trading = [
  { label: "العقود الآجلة", icon: "show-chart" as const, route: "/(tabs)/trade" },
  { label: "معركة السوق", icon: "flash-on" as const, route: "/(tabs)/trade" },
  { label: "تجارة الاتجاه", icon: "insights" as const, route: "/(tabs)/trade" },
  { label: "تأكيد الهوية", icon: "badge" as const, route: "/verify-identity" },
];

export default function MenuScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [language, setLanguage] = useState("العربية");
  const [languageOpen, setLanguageOpen] = useState(false);

  const isAdmin = ["admin", "owner", "superadmin", "administrator"].includes(
    String(user?.role ?? "").toLowerCase().trim()
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <IconButton icon="close" label="إغلاق" onPress={() => router.back()} />
          <CwaLogo />
          <View style={{ width: 42 }} />
        </View>

        <Text style={styles.title}>الحساب</Text>

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>أ</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.name}>
                {user?.name || user?.username || "المستخدم"}
                {isAdmin ? "  ·  Admin" : ""}
              </Text>
              <Text style={styles.uid}>UID {user?.id ?? "—"}</Text>
            </View>
            <StatusPill>موثق</StatusPill>
          </View>
          <View style={styles.profileFoot}>
            <Text style={styles.email}>{user?.email || ""}</Text>
            <Pressable
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.viewProfile, pressed && styles.pressed]}
            >
              <Text style={styles.viewProfileText}>عرض الملف</Text>
              <MaterialIcons name="chevron-left" size={17} color={CWAAX.green} />
            </Pressable>
          </View>
        </Card>

        <Pressable
          onPress={() => router.push("/referral")}
          style={({ pressed }) => [styles.vipCard, pressed && styles.pressed]}
        >
          <View style={styles.vipIcon}>
            <MaterialIcons name="workspace-premium" size={24} color={CWAAX.gold} />
          </View>
          <View style={styles.vipCopy}>
            <Text style={styles.vipTitle}>عضوية CwaAX VIP</Text>
            <Text style={styles.vipSub}>خصومات رسوم + مكافآت حصرية</Text>
          </View>
          <MaterialIcons name="chevron-left" size={21} color={CWAAX.ink} />
        </Pressable>

        <Text style={styles.sectionTitle}>شائع</Text>
        {common.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name={item.icon} size={19} color={CWAAX.green} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>التجارة</Text>
        {trading.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.route === "/verify-identity" ? CWAAX.greenSoft : "#F2F0FF" }]}>
              <MaterialIcons
                name={item.icon}
                size={19}
                color={item.route === "/verify-identity" ? CWAAX.green : CWAAX.purple}
              />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>تفضيلات التطبيق</Text>

        <View style={styles.menuRow}>
          <View style={[styles.menuIcon, { backgroundColor: "#F2F3F2" }]}>
            <MaterialIcons name="dark-mode" size={19} color={CWAAX.ink} />
          </View>
          <Text style={styles.menuLabel}>الوضع الداكن</Text>
          <Switch
            value={dark}
            onValueChange={setDark}
            trackColor={{ false: "#DDE4E0", true: "#9BD5B4" }}
            thumbColor={dark ? CWAAX.green : "#FFFFFF"}
          />
        </View>

        <Pressable
          onPress={() => setLanguageOpen(true)}
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
        >
          <View style={[styles.menuIcon, { backgroundColor: "#F2F3F2" }]}>
            <MaterialIcons name="language" size={19} color={CWAAX.ink} />
          </View>
          <Text style={styles.menuLabel}>اللغة</Text>
          <Text style={styles.preference}>{language}</Text>
          <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
        </Pressable>

        {isAdmin && (
          <Pressable
            onPress={() => router.push("/admin")}
            style={({ pressed }) => [styles.adminLink, pressed && styles.pressed]}
          >
            <MaterialIcons name="admin-panel-settings" size={18} color={CWAAX.green} />
            <Text style={styles.adminText}>لوحة تحكم المسؤول</Text>
          </Pressable>
        )}

        <Pressable
          onPress={async () => {
            const confirmed = await confirmAsync("تسجيل الخروج", "هل تريد تسجيل الخروج من CwaAX؟", "تسجيل الخروج");
            if (confirmed) {
              await logout();
              router.replace("/login");
            }
          }}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <MaterialIcons name="logout" size={18} color={CWAAX.red} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={languageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>اختيار اللغة</Text>
            {["العربية", "English", "Русский"].map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setLanguage(item);
                  setLanguageOpen(false);
                }}
                style={({ pressed }) => [
                  styles.languageOption,
                  language === item && styles.languageSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.languageText}>{item}</Text>
                {language === item && (
                  <MaterialIcons name="check" size={18} color={CWAAX.green} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 26 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: CWAAX.ink, fontSize: 28, fontWeight: "900", textAlign: "right", marginTop: 22, marginBottom: 14 },
  profileCard: { padding: 15, marginBottom: 12 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 17, backgroundColor: CWAAX.green, alignItems: "center", justifyContent: "center" },
  avatarText: { color: CWAAX.white, fontSize: 20, fontWeight: "900" },
  profileCopy: { flex: 1 },
  name: { color: CWAAX.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  uid: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  profileFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: CWAAX.line, marginTop: 14, paddingTop: 12 },
  email: { color: CWAAX.muted, fontSize: 10 },
  viewProfile: { flexDirection: "row", alignItems: "center", gap: 3 },
  viewProfileText: { color: CWAAX.green, fontWeight: "800", fontSize: 11 },
  vipCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#FFF9EC", borderWidth: 1, borderColor: "#F4E2B4", padding: 14, borderRadius: 18, marginBottom: 22 },
  vipIcon: { width: 41, height: 41, borderRadius: 14, backgroundColor: "#FFF0C9", alignItems: "center", justifyContent: "center" },
  vipCopy: { flex: 1 },
  vipTitle: { color: CWAAX.ink, fontWeight: "900", fontSize: 13, textAlign: "right" },
  vipSub: { color: CWAAX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  sectionTitle: { color: CWAAX.muted, fontWeight: "800", fontSize: 12, textAlign: "right", marginBottom: 7, marginTop: 6 },
  menuRow: { minHeight: 57, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: CWAAX.line },
  menuIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: CWAAX.greenSoft, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, color: CWAAX.ink, fontSize: 13, fontWeight: "700", textAlign: "right" },
  preference: { color: CWAAX.muted, fontSize: 11, marginRight: 4 },
  adminLink: { marginTop: 23, borderWidth: 1, borderColor: "#BDE4CB", backgroundColor: "#F4FBF6", borderRadius: 14, padding: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  adminText: { color: CWAAX.green, fontSize: 12, fontWeight: "900" },
  logout: { marginTop: 12, borderWidth: 1, borderColor: "#F2D1CF", backgroundColor: "#FFF8F8", borderRadius: 14, padding: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  logoutText: { color: CWAAX.red, fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.35)", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: CWAAX.white, borderRadius: 22, padding: 18 },
  modalTitle: { color: CWAAX.ink, fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: 12 },
  languageOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  languageSelected: { backgroundColor: CWAAX.greenSoft },
  languageText: { color: CWAAX.ink, fontSize: 12, fontWeight: "700" },
});
