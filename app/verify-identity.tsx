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
type Slot = "front" | "back" | "face" | "passport";

type ImageSource = "camera" | "gallery";

function pickImageFromDevice(source: ImageSource): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") {
      // يفرض فتح تطبيق الكاميرا مباشرة بدل معرض الصور (مدعوم على متصفحات
      // الجوال). بدون هذا السطر كانت بعض المتصفحات/الـWebView تفتح
      // المعرض فقط دون عرض خيار الكاميرا إطلاقاً.
      input.setAttribute("capture", "environment");
    }
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
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
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

  const selectDocType = useCallback((type: DocType) => {
    if (verified) return;
    setDocType(type);
    setFrontPreview(null);
    setBackPreview(null);
    setPassportPreview(null);
    setFacePreview(null);
  }, [verified]);

  const onPick = useCallback(async (slot: Slot, source: ImageSource) => {
    if (verified) return;
    const uri = await pickImageFromDevice(source);
    if (!uri) {
      notify("لم يتم اختيار صورة", "اختر صورة واضحة من الكاميرا أو من المعرض.");
      return;
    }
    if (slot === "front") setFrontPreview(uri);
    else if (slot === "back") setBackPreview(uri);
    else if (slot === "passport") setPassportPreview(uri);
    else setFacePreview(uri);
  }, [verified]);

  const isComplete =
    docType === "id"
      ? !!(frontPreview && backPreview && facePreview)
      : docType === "passport"
        ? !!(passportPreview && facePreview)
        : false;

  const onConfirm = useCallback(async () => {
    if (verified) return;
    if (!docType) {
      notify("اختر نوع الوثيقة", "حدد هوية وطنية أو جواز سفر أولاً.");
      return;
    }
    if (!isComplete) {
      notify("أكمل الصور المطلوبة", docType === "id"
        ? "ارفع صورة وجه الهوية، وخلف الهوية، وصورة وجهك."
        : "ارفع صورة جواز السفر وصورة وجهك.");
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
  }, [docType, isComplete, userId, verified]);

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

  const renderSlot = (
    slot: Slot,
    label: string,
    preview: string | null,
    icon: keyof typeof MaterialIcons.glyphMap = "photo-camera",
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.slotLabel}>{label}</Text>
      {preview ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
          <View style={styles.sourceRow}>
            <Pressable
              onPress={() => onPick(slot, "camera")}
              style={({ pressed }) => [styles.sourceBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="photo-camera" size={16} color={CWAAX.green} />
              <Text style={styles.sourceBtnText}>الكاميرا</Text>
            </Pressable>
            <Pressable
              onPress={() => onPick(slot, "gallery")}
              style={({ pressed }) => [styles.sourceBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="photo-library" size={16} color={CWAAX.green} />
              <Text style={styles.sourceBtnText}>المعرض</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.uploadBox}>
          <MaterialIcons name={icon} size={24} color={CWAAX.muted} />
          <Text style={styles.uploadText}>اختر مصدر الصورة</Text>
          <View style={styles.sourceRow}>
            <Pressable
              onPress={() => onPick(slot, "camera")}
              style={({ pressed }) => [styles.sourceBtnFilled, pressed && styles.pressed]}
            >
              <MaterialIcons name="photo-camera" size={17} color={CWAAX.white} />
              <Text style={styles.sourceBtnFilledText}>الكاميرا</Text>
            </Pressable>
            <Pressable
              onPress={() => onPick(slot, "gallery")}
              style={({ pressed }) => [styles.sourceBtnOutline, pressed && styles.pressed]}
            >
              <MaterialIcons name="photo-library" size={17} color={CWAAX.green} />
              <Text style={styles.sourceBtnOutlineText}>المعرض</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

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
              ارفع صوراً واضحة لوثيقة رسمية فقط: هوية وطنية أو جواز سفر، بالإضافة إلى صورة لوجهك. لا تُقبل صور أخرى.
            </Text>

            <Text style={styles.section}>نوع الوثيقة</Text>
            <View style={styles.docRow}>
              <Pressable
                onPress={() => selectDocType("id")}
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
                onPress={() => selectDocType("passport")}
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

            {docType === "id" && (
              <>
                <Text style={styles.section}>صور الهوية الوطنية (3 صور)</Text>
                {renderSlot("front", "الوجه الأمامي للهوية", frontPreview, "badge")}
                {renderSlot("back", "الوجه الخلفي للهوية", backPreview, "flip-to-back")}
                {renderSlot("face", "صورة وجهك (سيلفي)", facePreview, "face")}
              </>
            )}

            {docType === "passport" && (
              <>
                <Text style={styles.section}>صور جواز السفر (صورتان)</Text>
                {renderSlot("passport", "صورة جواز السفر", passportPreview, "menu-book")}
                {renderSlot("face", "صورة وجهك (سيلفي)", facePreview, "face")}
              </>
            )}

            <Pressable
              onPress={onConfirm}
              disabled={submitting}
              style={({ pressed }) => [
                styles.confirmBtn,
                (!isComplete || submitting) && styles.confirmDisabled,
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
  slotLabel: {
    color: CWAAX.muted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
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
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: CWAAX.surface,
  },
  uploadText: { color: CWAAX.muted, fontSize: 12, fontWeight: "700" },
  previewWrap: {},
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: CWAAX.surface,
  },
  sourceRow: { flexDirection: "row-reverse", gap: 10, marginTop: 12, width: "100%" },
  sourceBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: CWAAX.greenSoft,
  },
  sourceBtnText: { color: CWAAX.green, fontSize: 12, fontWeight: "800" },
  sourceBtnFilled: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: CWAAX.green,
  },
  sourceBtnFilledText: { color: CWAAX.white, fontSize: 12, fontWeight: "800" },
  sourceBtnOutline: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CWAAX.green,
    backgroundColor: CWAAX.white,
  },
  sourceBtnOutlineText: { color: CWAAX.green, fontSize: 12, fontWeight: "800" },
  confirmBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: CWAAX.green,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
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
