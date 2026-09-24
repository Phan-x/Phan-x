import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { trpc } from "@/lib/trpc";

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
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <Text style={styles.title}>الإشعارات</Text>
          <Pressable onPress={markAll}><Text style={styles.markAll}>تحديد الكل كمقروء</Text></Pressable>
        </View>

        {unreadCount > 0 && (
          <View style={styles.unread}>
            <View style={styles.unreadDot} />
            <Text style={styles.unreadText}>لديك {unreadCount} إشعارات جديدة</Text>
          </View>
        )}

        {list.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={CWAAX.green} /></View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="notifications-none" size={40} color={CWAAX.muted} />
            <Text style={styles.emptyText}>لا توجد إشعارات حتى الآن.</Text>
          </View>
        ) : (
          items.map((item: any) => (
            <Pressable
              key={item.id}
              onPress={() => !item.read && markRead.mutate({ notificationId: item.id })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.icon, { backgroundColor: item.read ? CWAAX.surface : CWAAX.greenSoft }]}>
                <MaterialIcons name={item.userId ? "person" : "campaign"} size={20} color={item.read ? CWAAX.muted : CWAAX.green} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowText}>{item.message}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 23 },
  title: { color: CWAAX.ink, fontSize: 20, fontWeight: "900" },
  markAll: { color: CWAAX.green, fontSize: 10, fontWeight: "800" },
  unread: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 11 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: CWAAX.green },
  unreadText: { color: CWAAX.muted, fontSize: 11 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: CWAAX.muted, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 11, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: CWAAX.line },
  icon: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  rowTitle: { color: CWAAX.ink, textAlign: "right", fontSize: 13, fontWeight: "900" },
  rowText: { color: CWAAX.muted, textAlign: "right", fontSize: 11, lineHeight: 17, marginTop: 4 },
  time: { color: "#A1AAA5", textAlign: "right", fontSize: 9, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CWAAX.green, marginTop: 6 },
  pressed: { opacity: 0.6 },
});
