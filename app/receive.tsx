import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import QRCode from "qrcode";
import { ScreenContainer } from "@/components/screen-container";
import { IconButton } from "@/components/cwaax-ui";
import { NetworkIcon } from "@/components/network-icon";
import { UsdtIcon } from "@/components/usdt-icon";
import { CWAAX } from "@/constants/cwaax";
import { getNetwork } from "@/constants/networks";
import { DEPOSIT_ADDRESSES } from "@/constants/receive-addresses";
import { confirmAsync, notify } from "@/lib/_core/native-alert";
import { getSelectedNetwork, subscribeNetwork } from "@/lib/_core/network-store";
import { trpc } from "@/lib/trpc";

export default function ReceiveScreen() {
  const router = useRouter();
  const [networkCode, setNetworkCode] = useState(getSelectedNetwork());
  const [mode, setMode] = useState<"offchain" | "onchain">("onchain");
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentAmount, setSentAmount] = useState("");

  useEffect(() => subscribeNetwork(setNetworkCode), []);

  const network = getNetwork(networkCode === "internal" ? "TRC20" : networkCode);
  const address = DEPOSIT_ADDRESSES[network.code];

  const createDeposit = trpc.wallet.createDeposit.useMutation({
    onSuccess: () => {
      notify("تم ارسال طلبك");
      setShowConfirm(false);
      setSentAmount("");
    },
    onError: (err) => notify("تعذر الإرسال", err.message || "حاول مرة أخرى."),
  });

  const handleConfirmSent = async () => {
    const amount = Number(sentAmount);
    if (!amount || amount <= 0) {
      notify("تحقق من المبلغ", "أدخل المبلغ الذي أرسلته بالضبط.");
      return;
    }
    const confirmed = await confirmAsync(
      "تأكيد الإيداع",
      `المبلغ: ${amount} USDT\nالشبكة: ${network.name}`,
      "تأكيد وإرسال",
    );
    if (!confirmed) return;
    createDeposit.mutate({
      currency: "USDT",
      amount,
      network: network.code,
      paymentMethod: "on-chain-transfer",
    });
  };

  useEffect(() => {
    setQrUri(null);
    if (!address) return;
    QRCode.toDataURL(address, { margin: 1, width: 400, color: { dark: "#101A16", light: "#00000000" } })
      .then(setQrUri)
      .catch(() => setQrUri(null));
  }, [address]);

  const copyAddress = () => {
    if (!address) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(address);
      notify("تم النسخ", "تم نسخ العنوان إلى الحافظة.");
    } else {
      notify("العنوان", address);
    }
  };

  const handleShare = async () => {
    if (!address) return;

    const shareText = `عنواني لاستقبال USDT على شبكة \( {network.name}:\n \){address}`;

    if (typeof navigator === "undefined" || !("share" in navigator)) {
      copyAddress();
      return;
    }

    try {
      const shareData: ShareData & { files?: File[] } = {
        title: "عنوان استقبال CwaAX",
        text: shareText,
      };

      if (qrUri) {
        try {
          const blob = await (await fetch(qrUri)).blob();
          const file = new File([blob], "cwaax-address-qr.png", { type: "image/png" });
          if (!navigator.canShare || navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        } catch {
          // sharing without the image file is still fine
        }
      }

      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        copyAddress();
      }
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
          <Text style={styles.title}>استقبال</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>بدون رسوم غاز!</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable onPress={() => setMode("offchain")} style={[styles.tab, mode === "offchain" && styles.tabActive]}>
            <Text style={[styles.tabText, mode === "offchain" && styles.tabTextActive]}>Off-chain</Text>
          </Pressable>
          <Pressable onPress={() => setMode("onchain")} style={[styles.tab, mode === "onchain" && styles.tabActive]}>
            <Text style={[styles.tabText, mode === "onchain" && styles.tabTextActive]}>On-chain</Text>
          </Pressable>
        </View>

        {/* زر تأكيد الإيداع مباشرة تحت التبويبات وفي المنتصف */}
        {mode === "onchain" && address ? (
          !showConfirm ? (
            <Pressable
              onPress={() => setShowConfirm(true)}
              style={({ pressed }) => [styles.sentBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="check-circle-outline" size={17} color={CWAAX.white} />
              <Text style={styles.sentBtnText}>اضغط هنا للتأكيد ايداع</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmLabel}>كم المبلغ الذي أرسلته؟ (USDT)</Text>
              <TextInput
                value={sentAmount}
                onChangeText={setSentAmount}
                placeholder="مثال: 50"
                placeholderTextColor="#9CA8A1"
                keyboardType="decimal-pad"
                style={styles.confirmInput}
                textAlign="center"
              />
              <View style={styles.confirmActions}>
                <Pressable onPress={() => setShowConfirm(false)} style={styles.confirmCancel}>
                  <Text style={styles.confirmCancelText}>إلغاء</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmSent}
                  disabled={createDeposit.isPending}
                  style={({ pressed }) => [styles.confirmSubmit, (pressed || createDeposit.isPending) && styles.pressed]}
                >
                  <Text style={styles.confirmSubmitText}>
                    {createDeposit.isPending ? "جاري الإرسال..." : "تأكيد الإرسال"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        ) : null}

        {mode === "offchain" ? (
          <View style={styles.comingSoon}>
            <MaterialIcons name="hourglass-empty" size={30} color={CWAAX.muted} />
            <Text style={styles.comingSoonText}>
              التحويل الداخلي بين حسابات CwaAX قيد التطوير ولم يُفعَّل بعد.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.selectorsRow}>
              <View style={styles.selectorCol}>
                <Text style={styles.selectorLabel}>استقبال</Text>
                <View style={styles.selectorPill}>
                  <UsdtIcon size={20} />
                  <Text style={styles.selectorValue}>USDT</Text>
                </View>
              </View>

              <View style={styles.selectorCol}>
                <Text style={styles.selectorLabel}>على الشبكة</Text>
                <Pressable onPress={() => router.push("/network-select")} style={styles.selectorPill}>
                  <NetworkIcon network={network} size={20} />
                  <Text style={styles.selectorValue}>{network.name}</Text>
                  <MaterialIcons name="unfold-more" size={14} color={CWAAX.muted} />
                </Pressable>
              </View>
            </View>

            <View style={styles.qrCard}>
              <View style={styles.qrBrandRow}>
                <Pressable onPress={handleShare} hitSlop={8}>
                  <MaterialIcons name="ios-share" size={20} color={CWAAX.ink} />
                </Pressable>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.brand}>CwaAX</Text>
                  <Text style={styles.brandSub}>DIGITAL WALLET</Text>
                </View>
              </View>

              {!address ? (
                <View style={styles.noAddress}>
                  <MaterialIcons name="error-outline" size={30} color={CWAAX.muted} />
                  <Text style={styles.noAddressText}>
                    الاستقبال عبر شبكة {network.name} غير متاح حالياً.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.qrFrame}>
                    {qrUri && <Image source={{ uri: qrUri }} style={styles.qrImage} />}
                    <View style={styles.qrBadge}>
                      <NetworkIcon network={network} size={26} />
                    </View>
                  </View>

                  <Text style={styles.addressLabel}>عنوانك</Text>
                  <Pressable onPress={copyAddress}>
                    <Text style={styles.address}>{address}</Text>
                  </Pressable>

                  <Pressable onPress={copyAddress} style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}>
                    <MaterialIcons name="content-copy" size={16} color={CWAAX.green} />
                    <Text style={styles.copyBtnText}>نسخ العنوان</Text>
                  </Pressable>
                </>
              )}
            </View>

            {address ? (
              <View style={styles.noteRow}>
                <MaterialIcons name="info-outline" size={16} color={CWAAX.muted} />
                <Text style={styles.note}>
                  فقط رمز USDT على شبكة {network.name} المُرسل إلى هذا العنوان سيصل إلى محفظتك. إرسال أي عملة أو شبكة أخرى قد يؤدي لفقدانها.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { color: CWAAX.ink, fontSize: 19, fontWeight: "900" },
  badgeRow: { alignItems: "center", marginBottom: 16 },
  freeBadge: { backgroundColor: CWAAX.greenSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  freeBadgeText: { color: CWAAX.green, fontSize: 11, fontWeight: "800" },
  tabs: { flexDirection: "row", backgroundColor: CWAAX.surface, borderRadius: 14, padding: 4, marginBottom: 22 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 11 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: CWAAX.muted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: CWAAX.ink },
  comingSoon: { alignItems: "center", paddingVertical: 50, gap: 12 },
  comingSoonText: { color: CWAAX.muted, fontSize: 12, textAlign: "center", lineHeight: 19, paddingHorizontal: 20 },
  selectorsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  selectorCol: { flex: 1 },
  selectorLabel: { color: CWAAX.muted, fontSize: 10, textAlign: "right", marginBottom: 6 },
  selectorPill: { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: CWAAX.surface, borderRadius: 12, paddingHorizontal: 10, height: 42 },
  selectorValue: { color: CWAAX.ink, fontSize: 13, fontWeight: "800", flex: 1, textAlign: "right" },
  qrCard: { backgroundColor: CWAAX.surface, borderRadius: 22, padding: 18, alignItems: "center" },
  qrBrandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 },
  brand: { color: CWAAX.ink, fontSize: 20, fontWeight: "900" },
  brandSub: { color: CWAAX.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  qrFrame: { width: 220, height: 220, backgroundColor: "#fff", borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  qrImage: { width: 200, height: 200 },
  qrBadge: { position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  addressLabel: { color: CWAAX.muted, fontSize: 10, marginBottom: 8 },
  address: { color: CWAAX.green, fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 20 },
  copyBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 14, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: CWAAX.line },
  copyBtnText: { color: CWAAX.green, fontSize: 12, fontWeight: "800" },
  noAddress: { alignItems: "center", paddingVertical: 40, gap: 10 },
  noAddressText: { color: CWAAX.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 20 },
  noteRow: { flexDirection: "row-reverse", gap: 8, marginTop: 18, paddingHorizontal: 4 },
  note: { flex: 1, color: CWAAX.muted, fontSize: 10.5, lineHeight: 17, textAlign: "right" },
  pressed: { opacity: 0.6 },
  sentBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CWAAX.green,
    borderRadius: 14,
    height: 50,
    marginTop: 4,
    marginBottom: 18,
    alignSelf: "center",
    width: "100%",
  },
  sentBtnText: { color: CWAAX.white, fontSize: 13, fontWeight: "800" },
  confirmBox: {
    backgroundColor: CWAAX.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 18,
    width: "100%",
    alignSelf: "center",
  },
  confirmLabel: { color: CWAAX.ink, fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  confirmInput: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: CWAAX.line, height: 46, fontSize: 15, fontWeight: "800", color: CWAAX.ink },
  confirmHint: { color: CWAAX.muted, fontSize: 10, textAlign: "center", marginTop: 10, lineHeight: 16 },
  confirmActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  confirmCancel: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: CWAAX.line, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { color: CWAAX.ink, fontSize: 12, fontWeight: "800" },
  confirmSubmit: { flex: 2, height: 44, borderRadius: 12, backgroundColor: CWAAX.green, alignItems: "center", justifyContent: "center" },
  confirmSubmitText: { color: CWAAX.white, fontSize: 12, fontWeight: "800" },
});
