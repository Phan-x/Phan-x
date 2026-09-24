import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconButton } from "@/components/cwaax-ui";
import { CWAAX } from "@/constants/cwaax";
import { notify } from "@/lib/_core/native-alert";

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
        {
          id: `b-${Date.now()}`,
          from: "bot",
          text: "لم أجد إجابة جاهزة لسؤالك. تواصل معنا مباشرة عبر تليجرام:",
          contact: true,
        },
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

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <IconButton icon="arrow-forward" label="رجوع" onPress={() => router.back()} />
        <Text style={styles.title}>مركز الدعم</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {chat.map((m) => (
          <View key={m.id}>
            <View style={[styles.bubble, m.from === "user" ? styles.bubbleUser : styles.bubbleBot]}>
              {m.from === "bot" && (
                <View style={styles.botTag}>
                  <MaterialIcons name="smart-toy" size={12} color={CWAAX.green} />
                  <Text style={styles.botTagText}>رد آلي</Text>
                </View>
              )}
              <Text style={[styles.bubbleText, m.from === "user" && styles.bubbleTextUser]}>{m.text}</Text>
            </View>

            {m.contact && (
              <View style={styles.contactRow}>
                <Pressable onPress={openTelegram} style={({ pressed }) => [styles.contactBtn, styles.telegramBtn, pressed && styles.pressed]}>
                  <MaterialIcons name="send" size={16} color={CWAAX.white} />
                  <Text style={styles.contactBtnText}>تليجرام</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <Text style={styles.sectionTitle}>أو اختر من الأسئلة الشائعة</Text>
        <View style={styles.faqWrap}>
          {FAQS.map((item) => (
            <Pressable
              key={item.q}
              onPress={() => askFaq(item)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Text style={styles.chipText}>{item.q}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.directContact}>
          <Text style={styles.sectionTitle}>تواصل مباشر</Text>
          <View style={styles.contactRow}>
            <Pressable onPress={openTelegram} style={({ pressed }) => [styles.contactBtn, styles.telegramBtn, pressed && styles.pressed]}>
              <MaterialIcons name="send" size={16} color={CWAAX.white} />
              <Text style={styles.contactBtnText}>@{TELEGRAM_USERNAME}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="اكتب سؤالك..."
          placeholderTextColor="#9CA8A1"
          style={styles.input}
          textAlign="right"
          onSubmitEditing={handleSend}
        />
        <Pressable onPress={handleSend} style={({ pressed }) => [styles.send, pressed && styles.pressed]}>
          <MaterialIcons name="send" size={18} color={CWAAX.white} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12 },
  title: { color: CWAAX.ink, fontSize: 19, fontWeight: "900" },
  bubble: { maxWidth: "86%", borderRadius: 17, padding: 12, marginBottom: 8 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: CWAAX.green, borderTopRightRadius: 4 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: CWAAX.surface, borderTopLeftRadius: 4 },
  botTag: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 5 },
  botTagText: { color: CWAAX.green, fontSize: 9, fontWeight: "800" },
  bubbleText: { color: CWAAX.ink, fontSize: 12, lineHeight: 20, textAlign: "right" },
  bubbleTextUser: { color: CWAAX.white },
  sectionTitle: { color: CWAAX.muted, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 6, marginBottom: 10 },
  faqWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  chip: { borderWidth: 1, borderColor: CWAAX.line, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 },
  chipText: { color: CWAAX.ink, fontSize: 11, fontWeight: "700" },
  directContact: { marginTop: 26, borderTopWidth: 1, borderTopColor: CWAAX.line, paddingTop: 16 },
  contactRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12 },
  telegramBtn: { backgroundColor: "#229ED9" },
  whatsappBtn: { backgroundColor: "#25D366" },
  contactBtnText: { color: CWAAX.white, fontSize: 12, fontWeight: "800" },
  composer: { borderTopWidth: 1, borderTopColor: CWAAX.line, paddingTop: 10, paddingBottom: 10, flexDirection: "row", gap: 8 },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: CWAAX.line, borderRadius: 14, paddingHorizontal: 13, color: CWAAX.ink, fontSize: 12 },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: CWAAX.green, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.62 },
});
