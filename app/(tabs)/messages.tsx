import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { PhanLogo, IconButton } from "@/components/phanx-ui";
import { PHANX } from "@/constants/phanx";

const chats = [
  { id: "1", title: "فريق دعم Phan-x", text: "مرحباً، كيف يمكننا مساعدتك؟", time: "10:42", icon: "support-agent" as const, unread: 2 },
];

export default function MessagesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("الكل");
  const [query, setQuery] = useState("");

  const filteredChats = useMemo(
    () =>
      chats
        .filter((chat) => (filter === "غير مقروءة" ? chat.unread > 0 : filter === "الدعم" ? chat.title.includes("دعم") : true))
        .filter((chat) => `${chat.title} ${chat.text}`.toLowerCase().includes(query.toLowerCase())),
    [filter, query]
  );

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <PhanLogo />
        <View style={styles.actions}>
          <IconButton icon="search" label="البحث" onPress={() => setQuery(query ? "" : "دعم")} />
          <IconButton icon="edit" label="رسالة جديدة" onPress={() => router.push("/support")} />
        </View>
      </View>

      <Text style={styles.title}>المحادثات</Text>
      <Text style={styles.subtitle}>كل ما يهمك في مكان واحد</Text>

      <View style={styles.filterRow}>
        {["الكل", "غير مقروءة", "الدعم"].map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[filter === item ? styles.filterActive : styles.filterButton]}>
            <Text style={filter === item ? styles.filterActiveText : styles.filterText}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {query ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في المحادثات"
          placeholderTextColor="#9CA8A1"
          style={styles.searchInput}
          textAlign="right"
        />
      ) : null}

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><MaterialIcons name="forum" size={26} color={PHANX.green} /></View>
            <Text style={styles.emptyText}>لا توجد محادثات هنا</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => Linking.openURL("https://t.me/Phan_1x")} style={({ pressed }) => [styles.chatCard, pressed && styles.pressed]}>
            <View style={styles.avatar}>
              <MaterialIcons name={item.icon} size={22} color={PHANX.green} />
            </View>
            <View style={styles.chatCopy}>
              <View style={styles.chatHead}>
                <Text style={styles.time}>{item.time}</Text>
                <Text style={styles.chatTitle}>{item.title}</Text>
              </View>
              <Text style={styles.chatText} numberOfLines={1}>{item.text}</Text>
            </View>
            {item.unread > 0 && (
              <View style={styles.unread}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12 },
  actions: { flexDirection: "row", gap: 8 },
  title: { color: PHANX.ink, fontSize: 27, fontWeight: "900", textAlign: "right", marginTop: 24 },
  subtitle: { color: PHANX.muted, textAlign: "right", fontSize: 12, marginTop: 5, marginBottom: 20 },
  filterRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 18 },
  filterActive: { backgroundColor: PHANX.green, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  filterActiveText: { color: PHANX.white, fontSize: 12, fontWeight: "800" },
  filterButton: { backgroundColor: PHANX.surface, borderWidth: 1, borderColor: PHANX.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  filterText: { color: PHANX.muted, fontSize: 12, fontWeight: "700" },
  searchInput: { height: 46, borderWidth: 1, borderColor: PHANX.line, borderRadius: 14, paddingHorizontal: 14, color: PHANX.ink, marginBottom: 14, backgroundColor: PHANX.white },
  list: { paddingBottom: 25, gap: 10 },
  chatCard: {
    minHeight: 82, flexDirection: "row", alignItems: "center", gap: 13,
    backgroundColor: PHANX.white, borderWidth: 1, borderColor: PHANX.line,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 14,
    shadowColor: "#15231c", shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: PHANX.greenSoft, alignItems: "center", justifyContent: "center" },
  chatCopy: { flex: 1 },
  chatHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatTitle: { color: PHANX.ink, fontSize: 13.5, fontWeight: "800", textAlign: "right" },
  time: { color: PHANX.muted, fontSize: 10.5 },
  chatText: { color: PHANX.muted, fontSize: 11.5, textAlign: "right", marginTop: 6 },
  unread: { backgroundColor: PHANX.green, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  unreadText: { color: PHANX.white, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.6 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: PHANX.greenSoft, alignItems: "center", justifyContent: "center" },
  emptyText: { color: PHANX.muted, fontSize: 13, fontWeight: "700" },
});
