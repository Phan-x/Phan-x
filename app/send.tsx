import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { NetworkIcon } from "@/components/network-icon";
import { getNetwork } from "@/constants/networks";
import { confirmAsync } from "@/lib/_core/native-alert";
import { getSelectedNetwork, subscribeNetwork } from "@/lib/_core/network-store";
import { consumePendingScan } from "@/lib/_core/qr-store";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

/* ---------- الألوان: غيّر P إلى LIGHT للحصول على النسخة الفاتحة ---------- */
const DARK = {
  bg: "#000000",
  card: "#1A1A1C",
  field: "#111113",
  border: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "#8A8A8E",
  accent: "#FFE600",
  onAccent: "#14120A",
  segActive: "#2C2C2F",
  disabledBg: "#232326",
  disabledText: "#6B6B70",
  danger: "#FF5C5C",
};
const LIGHT = {
  bg: "#FFFFFF",
  card: "#F6F6F9",
  field: "#FFFFFF",
  border: "#E3E4E9",
  text: "#111214",
  muted: "#8A8F98",
  accent: "#F0B90B",
  onAccent: "#14120A",
  segActive: "#FFFFFF",
  disabledBg: "#EEEFF3",
  disabledText: "#B4B7C0",
  danger: "#E5484D",
};
const P = DARK;
const YELLOW = "#FFE600";
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none", outlineWidth: 0 } as object) : null;

export default function SendScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [networkCode, setNetworkCode] = useState(getSelectedNetwork());
  const [tab, setTab] = useState<"normal" | "internal">("normal");
  const [amountText, setAmountText] = useState("");
  const [address, setAddress] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const balances = trpc.wallet.balances.useQuery(undefined, { enabled: !!user });
  const usdt = Number(balances.data?.find((b: any) => b.currency === "USDT")?.amount ?? 0);

  const createWithdrawal = trpc.wallet.createWithdrawal.useMutation();

  useEffect(() => subscribeNetwork(setNetworkCode), []);

  useFocusEffect(
    useCallback(() => {
      const scanned = consumePendingScan();
      if (scanned) setAddress(scanned);
    }, []),
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const network = getNetwork(networkCode);
  const hasNetwork = !network.internal;
  const amount = Number(amountText.replace(",", ".")) || 0;
  const addressValid = address.trim().length >= 20;
  const overBalance = amount > usdt;
  const canSend = amount > 0 && !overBalance && addressValid && hasNetwork && !createWithdrawal.isPending;

  const onAmountChange = (t: string) => {
    const clean = t.replace(",", ".").replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    setAmountText(parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : clean);
  };

  const setMax = () => setAmountText(String(Math.floor(usdt * 100) / 100));

  const pasteAddress = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          setAddress(text);
          showToast("تم لصق العنوان");
          return;
        }
      }
    } catch {
      /* ignore */
    }
    showToast("الصق العنوان يدوياً في الحقل");
  };

  const handleSendPress = async () => {
    if (createWithdrawal.isPending) return;

    if (!hasNetwork) {
      showToast("اختر شبكة بلوكتشين (مثل TRC20)");
      return;
    }
    if (!amount || amount <= 0) {
      showToast("أدخل مبلغاً صحيحاً أولاً");
      return;
    }
    if (amount > usdt) {
      showToast("الرصيد غير كافٍ");
      return;
    }
    if (address.trim().length < 20) {
      showToast("أدخل عنوان محفظة صالحاً (20 حرفاً على الأقل)");
      return;
    }

    const ok = await confirmAsync(
      "تأكيد السحب",
      `المبلغ: ${amount} USDT\nالشبكة: ${network.name}\nالعنوان: ${address.trim()}`,
    );
    if (!ok) return;

    createWithdrawal.mutate(
      {
        currency: "USDT",
        amount,
        network: network.code,
        address: address.trim(),
      },
      {
        onSuccess: () => {
          showToast(`تم إرسال طلب ${amount} USDT — قيد المراجعة`);
          setAmountText("");
          setAddress("");
          setTimeout(() => router.back(), 1500);
        },
        onError: (err) => {
          showToast(err.message || "تعذر إرسال الطلب — تحقق من الاتصال");
        },
      },
    );
  };

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={styles.root}>
        {/* الهيدر */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
            <MaterialIcons name="chevron-right" size={30} color={P.text} />
          </Pressable>
          <Text style={styles.title}>سحب USDT</Text>
          <View style={styles.headerIcons}>
            <Pressable onPress={() => router.push("/transactions")} hitSlop={10} style={styles.headerBtn}>
              <MaterialIcons name="receipt-long" size={24} color={P.text} />
            </Pressable>
            <Pressable onPress={() => router.push("/support")} hitSlop={10} style={styles.headerBtn}>
              <MaterialIcons name="help-outline" size={25} color={P.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* التبويبات */}
          <View style={styles.segment}>
            <Pressable onPress={() => setTab("normal")} style={[styles.segItem, tab === "normal" && styles.segItemActive]}>
              <Text style={[styles.segText, tab === "normal" && styles.segTextActive]}>نقل عادي</Text>
            </Pressable>
            <Pressable onPress={() => setTab("internal")} style={[styles.segItem, tab === "internal" && styles.segItemActive]}>
              <Text style={[styles.segText, tab === "internal" && styles.segTextActive]}>التحويل داخل المحفظة</Text>
            </Pressable>
          </View>

          {tab === "internal" ? (
            <View style={styles.comingSoon}>
              <MaterialIcons name="hourglass-empty" size={34} color={P.muted} />
              <Text style={styles.comingSoonText}>التحويل الداخلي بين حسابات CwaAX قيد التطوير ولم يُفعَّل بعد.</Text>
            </View>
          ) : (
            <>
              {/* الشبكة */}
              <Text style={styles.label}>الشبكة</Text>
              <Pressable onPress={() => router.push("/network-select")} style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
                {hasNetwork ? (
                  <View style={styles.netValue}>
                    <NetworkIcon network={network} size={26} />
                    <Text style={styles.netText}>{network.chain} ({network.name})</Text>
                  </View>
                ) : (
                  <Text style={styles.placeholder}>اختر الشبكة</Text>
                )}
                <MaterialIcons name="arrow-drop-down" size={28} color={P.muted} />
              </Pressable>

              {/* العنوان */}
              <Text style={styles.label}>العنوان</Text>
              <View style={[styles.field, addressValid && styles.fieldValid]}>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="الصق عنوان المحفظة"
                  placeholderTextColor={P.muted}
                  style={[styles.input, noOutline]}
                  textAlign="right"
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColorAndroid="transparent"
                  selectionColor={YELLOW}
                />
                <View style={styles.fieldIcons}>
                  <Pressable onPress={pasteAddress} hitSlop={8} style={styles.iconBtn}>
                    <MaterialIcons name="content-paste" size={20} color={P.text} />
                  </Pressable>
                  <View style={styles.vDivider} />
                  <Pressable onPress={() => router.push("/qr-scanner")} hitSlop={8} style={styles.iconBtn}>
                    <MaterialIcons name="qr-code-scanner" size={22} color={P.text} />
                  </Pressable>
                </View>
              </View>

              {/* المبلغ */}
              <Text style={styles.label}>المبلغ</Text>
              <View style={[styles.field, overBalance && styles.fieldError]}>
                <TextInput
                  value={amountText}
                  onChangeText={onAmountChange}
                  placeholder={`متاح ${usdt.toFixed(2)}`}
                  placeholderTextColor={P.muted}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.amountInput, noOutline]}
                  textAlign="right"
                  underlineColorAndroid="transparent"
                  selectionColor={YELLOW}
                />
                <Text style={styles.unit}>USDT</Text>
                <View style={styles.vDivider} />
                <Pressable onPress={setMax} hitSlop={8}>
                  <Text style={styles.maxText}>الكل</Text>
                </Pressable>
              </View>
              {overBalance ? <Text style={styles.errorText}>الرصيد غير كافٍ</Text> : null}

              {/* ملخص */}
              <View style={styles.summary}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>الرصيد المتاح</Text>
                  <Text style={styles.sumValue}>{usdt.toFixed(2)} USDT</Text>
                </View>
                <View style={styles.sumDivider} />
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>المبلغ المطلوب سحبه</Text>
                  <Text style={styles.sumValue}>{amount > 0 ? amount : "--"} USDT</Text>
                </View>
              </View>

              {/* ملاحظة */}
              <View style={styles.notice}>
                <MaterialIcons name="info-outline" size={20} color={P.muted} />
                <Text style={styles.noticeText}>
                  يتم تنفيذ التحويلات العادية عبر شبكة البلوكتشين، ويتوقف وقت الوصول على عدد التأكيدات التي تتطلبها الشبكة. يخضع الطلب للمراجعة قبل التنفيذ.
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* زر السحب */}
        {tab === "normal" ? (
          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleSendPress}
              disabled={createWithdrawal.isPending}
              style={({ pressed }) => [styles.submit, canSend ? styles.submitActive : styles.submitOff, pressed && styles.pressed]}
            >
              <Text style={[styles.submitText, canSend ? styles.submitTextActive : styles.submitTextOff]}>
                {createWithdrawal.isPending ? "جاري الإرسال..." : "اسحب الآن"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <MaterialIcons name="info-outline" size={18} color="#FFFFFF" />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  pressed: { opacity: 0.65 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  title: { color: P.text, fontSize: 19, fontWeight: "800" },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },

  segment: { flexDirection: "row", backgroundColor: P.card, borderRadius: 14, padding: 4, marginBottom: 22 },
  segItem: { flex: 1, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  segItemActive: { backgroundColor: P.segActive },
  segText: { color: P.muted, fontSize: 14, fontWeight: "700" },
  segTextActive: { color: P.text, fontWeight: "800" },

  label: { color: P.muted, fontSize: 14, textAlign: "right", marginBottom: 10, marginTop: 6 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, borderRadius: 16, borderWidth: 1.5,
    borderColor: P.border, backgroundColor: P.field, paddingHorizontal: 14, marginBottom: 14, overflow: "hidden",
  },
  fieldValid: { borderColor: "rgba(255,230,0,0.6)" },
  fieldError: { borderColor: P.danger },
  netValue: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  netText: { color: P.text, fontSize: 16, fontWeight: "700" },
  placeholder: { flex: 1, color: P.muted, fontSize: 16, textAlign: "right" },
  input: { flex: 1, minWidth: 0, color: P.text, fontSize: 15, paddingVertical: 12, paddingHorizontal: 0, borderWidth: 0, backgroundColor: "transparent" },
  amountInput: { fontSize: 18, fontWeight: "700" },
  fieldIcons: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  vDivider: { width: 1, height: 22, backgroundColor: P.border },
  unit: { color: P.muted, fontSize: 14, fontWeight: "700" },
  maxText: { color: P.accent, fontSize: 15, fontWeight: "800" },
  errorText: { color: P.danger, fontSize: 12, textAlign: "right", marginTop: -6, marginBottom: 10 },

  summary: { backgroundColor: P.card, borderRadius: 18, paddingHorizontal: 16, marginTop: 6, marginBottom: 14 },
  sumRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15 },
  sumDivider: { height: 1, backgroundColor: P.border },
  sumLabel: { color: P.muted, fontSize: 14 },
  sumValue: { color: P.text, fontSize: 15, fontWeight: "700" },

  notice: { flexDirection: "row", gap: 10, backgroundColor: P.card, borderRadius: 16, padding: 14, alignItems: "flex-start" },
  noticeText: { flex: 1, color: P.muted, fontSize: 12.5, lineHeight: 20, textAlign: "right" },

  comingSoon: { alignItems: "center", paddingVertical: 70, gap: 14 },
  comingSoonText: { color: P.muted, fontSize: 13, textAlign: "center", lineHeight: 21, paddingHorizontal: 24 },

  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18,
    backgroundColor: P.bg,
  },
  submit: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  submitActive: { backgroundColor: YELLOW },
  submitOff: { backgroundColor: P.disabledBg },
  submitText: { fontSize: 17, fontWeight: "900" },
  submitTextActive: { color: "#14120A" },
  submitTextOff: { color: P.disabledText },

  toast: {
    position: "absolute", left: 20, right: 20, bottom: 96, backgroundColor: "#2A2A2D", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 1000,
  },
  toastText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", flex: 1, textAlign: "right" },
});
