import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PHANX } from "@/constants/phanx";

/**
 * Current platform announcement. Shown to every user each time the app
 * opens (see usage in app/(tabs)/index.tsx). Edit ANNOUNCEMENT_TITLE /
 * ANNOUNCEMENT_BODY to change or retire the message — set
 * ANNOUNCEMENT_ENABLED to false to turn it off without removing the code.
 */
export const ANNOUNCEMENT_ENABLED = true;

const ANNOUNCEMENT_TITLE = "عرض مكافأة خاص للمستخدمين 🎁";

const ANNOUNCEMENT_INTRO =
  "يسر إدارة المنصة الإعلان عن مكافأة قدرها 25 USDT لكل مستخدم مؤهل عند دعوة مستخدم جديد واحد إلى المنصة، بشرط أن يقوم المستخدم المدعو بإتمام شحن بقيمة 100 USDT.";

const ANNOUNCEMENT_CONDITIONS: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; text: string }[] = [
  { icon: "person-add-alt-1", text: "دعوة مستخدم جديد من خلال رابط الإحالة الخاص بك." },
  { icon: "account-balance-wallet", text: "إتمام المستخدم المدعو شحنًا بقيمة 100 USDT أو أكثر." },
  { icon: "card-giftcard", text: "بعد استيفاء الشرط، يتم إضافة 25 USDT كمكافأة وفقًا لنظام المنصة." },
];

const ANNOUNCEMENT_FOOTER = "نشكركم على دعمكم وثقتكم، ونتمنى لكم التوفيق والاستفادة من العرض. ❤️";
const ANNOUNCEMENT_SIGNATURE = "إدارة المنصة";

export function AnnouncementModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.scrim} pointerEvents="auto">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="campaign" size={28} color={PHANX.green} />
          </View>

          <Text style={styles.title}>{ANNOUNCEMENT_TITLE}</Text>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.intro}>{ANNOUNCEMENT_INTRO}</Text>

            <Text style={styles.conditionsLabel}>شروط الحصول على المكافأة</Text>

            <View style={styles.conditionsList}>
              {ANNOUNCEMENT_CONDITIONS.map((item, index) => (
                <View key={index} style={styles.conditionRow}>
                  <View style={styles.conditionIconWrap}>
                    <MaterialIcons name={item.icon} size={17} color={PHANX.green} />
                  </View>
                  <Text style={styles.conditionText}>{item.text}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.footer}>{ANNOUNCEMENT_FOOTER}</Text>
            <Text style={styles.signature}>{ANNOUNCEMENT_SIGNATURE}</Text>
          </ScrollView>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.okBtn}>
            <Text style={styles.okText}>حسنًا، فهمت</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...(Platform.OS === "web"
      ? ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 } as object)
      : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }),
    zIndex: 999999,
    elevation: 24,
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(16,26,22,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "82%",
    backgroundColor: PHANX.white,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: PHANX.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: PHANX.ink,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 25,
  },
  body: {
    width: "100%",
    marginTop: 14,
  },
  bodyContent: {
    paddingBottom: 4,
  },
  intro: {
    color: PHANX.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  conditionsLabel: {
    color: PHANX.ink,
    fontSize: 13.5,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  conditionsList: {
    width: "100%",
    gap: 10,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: PHANX.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: PHANX.line,
  },
  conditionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PHANX.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  conditionText: {
    flex: 1,
    color: PHANX.ink,
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: "right",
  },
  footer: {
    color: PHANX.muted,
    fontSize: 12.5,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 18,
  },
  signature: {
    color: PHANX.green,
    fontSize: 12.5,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
  },
  okBtn: {
    width: "100%",
    height: 50,
    borderRadius: 15,
    backgroundColor: PHANX.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  okText: {
    color: PHANX.white,
    fontSize: 14,
    fontWeight: "900",
  },
});
