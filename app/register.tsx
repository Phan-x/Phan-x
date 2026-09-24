import React, { useEffect, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import * as Auth from "@/lib/_core/auth";
import { isIdentityVerified } from "@/lib/identity-verification";

const COUNTRY_CODES = [
  { code: "+966", flag: "🇸🇦", name: "السعودية" },
  { code: "+971", flag: "🇦🇪", name: "الإمارات" },
  { code: "+965", flag: "🇰🇼", name: "الكويت" },
  { code: "+973", flag: "🇧🇭", name: "البحرين" },
  { code: "+974", flag: "🇶🇦", name: "قطر" },
  { code: "+968", flag: "🇴🇲", name: "عُمان" },
  { code: "+20", flag: "🇪🇬", name: "مصر" },
  { code: "+962", flag: "🇯🇴", name: "الأردن" },
  { code: "+961", flag: "🇱🇧", name: "لبنان" },
  { code: "+964", flag: "🇮🇶", name: "العراق" },
  { code: "+963", flag: "🇸🇾", name: "سوريا" },
  { code: "+967", flag: "🇾🇪", name: "اليمن" },
  { code: "+212", flag: "🇲🇦", name: "المغرب" },
  { code: "+216", flag: "🇹🇳", name: "تونس" },
  { code: "+213", flag: "🇩🇿", name: "الجزائر" },
  { code: "+218", flag: "🇱🇾", name: "ليبيا" },
  { code: "+249", flag: "🇸🇩", name: "السودان" },
  { code: "+1", flag: "🇺🇸", name: "الولايات المتحدة" },
  { code: "+44", flag: "🇬🇧", name: "بريطانيا" },
  { code: "+90", flag: "🇹🇷", name: "تركيا" },
];

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ ref?: string }>();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // Pre-fill the referral code when someone opens a shared referral link
  // like /register?ref=CWAAX-AHMED928, so they don't have to type it in.
  useEffect(() => {
    if (params.ref && !referralCode) {
      setReferralCode(String(params.ref));
    }
  }, [params.ref]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      if (!data.token) {
        setLoading(false);
        alert("تعذر إنشاء جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى.");
        return;
      }

      // Persist the session and seed auth.me before navigation so AuthGate
      // never sees an empty user during the route transition.
      await Auth.setSessionToken(data.token);
      await Auth.setUserInfo(data.user as any);
      utils.auth.me.setData(undefined, data.user);

      // Verification remains local, but is scoped to this newly created account.
      // A different account on the same device will have its own verification key.
      const verified = await isIdentityVerified(data.user.id);
      setLoading(false);
      router.replace(verified ? "/(tabs)" : "/verify-identity");
    },
    onError: (err) => {
      setLoading(false);
      // Prefer the server message (now correctly passed for validation errors).
      const msg =
        err?.message &&
        err.message !== "حدث خطأ غير متوقع، الرجاء المحاولة مرة أخرى"
          ? err.message
          : "تعذر إنشاء الحساب. تحقق من البيانات أو جرّب بريدًا / اسم مستخدم آخر.";
      alert(msg);
    },
  });

  const handleRegister = async () => {
    if (!username.trim()) {
      alert("يرجى إدخال اسم المستخدم");
      return;
    }

    if (username.trim().length < 3) {
      alert("يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      alert("اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام و(_) فقط، بدون مسافات أو رموز");
      return;
    }

    if (!email.trim()) {
      alert("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!password) {
      alert("يرجى إدخال كلمة المرور");
      return;
    }

    if (password.length < 8) {
      alert("يجب أن تكون كلمة المرور 8 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      alert("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);

    registerMutation.mutate({
      name: username.trim(),
      username: username.trim(),
      email: email.trim(),
      password,
      referralCode: referralCode.trim() || undefined,
      phone: phone.trim() ? `${countryCode}${phone.trim()}` : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.logoSmall}>
              <Text style={styles.logoText}>C</Text>
            </View>

            <Text style={styles.brand}>CwaAX</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>إنشاء حساب</Text>

            <Text style={styles.description}>
              أنشئ حساب CwaAX جديد وابدأ الآن
            </Text>

            {/* Username */}
            <Text style={styles.label}>اسم المستخدم</Text>

            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="أدخل اسم المستخدم"
              placeholderTextColor="#8A8F98"
              autoCapitalize="none"
              textAlign="right"
            />

            {/* Email */}
            <Text style={styles.label}>البريد الإلكتروني</Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="أدخل البريد الإلكتروني"
              placeholderTextColor="#8A8F98"
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />

            {/* Phone */}
            <Text style={styles.label}>رقم الهاتف</Text>

            <View style={styles.phonePickerContainer}>
              <View style={styles.phoneRow}>
                <Pressable
                  onPress={() => setShowCountryPicker((v) => !v)}
                  style={({ pressed }) => [styles.countryBtn, pressed && styles.pressed]}
                >
                  <MaterialIcons name={showCountryPicker ? "expand-less" : "expand-more"} size={18} color="#8A8F98" />
                  <Text style={styles.countryBtnText}>{countryCode}</Text>
                  <Text style={styles.countryFlag}>{COUNTRY_CODES.find((c) => c.code === countryCode)?.flag}</Text>
                </Pressable>

                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="5XXXXXXXX"
                  placeholderTextColor="#8A8F98"
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              {showCountryPicker && (
                <>
                  <Pressable style={styles.pickerBackdrop} onPress={() => setShowCountryPicker(false)} />
                  <View style={styles.countryList}>
                    <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                      {COUNTRY_CODES.map((c) => (
                        <Pressable
                          key={c.name}
                          onPress={() => {
                            setCountryCode(c.code);
                            setShowCountryPicker(false);
                          }}
                          style={({ pressed }) => [
                            styles.countryOption,
                            c.code === countryCode && styles.countryOptionActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.countryOptionCode}>{c.code}</Text>
                          <Text style={styles.countryOptionName}>{c.name}</Text>
                          <Text style={styles.countryFlag}>{c.flag}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}
            </View>

            {/* Password */}
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>كلمة المرور</Text>

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPassword}>
                  {showPassword ? "إخفاء" : "إظهار"}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="8 أحرف على الأقل"
              placeholderTextColor="#8A8F98"
              secureTextEntry={!showPassword}
              textAlign="right"
            />

            {/* Confirm Password */}
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>تأكيد كلمة المرور</Text>

              <TouchableOpacity
                onPress={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >
                <Text style={styles.showPassword}>
                  {showConfirmPassword ? "إخفاء" : "إظهار"}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="أعد إدخال كلمة المرور"
              placeholderTextColor="#8A8F98"
              secureTextEntry={!showConfirmPassword}
              textAlign="right"
            />

            {/* Referral */}
            <Text style={styles.label}>كود الإحالة</Text>

            <TextInput
              style={styles.input}
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="اختياري"
              placeholderTextColor="#8A8F98"
              autoCapitalize="none"
              textAlign="right"
            />

            {/* Terms */}
            <View style={styles.termsRow}>
              <Text style={styles.termsText}>
                بإنشاء الحساب، أنت توافق على الشروط والأحكام وسياسة الخصوصية.
              </Text>
            </View>

            {/* Register */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.disabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerText}>
                {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
              </Text>
            </TouchableOpacity>

            {/* Login */}
            <View style={styles.loginRow}>
              <Text style={styles.loginQuestion}>
                لديك حساب بالفعل؟
              </Text>

              <TouchableOpacity onPress={() => router.push("/login")}>
                <Text style={styles.loginLink}> تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footer}>CwaAX</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 25,
  },

  header: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
    position: "relative",
  },

  backButton: {
    position: "absolute",
    left: 0,
    top: 5,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 30,
    color: "#111827",
    marginTop: -3,
  },

  logoSmall: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },

  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E9EBEF",
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    textAlign: "right",
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: "#737984",
    textAlign: "right",
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#252A32",
    textAlign: "right",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
    paddingHorizontal: 15,
    color: "#111827",
    fontSize: 15,
    marginBottom: 17,
  },

  pressed: { opacity: 0.7 },

  phonePickerContainer: {
    position: "relative",
    zIndex: 1000,
    elevation: 1000,
  },

  phoneRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 17,
    alignItems: "stretch",
  },

  phoneInput: {
    flex: 1,
    width: 0,
    minWidth: 0,
    flexShrink: 1,
    marginBottom: 0,
  },

  countryBtn: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 52,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#DDE1E7",
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
  },

  countryBtnText: { color: "#111827", fontSize: 15, fontWeight: "700" },

  countryFlag: { fontSize: 18 },

  pickerBackdrop: {
    position: "absolute",
    top: 0,
    left: -400,
    right: -400,
    bottom: -2000,
    zIndex: 1001,
    elevation: 1001,
  },

  countryList: {
    position: "absolute",
    top: 58,
    right: 0,
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E8EC",
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    zIndex: 1002,
    elevation: 1002,
  },

  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  countryOptionActive: { backgroundColor: "#F0FBF6" },

  countryOptionCode: { color: "#6B7280", fontSize: 13, fontWeight: "600" },

  countryOptionName: { color: "#111827", fontSize: 14, fontWeight: "600" },

  passwordHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  showPassword: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  termsRow: {
    marginTop: 2,
    marginBottom: 20,
  },

  termsText: {
    color: "#777D87",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "right",
  },

  registerButton: {
    height: 53,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  disabled: {
    opacity: 0.6,
  },

  registerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  loginRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 23,
  },

  loginQuestion: {
    color: "#737984",
    fontSize: 14,
  },

  loginLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
  },

  footer: {
    textAlign: "center",
    color: "#A0A4AC",
    fontSize: 12,
    marginTop: 25,
  },
});
