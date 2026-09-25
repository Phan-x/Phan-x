import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, PhanLogo, IconButton, StatusPill } from "@/components/phanx-ui";
import { PHANX } from "@/constants/phanx";
import { confirmAsync } from "@/lib/_core/native-alert";
import { useAuth } from "@/hooks/use-auth";

const common = [
  { label: "الإحالة والمكافآت", icon: "card-giftcard" as const, route: "/referral" },
  { label: "الإشعارات", icon: "notifications-none" as const, route: "/notifications" },
  { label: "الإعدادات", icon: "settings" as const, route: "/settings" },
];

export default function MenuScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
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
          <PhanLogo />
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
              <MaterialIcons name="chevron-left" size={17} color={PHANX.green} />
            </Pressable>
          </View>
        </Card>

        <Pressable
          onPress={() => router.push("/referral")}
          style={({ pressed }) => [styles.vipCard, pressed && styles.pressed]}
        >
          <View style={styles.vipIcon}>
            <MaterialIcons name="workspace-premium" size={24} color={PHANX.gold} />
          </View>
          <View style={styles.vipCopy}>
            <Text style={styles.vipTitle}>عضوية Phan-x VIP</Text>
            <Text style={styles.vipSub}>خصومات رسوم + مكافآت حصرية</Text>
          </View>
          <MaterialIcons name="chevron-left" size={21} color={PHANX.ink} />
        </Pressable>

        <Text style={styles.sectionTitle}>شائع</Text>
        <Card style={styles.groupCard}>
          {common.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [styles.menuRow, index < common.length - 1 && styles.menuRowBorder, pressed && styles.pressed]}
            >
              <View style={styles.menuIcon}>
                <MaterialIcons name={item.icon} size={19} color={PHANX.green} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
            </Pressable>
          ))}
        </Card>

        <Card style={styles.groupCard}>
          <Pressable
            onPress={() => setLanguageOpen(true)}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F2F3F2" }]}>
              <MaterialIcons name="language" size={19} color={PHANX.ink} />
            </View>
            <Text style={styles.menuLabel}>اللغة</Text>
            <Text style={styles.preference}>{language}</Text>
            <MaterialIcons name="chevron-left" size={19} color="#A0AAA4" />
          </Pressable>
        </Card>

        {isAdmin && (
          <Pressable
            onPress={() => router.push("/admin")}
            style={({ pressed }) => [styles.adminLink, pressed && styles.pressed]}
          >
            <MaterialIcons name="admin-panel-settings" size={18} color={PHANX.green} />
            <Text style={styles.adminText}>لوحة تحكم المسؤول</Text>
          </Pressable>
        )}

        <Pressable
          onPress={async () => {
            const confirmed = await confirmAsync("تسجيل الخروج", "هل تريد تسجيل الخروج من Phan-x؟", "تسجيل الخروج");
            if (confirmed) {
              await logout();
              router.replace("/login");
            }
          }}
          style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        >
          <MaterialIcons name="logout" size={18} color={PHANX.red} />
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
                  <MaterialIcons name="check" size={18} color={PHANX.green} />
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
  title: { color: PHANX.ink, fontSize: 28, fontWeight: "900", textAlign: "right", marginTop: 22, marginBottom: 14 },
  profileCard: { padding: 15, marginBottom: 12 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 17, backgroundColor: PHANX.green, alignItems: "center", justifyContent: "center" },
  avatarText: { color: PHANX.white, fontSize: 20, fontWeight: "900" },
  profileCopy: { flex: 1 },
  name: { color: PHANX.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  uid: { color: PHANX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  profileFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: PHANX.line, marginTop: 14, paddingTop: 12 },
  email: { color: PHANX.muted, fontSize: 10 },
  viewProfile: { flexDirection: "row", alignItems: "center", gap: 3 },
  viewProfileText: { color: PHANX.green, fontWeight: "800", fontSize: 11 },
  vipCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#FFF9EC", borderWidth: 1, borderColor: "#F4E2B4", padding: 14, borderRadius: 18, marginBottom: 22 },
  vipIcon: { width: 41, height: 41, borderRadius: 14, backgroundColor: "#FFF0C9", alignItems: "center", justifyContent: "center" },
  vipCopy: { flex: 1 },
  vipTitle: { color: PHANX.ink, fontWeight: "900", fontSize: 13, textAlign: "right" },
  vipSub: { color: PHANX.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  sectionTitle: { color: PHANX.muted, fontWeight: "800", fontSize: 12.5, textAlign: "right", marginBottom: 9, marginTop: 8, letterSpacing: 0.2 },
  groupCard: { padding: 4, marginBottom: 18 },
  menuRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: PHANX.line },
  menuIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: PHANX.greenSoft, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, color: PHANX.ink, fontSize: 13.5, fontWeight: "700", textAlign: "right" },
  preference: { color: PHANX.muted, fontSize: 11, marginRight: 4 },
  adminLink: { marginTop: 23, borderWidth: 1, borderColor: "#BDE4CB", backgroundColor: "#F4FBF6", borderRadius: 14, padding: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  adminText: { color: PHANX.green, fontSize: 12, fontWeight: "900" },
  logout: { marginTop: 12, borderWidth: 1, borderColor: "#F2D1CF", backgroundColor: "#FFF8F8", borderRadius: 14, padding: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  logoutText: { color: PHANX.red, fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.35)", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: PHANX.white, borderRadius: 22, padding: 18 },
  modalTitle: { color: PHANX.ink, fontSize: 18, fontWeight: "900", textAlign: "right", marginBottom: 12 },
  languageOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  languageSelected: { backgroundColor: PHANX.greenSoft },
  languageText: { color: PHANX.ink, fontSize: 12, fontWeight: "700" },
});
