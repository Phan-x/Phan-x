import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { notify } from "@/lib/_core/native-alert";

const P = {
  bg: "#000000", card: "#1A1A1C", border: "rgba(255,255,255,0.10)", text: "#FFFFFF",
  muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A", soft: "rgba(255,230,0,0.12)",
};
const noOutline: any = { outlineStyle: "none", outlineWidth: 0 };

/*
 * ⚠️ REPLACE THESE with the real support contact details before
 * publishing. TELEGRAM_USERNAME without the "@" (e.g. "CwaAXSupport"),
 * PHONE_NUMBER in international format with no spaces or "+" (e.g.
 * "9665XXXXXXXX") since that's what wa.me / tel: links require.
 */
const TELEGRAM_USERNAME = "CwaAXx";

/*
 * Instant, automated Q&A about the app itself. Each entry has keywords
 * used to match a free-typed question to a ready answer — no admin,
 * no database, no waiting. If nothing matches, the user is pointed to
 * Telegram / WhatsApp directly.
 */
const FAQS: { keywords: string[]; q: string; a: string }[] = [
  { keywords: ["ايداع", "إيداع", "اضيف رصيد", "أضيف رصيد", "شحن"], q: "كيف أضيف رصيداً؟", a: "من الصفحة الرئيسية اضغط \"إيداع\"، اختر العملة والشبكة وطريقة الدفع، ثم أدخل المبلغ وأرسل الطلب. يقوم فريقنا بمراجعته واعتماده، وبعدها يُضاف الرصيد لحسابك تلقائياً." },
  { keywords: ["سحب", "اسحب"], q: "كيف أسحب رصيدي؟", a: "من الصفحة الرئيسية اضغط \"سحب\"، أدخل عنوان المحفظة والشبكة والمبلغ. يخضع الطلب لمراجعة إدارية قبل التنفيذ لأسباب أمنية." },
  { keywords: ["سجل", "العمليات", "تاريخ المعاملات", "الحركات"], q: "أين أجد سجل العمليات؟", a: "من صفحة الملف الشخصي اضغط \"سجل العمليات\"، أو من الصفحة الرئيسية اضغط \"السجل\" أعلى بطاقة الرصيد." },
  { keywords: ["مصادقة ثنائية", "2fa", "تحقق بخطوتين"], q: "كيف أفعّل المصادقة الثنائية؟", a: "من الإعدادات → المصادقة الثنائية، فعّل المفتاح. (ملاحظة: هذه الميزة قيد التطوير ولم تُفعَّل بشكل كامل بعد.)" },
  { keywords: ["كلمة المرور", "الباسورد", "غير كلمة السر"], q: "كيف أغيّر كلمة المرور؟", a: "من صفحة الملف الشخصي اضغط \"تغيير كلمة المرور\"، أدخل كلمة المرور الحالية والجديدة وتأكيدها." },
  { keywords: ["عملة", "اللغة", "لغة التطبيق"], q: "كيف أغيّر العملة أو اللغة؟", a: "من الإعدادات → العملة الأصلية أو اللغة، اختر ما يناسبك ويُحفظ تلقائياً." },
  { keywords: ["طلبي معلق", "لسا ما اجى", "متى يوافق", "تأخر الطلب"], q: "طلبي معلّق منذ فترة، متى يُعتمد؟", a: "طلبات الإيداع والسحب تُراجع يدوياً من فريقنا وعادة تُعتمد خلال ساعات العمل. إذا تأخر الطلب أكثر من يوم، تواصل معنا مباشرة عبر تليجرام أدناه." },
  { keywords: ["رسوم", "عمولة"], q: "هل توجد رسوم على العمليات؟", a: "الرسوم إن وجدت تظهر بوضوح قبل تأكيد أي عملية إيداع أو سحب داخل التطبيق." },
];

type ChatMsg = { id: string; from: "user" | "bot"; text: string; contact?: boolean };

function findAnswer(text: string): string | null {
  const clean = text.trim().toLowerCase();
  for (const item of FAQS) {
    if (item.keywords.some((k) => clean.includes(k.toLowerCase()))) {
      return item.a;
    }
  }
  return null;
}

export default function SupportScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([
    { id: "welcome", from: "bot", text: "مرحباً 👋 أنا مساعد CwaAX الآلي. اسألني عن أي شيء يخص التطبيق (الإيداع، السحب، كلمة المرور...) وسأجيبك فوراً." },
  ]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [chat.length]);

  const openTelegram = () => {
    Linking.openURL(`https://t.me/${TELEGRAM_USERNAME}`).catch(() =>
      notify("تعذر الفتح", "تأكد من تثبيت تطبيق تليجرام."),
    );
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text) {
      notify("اكتب رسالة", "أدخل سؤالك أولاً.");
      return;
    }
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, from: "user", text };
    setMessage("");
    const answer = findAnswer(text);
    if (answer) {
      setChat((c) => [...c, userMsg, { id: `b-${Date.now()}`, from: "bot", text: answer }]);
    } else {
      setChat((c) => [
        ...c,
        userMsg,
        { id: `b-${Date.now()}`, from: "bot", text: "لم أجد إجابة جاهزة لسؤالك. تواصل معنا مباشرة عبر تليجرام:", contact: true },
      ]);
    }
  };

  const askFaq = (item: (typeof FAQS)[number]) => {
    setChat((c) => [
      ...c,
      { id: `u-${Date.now()}`, from: "user", text: item.q },
      { id: `b-${Date.now()}`, from: "bot", text: item.a },
    ]);
  };

  const TelegramButton = ({ label }: { label: string }) => (
    <Pressable onPress={openTelegram} style={({ pressed }) => [styles.tgBtn, pressed && { opacity: 0.75 }]}>
      <View style={styles.tgIcon}>
        <MaterialIcons name="send" size={16} color={P.onAccent} />
      </View>
      <Text style={styles.tgText}>{label}</Text>
      <MaterialIcons name="chevron-left" size={22} color={P.text} />
    </Pressable>
  );

  return (
    <ScreenContainer className="px-0" edges={["top", "left", "right"]}>
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.circleBtn} hitSlop={8}>
            <MaterialIcons name="arrow-forward" size={22} color={P.text} />
          </Pressable>
          <Text style={styles.title}>مركز الدعم</Text>
          <View style={styles.circleBtn} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {chat.map((m) => (
            <View key={m.id} style={{ marginBottom: 12 }}>
              <View style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleBot]}>
                {m.from === "bot" && (
                  <View style={styles.botTag}>
                    <MaterialIcons name="smart-toy" size={14} color={P.accent} />
                    <Text style={styles.botTagText}>رد آلي</Text>
                  </View>
                )}
                <Text style={[styles.bubbleText, m.from === "user" && { color: P.onAccent, fontWeight: "700" }]}>{m.text}</Text>
              </View>
              {m.contact && (
                <View style={{ marginTop: 8 }}>
                  <TelegramButton label="تليجرام" />
                </View>
              )}
            </View>
          ))}

          <Text style={styles.section}>أسئلة شائعة</Text>
          <View style={styles.faqWrap}>
            {FAQS.map((item) => (
              <Pressable key={item.q} onPress={() => askFaq(item)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
                <Text style={styles.chipText}>{item.q}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.section, { marginTop: 24 }]}>تواصل مباشر</Text>
          <TelegramButton label={`@${TELEGRAM_USERNAME}`} />
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="اكتب سؤالك..."
            placeholderTextColor={P.muted}
            style={[styles.input, noOutline]}
            underlineColorAndroid="transparent"
            textAlign="right"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable onPress={handleSend} style={({ pressed }) => [styles.send, pressed && { opacity: 0.8 }]}>
            <MaterialIcons name="send" size={20} color={P.onAccent} style={{ transform: [{ scaleX: -1 }] }} />
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: P.card, borderWidth: 1, borderColor: P.border },
  title: { color: P.text, fontSize: 20, fontWeight: "900" },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  bubble: { maxWidth: "88%", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: P.card, borderWidth: 1, borderColor: P.border, borderTopRightRadius: 6 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: P.accent, borderTopLeftRadius: 6 },
  botTag: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: P.soft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 10 },
  botTagText: { color: P.accent, fontSize: 11, fontWeight: "800" },
  bubbleText: { color: P.text, fontSize: 15, lineHeight: 25, textAlign: "right" },
  section: { color: P.muted, fontSize: 13, fontWeight: "700", textAlign: "right", marginTop: 8, marginBottom: 12 },
  faqWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: P.card, borderWidth: 1, borderColor: P.border },
  chipText: { color: P.text, fontSize: 13, fontWeight: "600" },
  tgBtn: { flexDirection: "row", alignItems: "center", gap: 12, height: 58, borderRadius: 18, backgroundColor: P.card, borderWidth: 1, borderColor: "rgba(255,230,0,0.35)", paddingHorizontal: 14 },
  tgIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
  tgText: { flex: 1, color: P.text, fontSize: 16, fontWeight: "800", textAlign: "right" },
  composer: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: P.border, backgroundColor: P.bg },
  input: { flex: 1, minWidth: 0, height: 50, borderRadius: 25, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, color: P.text, fontSize: 14, paddingHorizontal: 18 },
  send: { width: 50, height: 50, borderRadius: 25, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
});
