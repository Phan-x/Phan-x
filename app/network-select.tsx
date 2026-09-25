import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { NetworkIcon } from "@/components/network-icon";
import { PHANX } from "@/constants/phanx";
import { NETWORKS } from "@/constants/networks";
import { getSelectedNetwork, setSelectedNetwork } from "@/lib/_core/network-store";

export default function NetworkSelectScreen() {
  const router = useRouter();
  const current = getSelectedNetwork();

  const choose = (code: string) => {
    setSelectedNetwork(code);
    router.back();
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialIcons name="close" size={24} color={PHANX.ink} />
        </Pressable>
        <Text style={styles.title}>تغيير الشبكة/السلسلة</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.warning}>
        <MaterialIcons name="info-outline" size={18} color={PHANX.muted} />
        <Text style={styles.warningText}>
          تحقق مع المستفيد إذا لم تكن متأكداً. ستُفقد التوكنات المُرسلة على الشبكة الخاطئة.
        </Text>
      </View>

      <View style={styles.colHeader}>
        <Text style={styles.colHeaderText}>رسوم الغاز التقديرية</Text>
        <Text style={styles.colHeaderText}>شبكة</Text>
      </View>

      <FlatList
        data={NETWORKS}
        keyExtractor={(n) => n.code}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => choose(item.code)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <NetworkIcon network={item} size={40} />

            <View style={styles.copy}>
              <View style={styles.nameRow}>
                {item.code === current && (
                  <View style={styles.selectedTag}>
                    <Text style={styles.selectedTagText}>محدد</Text>
                  </View>
                )}
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <Text style={styles.chain}>{item.chain}</Text>
            </View>

            <View style={styles.feeCol}>
              <Text style={styles.feeUsd}>بدون رسوم</Text>
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 20 },
  title: { color: PHANX.ink, fontSize: 17, fontWeight: "900" },
  warning: { flexDirection: "row-reverse", gap: 8, backgroundColor: PHANX.surface, borderRadius: 12, padding: 13, marginBottom: 22 },
  warningText: { flex: 1, color: PHANX.muted, fontSize: 11, lineHeight: 18, textAlign: "right" },
  colHeader: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 10 },
  colHeaderText: { color: PHANX.muted, fontSize: 10 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: PHANX.line },
  copy: { flex: 1 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  name: { color: PHANX.ink, fontSize: 14, fontWeight: "900" },
  selectedTag: { backgroundColor: "#E4F7E9", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  selectedTagText: { color: PHANX.green, fontSize: 9, fontWeight: "800" },
  chain: { color: PHANX.muted, fontSize: 12, marginTop: 4, textAlign: "right" },
  feeCol: { alignItems: "flex-start" },
  feeUsd: { color: PHANX.ink, fontSize: 13, fontWeight: "800" },
  feeToken: { color: PHANX.muted, fontSize: 10, marginTop: 4 },
  pressed: { opacity: 0.6 },
});
