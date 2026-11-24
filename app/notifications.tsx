import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", soft: "rgba(255,230,0,0.12)",
  grey: "rgba(255,255,255,0.08)",
};

function timeAgo(dateStr: string | Date) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "أمس";
  return `منذ ${day} يوم`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const list = trpc.notifications.list.useQuery();
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const items = list.data || [];
  const unreadCount = items.filter((n: any) => !n.read).length;

  const markAll = () => {
    items.filter((n: any) => !n.read).forEach((n: any) => markRead.mutate({ notificationId: n.id }));
  };

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.circleBtn} hitSlop={8}>
            <MaterialIcons name="arrow-forward" size={22} color={P.text} />
          </Pressable>
          <Text style={styles.title}>الإشعارات</Text>
          <Pressable
            onPress={markAll}
            disabled={unreadCount === 0}
            style={[styles.circleBtn, unreadCount > 0 && { backgroundColor: P.accent, borderColor: P.accent }]}
            hitSlop={8}
          >
            <MaterialIcons name="done-all" size={22} color={unreadCount > 0 ? P.onAccent : P.muted} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={() => list.refetch()}
              tintColor={P.accent}
              colors={[P.accent]}
              progressBackgroundColor={P.card}
            />
          }
        >
          {unreadCount > 0 && (
            <View style={styles.unread}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>لديك {unreadCount} إشعارات جديدة</Text>
            </View>
          )}

          {list.isLoading ? (
            <View style={styles.center}><ActivityIndicator color={P.accent} /></View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="notifications-none" size={38} color={P.accent} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
              <Text style={styles.emptyText}>سنخبرك هنا بكل جديد يخص حسابك وعملياتك.</Text>
            </View>
          ) : (
            items.map((item: any) => (
              <Pressable
                key={item.id}
                onPress={() => !item.read && markRead.mutate({ notificationId: item.id })}
                style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.icon, !item.read && { backgroundColor: P.soft }]}>
                  <MaterialIcons
                    name={item.userId ? "person" : "campaign"}
                    size={22}
                    color={item.read ? P.muted : P.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, item.read && { color: P.muted }]}>{item.title}</Text>
                  <Text style={styles.rowText}>{item.message}</Text>
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.read && <View style={styles.dot} />}
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: P.card, borderWidth: 1, borderColor: P.border },
  title: { color: P.text, fontSize: 20, fontWeight: "900" },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, flexGrow: 1 },
  unread: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: P.soft, paddingHorizontal: 14, height: 36, borderRadius: 18, marginBottom: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P.accent },
  unreadText: { color: P.accent, fontSize: 13, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 90, gap: 10 },
  emptyIcon: { width: 86, height: 86, borderRadius: 43, backgroundColor: P.soft, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { color: P.text, fontSize: 18, fontWeight: "900" },
  emptyText: { color: P.muted, fontSize: 13, textAlign: "center", paddingHorizontal: 30, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderRadius: 20, padding: 14, marginBottom: 10 },
  rowUnread: { borderColor: "rgba(255,230,0,0.35)" },
  icon: { width: 46, height: 46, borderRadius: 15, backgroundColor: P.grey, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: P.text, fontSize: 15, fontWeight: "800", textAlign: "right" },
  rowText: { color: P.muted, fontSize: 13, lineHeight: 21, marginTop: 5, textAlign: "right" },
  time: { color: P.muted, fontSize: 11, marginTop: 8, textAlign: "right", opacity: 0.8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P.accent, marginTop: 6 },
});
