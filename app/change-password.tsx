import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { confirmAsync, notify } from "@/lib/_core/native-alert";
import { trpc } from "@/lib/trpc";

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      notify("تم بنجاح", "تم تغيير كلمة المرور بنجاح", () => router.back());
    },
    onError: (err) => {
      notify("خطأ", err.message || "تعذر تغيير كلمة المرور");
    },
  });

  const handleSubmit = async () => {
    if (!currentPassword) {
      notify("تنبيه", "يرجى إدخال كلمة المرور الحالية");
      return;
    }

    if (newPassword.length < 8) {
      notify("تنبيه", "يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      notify("تنبيه", "كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }

    if (newPassword === currentPassword) {
      notify("تنبيه", "كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }

    const confirmed = await confirmAsync(
      "تأكيد تغيير كلمة المرور",
      "سيتم استبدال كلمة المرور الحالية بالكلمة الجديدة فوراً. هل تريد المتابعة؟",
      "تأكيد التغيير",
    );
    if (!confirmed) return;

    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <Text style={styles.title}>تغيير كلمة المرور</Text>
          <View style={{ width: 42 }} />
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>كلمة المرور الحالية</Text>
          <View style={styles.inputRow}>
            <Pressable onPress={() => setShowCurrent(!showCurrent)} hitSlop={10}>
              <MaterialIcons name={showCurrent ? "visibility-off" : "visibility"} size={19} color="#A0AAA4" />
            </Pressable>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="أدخل كلمة المرور الحالية"
              placeholderTextColor="#A0AAA4"
              secureTextEntry={!showCurrent}
              textAlign="right"
            />
          </View>

          <Text style={styles.label}>كلمة المرور الجديدة</Text>
          <View style={styles.inputRow}>
            <Pressable onPress={() => setShowNew(!showNew)} hitSlop={10}>
              <MaterialIcons name={showNew ? "visibility-off" : "visibility"} size={19} color="#A0AAA4" />
            </Pressable>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="8 أحرف على الأقل"
              placeholderTextColor="#A0AAA4"
              secureTextEntry={!showNew}
              textAlign="right"
            />
          </View>

          <Text style={styles.label}>تأكيد كلمة المرور الجديدة</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="lock-outline" size={19} color="#A0AAA4" />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="أعد إدخال كلمة المرور الجديدة"
              placeholderTextColor="#A0AAA4"
              secureTextEntry={!showNew}
              textAlign="right"
            />
          </View>
        </Card>

        <Pressable
          onPress={handleSubmit}
          disabled={changePassword.isPending}
          style={({ pressed }) => [styles.submit, (pressed || changePassword.isPending) && styles.pressed]}
        >
          <Text style={styles.submitText}>
            {changePassword.isPending ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { color: CWAAX.ink, fontSize: 20, fontWeight: "900" },
  card: { gap: 4 },
  label: { color: CWAAX.ink, fontSize: 12, fontWeight: "800", textAlign: "right", marginBottom: 8, marginTop: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 50,
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FAFBFC",
  },
  input: { flex: 1, color: CWAAX.ink, fontSize: 13, height: "100%" },
  submit: {
    marginTop: 26,
    height: 52,
    borderRadius: 14,
    backgroundColor: CWAAX.green,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: CWAAX.white, fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.7 },
});
