import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { notify } from "@/lib/_core/native-alert";
import * as Auth from "@/lib/_core/auth";
import { isIdentityVerified, markIdentityVerified } from "@/lib/identity-verification";

type DocType = "id" | "passport" | null;

function pickImageFromDevice(): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (!file.type.startsWith("image/")) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<DocType>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const user = await Auth.getUserInfo();
      if (!active) return;
      if (!user?.id) {
        setVerified(false);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const v = await isIdentityVerified(user.id);
      if (!active) return;
      setVerified(v);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const onPick = useCallback(async (type: DocType) => {
    if (verified) return;
    setDocType(type);
    const uri = await pickImageFromDevice();
    if (!uri) {
      notify("لم يتم اختيار صورة", "اختر صورة واضحة للهوية أو جواز السفر.");
      return;
    }
    setPreview(uri);
  }, [verified]);

  const onConfirm = useCallback(async () => {
    if (verified) return;
    if (!docType) {
      notify("اختر نوع الوثيقة", "حدد هوية وطنية أو جواز سفر أولاً.");
      return;
    }
    if (!preview) {
      notify("أضف صورة", "التقط أو اختر صورة للوثيقة قبل التأكيد.");
      return;
    }
    if (!userId) {
      notify("الحساب غير متاح", "سجّل الدخول إلى الحساب ثم أعد المحاولة.");
      return;
    }
    setSubmitting(true);
    try {
      await markIdentityVerified(userId);
      setVerified(true);
      notify("تم توثيق الحساب بهوية");
    } finally {
      setSubmitting(false);
    }
  }, [docType, preview, verified]);

  if (loading) {
    return (
      <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <Text style={styles.title}>تأكيد الهوية</Text>
          <View style={{ width: 42 }} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <Text style={styles.title}>تأكيد الهوية</Text>
          <View style={{ width: 42 }} />
        </View>

        {verified ? (
          <View style={styles.doneCard}>
            <View style={styles.doneIcon}>
              <MaterialIcons name="verified-user" size={42} color={CWAAX.green} />
            </View>
            <Text style={styles.doneTitle}>تم توثيق الحساب بهوية</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>
              ارفع صورة واضحة لوثيقة رسمية فقط: هوية وطنية أو جواز سفر. لا تُقبل صور أخرى.
            </Text>

            <Text style={styles.section}>نوع الوثيقة</Text>
            <View style={styles.docRow}>
              <Pressable
                onPress={() => onPick("id")}
                style={({ pressed }) => [
                  styles.docBtn,
                  docType === "id" && styles.docBtnActive,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  name="badge"
                  size={22}
                  color={docType === "id" ? CWAAX.green : CWAAX.ink}
                />
                <Text style={[styles.docText, docType === "id" && styles.docTextActive]}>
                  هوية وطنية
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onPick("passport")}
                style={({ pressed }) => [
                  styles.docBtn,
                  docType === "passport" && styles.docBtnActive,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  name="menu-book"
                  size={22}
                  color={docType === "passport" ? CWAAX.green : CWAAX.ink}
                />
                <Text style={[styles.docText, docType === "passport" && styles.docTextActive]}>
                  جواز سفر
                </Text>
              </Pressable>
            </View>

            <Text style={styles.section}>صورة الوثيقة</Text>
            {preview ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
                <Pressable
                  onPress={() => onPick(docType || "id")}
                  style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.changeText}>تغيير الصورة</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => onPick(docType || "id")}
                style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}
              >
                <MaterialIcons name="photo-camera" size={28} color={CWAAX.muted} />
                <Text style={styles.uploadText}>التقط أو اختر صورة الهوية / الجواز</Text>
              </Pressable>
            )}

            <Pressable
              onPress={onConfirm}
              disabled={submitting}
              style={({ pressed }) => [
                styles.confirmBtn,
                (!preview || !docType || submitting) && styles.confirmDisabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="verified" size={18} color={CWAAX.white} />
              <Text style={styles.confirmText}>
                {submitting ? "جاري التأكيد..." : "تأكيد الهوية"}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { color: CWAAX.ink, fontSize: 18, fontWeight: "900" },
  hint: {
    color: CWAAX.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "right",
    marginBottom: 18,
  },
  section: {
    color: CWAAX.ink,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  docRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 20 },
  docBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    backgroundColor: CWAAX.surface,
  },
  docBtnActive: { borderColor: CWAAX.green, backgroundColor: CWAAX.greenSoft },
  docText: { color: CWAAX.ink, fontSize: 12, fontWeight: "800" },
  docTextActive: { color: CWAAX.green },
  uploadBox: {
    borderWidth: 1,
    borderColor: CWAAX.line,
    borderStyle: "dashed",
    borderRadius: 16,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CWAAX.surface,
    marginBottom: 20,
  },
  uploadText: { color: CWAAX.muted, fontSize: 12, fontWeight: "700" },
  previewWrap: { marginBottom: 20 },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: CWAAX.surface,
  },
  changeBtn: { alignSelf: "center", marginTop: 10, padding: 8 },
  changeText: { color: CWAAX.green, fontSize: 12, fontWeight: "800" },
  confirmBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: CWAAX.green,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmDisabled: { opacity: 0.5 },
  confirmText: { color: CWAAX.white, fontSize: 14, fontWeight: "900" },
  doneCard: {
    backgroundColor: CWAAX.greenSoft,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  doneTitle: {
    color: CWAAX.green,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  doneSub: {
    color: CWAAX.ink,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
  pressed: { opacity: 0.7 },
});
