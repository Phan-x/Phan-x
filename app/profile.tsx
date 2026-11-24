import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { confirmAsync } from "@/lib/_core/native-alert";

type SecurityRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  accent?: boolean;
  showChevron?: boolean;
};

function SecurityRow({
  label,
  value,
  onPress,
  accent = false,
  showChevron = true,
}: SecurityRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowLeading}>
        {value ? (
          <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
        ) : null}
        {showChevron ? (
          <MaterialIcons name="chevron-left" size={24} color="#555555" />
        ) : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const openSettings = () => router.push("/settings" as never);
  const openPassword = () => router.push("/change-password" as never);
  const openTransactions = () => router.push("/transactions" as never);

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>الأمان</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backButton}
          >
            <MaterialIcons name="chevron-right" size={34} color="#111111" />
          </Pressable>
        </View>

        <View style={styles.rows}>
          <SecurityRow label="كلمة مرور تسجيل الدخول" value="تعديل" onPress={openPassword} />
          <SecurityRow label="مفتاح المرور" value="الإعداد" onPress={openSettings} />
          <SecurityRow label="الهاتف" value="ربط" onPress={openSettings} />
          <SecurityRow label="البريد الإلكتروني" value="تعديل" accent onPress={openSettings} />
          <SecurityRow label="Google Authenticator" value="ربط" onPress={openSettings} />
          <SecurityRow label="رمز التمويل" value="تعيين" onPress={openSettings} />

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: twoFactorEnabled }}
            onPress={() => setTwoFactorEnabled((enabled) => !enabled)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Switch
              value={twoFactorEnabled}
              onValueChange={setTwoFactorEnabled}
              trackColor={{ false: "#D8D8D8", true: "#D5B315" }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D8D8D8"
            />
            <Text style={styles.label}>المصادقة الثنائية</Text>
          </Pressable>

          <SecurityRow label="رمز مكافحة التصيد الاحتيالي" onPress={openSettings} />
          <SecurityRow label="سجل تسجيل الدخول" onPress={openTransactions} />
          <SecurityRow label="حسابات الطرف الثالث" onPress={openSettings} />
          <SecurityRow
            label="حذف الحساب"
            onPress={async () => {
              const confirmed = await confirmAsync(
                "حذف الحساب",
                "هذا الخيار يحتاج إلى إجراء حذف آمن من إعدادات الحساب. هل تريد فتح الإعدادات؟",
                "فتح الإعدادات",
              );
              if (confirmed) openSettings();
            }}
          />
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingBottom: 28,
  },
  header: {
    height: 64,
    paddingHorizontal: 22,
    flexDirection: "row",
    direction: "ltr",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 34,
  },
  title: {
    color: "#111111",
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  backButton: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  rows: {
    marginTop: 28,
    paddingHorizontal: 22,
  },
  row: {
    minHeight: 66,
    flexDirection: "row",
    direction: "ltr",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeading: {
    minWidth: 94,
    flexDirection: "row",
    direction: "ltr",
    alignItems: "center",
    gap: 8,
  },
  label: {
    flexShrink: 1,
    color: "#171717",
    fontSize: 17,
    fontWeight: "400",
    textAlign: "right",
  },
  value: {
    color: "#999999",
    fontSize: 16,
    fontWeight: "400",
  },
  valueAccent: {
    color: "#56B99D",
  },
  pressed: {
    opacity: 0.65,
  },
  bottomSpace: {
    height: 40,
  },
});
