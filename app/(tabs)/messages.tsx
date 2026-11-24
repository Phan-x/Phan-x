import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", danger: "#FF5C5C",
  soft: "rgba(255,230,0,0.12)",
};
const noOutline: any = { outlineStyle: "none", outlineWidth: 0 };

const chats = [
  { id: "1", title: "فريق دعم CwaAX", text: "مرحباً، كيف يمكننا مساعدتك؟", time: "10:42", icon: "support-agent" as const, unread: 2 },
  { id: "2", title: "تنبيهات الأمان", text: "تم تسجيل الدخول من جهاز جديد", time: "أمس", icon: "shield" as const, unread: 0 },
  { id: "3", title: "مجتمع المتداولين", text: "تابع آخر تحليلات السوق اليوم", time: "28 أغسطس", icon: "groups" as const, unread: 0, link: "https://t.me/CwalletNews" },
];
const FILTERS = ["الكل", "غير مقروءة", "الدعم"];

export default function MessagesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("الكل");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const filteredChats = useMemo(
    () =>
      chats
        .filter((c) => (filter === "غير مقروءة" ? c.unread > 0 : filter === "الدعم" ? c.title.includes("دعم") : true))
        .filter((c) => `${c.title} ${c.text}`.toLowerCase().includes(query.toLowerCase())),
    [filter, query],
  );

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>المحادثات</Text>
            <Text style={styles.subtitle}>كل ما يهمك في مكان واحد</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => { setSearching((s) => !s); setQuery(""); }}
              style={[styles.circleBtn, searching && { backgroundColor: P.accent, borderColor: P.accent }]}
            >
              <MaterialIcons name="search" size={21} color={searching ? P.onAccent : P.text} />
            </Pressable>
            <Pressable onPress={() => router.push("/support")} style={styles.circleBtn}>
              <MaterialIcons name="edit" size={20} color={P.text} />
            </Pressable>
          </View>
        </View>

        {searching ? (
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={P.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث في المحادثات"
              placeholderTextColor={P.muted}
              style={[styles.searchInput, noOutline]}
              underlineColorAndroid="transparent"
              textAlign="right"
              autoFocus
            />
          </View>
        ) : null}

        <View style={styles.filterRow}>
          {FILTERS.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.chipActive]}>
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد محادثات مطابقة</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => ((item as any).link ? Linking.openURL((item as any).link) : router.push("/support"))}
              style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.avatar}>
                <MaterialIcons name={item.icon} size={24} color={P.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.chatHead}>
                  <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.time, item.unread > 0 && { color: P.accent }]}>{item.time}</Text>
                </View>
                <View style={styles.chatHead}>
                  <Text style={styles.chatText} numberOfLines={1}>{item.text}</Text>
                  {item.unread > 0 && (
                    <View style={styles.unread}><Text style={styles.unreadText}>{item.unread}</Text></View>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12 },
  title: { color: P.text, fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: P.muted, fontSize: 13, marginTop: 4, textAlign: "right" },
  actions: { flexDirection: "row", gap: 10 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 16, height: 48, borderRadius: 16, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, paddingHorizontal: 14 },
  searchInput: { flex: 1, minWidth: 0, color: P.text, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 18, marginBottom: 6 },
  chip: { paddingHorizontal: 18, height: 38, borderRadius: 19, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: P.accent, borderColor: P.accent },
  chipText: { color: P.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: P.onAccent },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: P.border },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: P.soft, alignItems: "center", justifyContent: "center" },
  chatHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  chatTitle: { flex: 1, color: P.text, fontSize: 15, fontWeight: "800", textAlign: "right" },
  time: { color: P.muted, fontSize: 12 },
  chatText: { flex: 1, color: P.muted, fontSize: 13, marginTop: 6, textAlign: "right" },
  unread: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: P.accent, alignItems: "center", justifyContent: "center", marginTop: 4 },
  unreadText: { color: P.onAccent, fontSize: 12, fontWeight: "900" },
  empty: { color: P.muted, textAlign: "center", marginTop: 40 },
});
