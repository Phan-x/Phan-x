import { createElement, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { CWAAX } from "@/constants/cwaax";
import { setPendingScan } from "@/lib/_core/qr-store";

/*
 * Real camera QR scanning implemented with the browser's built-in
 * BarcodeDetector API — no extra npm package required (adding one,
 * e.g. expo-camera, would need a pnpm-lock.yaml update that isn't
 * possible in this environment, and would break Cloudflare's
 * `pnpm install --frozen-lockfile` build step).
 *
 * Support: works on Chrome / Edge / most Android browsers. NOT
 * supported on Safari or iOS (no BarcodeDetector there) — those
 * users get a clear fallback message instead of a fake scanner.
 */
export default function QrScannerScreen() {
  const router = useRouter();
  const videoRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "unsupported" | "denied">("loading");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setStatus("unsupported");
      return;
    }

    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let stopped = false;

    const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play?.();
        }
        setStatus("scanning");

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              stopped = true;
              stream?.getTracks().forEach((t) => t.stop());
              setPendingScan(codes[0].rawValue);
              router.back();
              return;
            }
          } catch {
            // keep trying — a single failed frame isn't fatal
          }
          rafId = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => setStatus("denied"));

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialIcons name="close" size={24} color={CWAAX.ink} />
        </Pressable>
        <Text style={styles.title}>مسح رمز QR</Text>
        <View style={{ width: 24 }} />
      </View>

      {status === "unsupported" || status === "denied" ? (
        <View style={styles.fallback}>
          <MaterialIcons name="videocam-off" size={40} color={CWAAX.muted} />
          <Text style={styles.fallbackTitle}>
            {status === "denied" ? "تم رفض إذن الكاميرا" : "المسح غير مدعوم على هذا المتصفح"}
          </Text>
          <Text style={styles.fallbackSub}>
            {status === "denied"
              ? "فعّل إذن الكاميرا من إعدادات المتصفح ثم أعد المحاولة، أو أدخل العنوان يدوياً."
              : "متصفحات مثل Safari وآيفون لا تدعم مسح الرموز حالياً. أدخل العنوان يدوياً أو الصقه من الحافظة."}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>إدخال العنوان يدوياً</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          {Platform.OS === "web" &&
            createElement("video", {
              ref: videoRef,
              muted: true,
              playsInline: true,
              style: { width: "100%", height: 340, borderRadius: 20, objectFit: "cover", background: "#000" },
            })}
          <View style={styles.frame} pointerEvents="none" />
          <Text style={styles.hint}>{status === "loading" ? "تشغيل الكاميرا..." : "وجّه الكاميرا نحو رمز QR"}</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 20 },
  title: { color: CWAAX.ink, fontSize: 17, fontWeight: "900" },
  cameraWrap: { alignItems: "center" },
  frame: { position: "absolute", top: 60, width: 220, height: 220, borderWidth: 3, borderColor: CWAAX.green, borderRadius: 20 },
  hint: { color: CWAAX.muted, fontSize: 12, marginTop: 16, textAlign: "center" },
  fallback: { alignItems: "center", paddingTop: 60, paddingHorizontal: 10 },
  fallbackTitle: { color: CWAAX.ink, fontSize: 14, fontWeight: "900", marginTop: 16, textAlign: "center" },
  fallbackSub: { color: CWAAX.muted, fontSize: 12, marginTop: 10, textAlign: "center", lineHeight: 19 },
  backBtn: { backgroundColor: CWAAX.green, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, marginTop: 22 },
  backBtnText: { color: CWAAX.white, fontSize: 12, fontWeight: "800" },
});
