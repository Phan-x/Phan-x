import React, { useState } from "react";
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
import { router } from "expo-router";
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

const P = {
  bg: "#000000", card: "#1A1A1C", field: "#0F0F10", border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF", muted: "#8A8A8E", accent: "#FFE600", onAccent: "#14120A",
  soft: "rgba(255,230,0,0.12)",
};
const noOutline: any = { outlineStyle: "none", outlineWidth: 0 };

export default function LoginScreen() {
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      if (!data.token) {
        setLoading(false);
        alert("تعذر إنشاء جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى.");
        return;
      }
      // Save the JWT before changing routes so the auth guard can authenticate immediately.
      await Auth.setSessionToken(data.token);
      await Auth.setUserInfo(data.user as any);

      const verified = await isIdentityVerified(data.user.id);
      setLoading(false);
      router.replace(verified ? "/(tabs)" : "/verify-identity");
    },
    onError: (err) => {
      setLoading(false);
      alert(err.message || "بيانات تسجيل الدخول غير صحيحة");
    },
  });

  const handleLogin = async () => {
    const finalIdentifier =
      loginMethod === "email" ? identifier.trim() : phone.trim() ? `${countryCode}${phone.trim()}` : "";

    if (!finalIdentifier) {
      alert(loginMethod === "email" ? "يرجى إدخال البريد الإلكتروني" : "يرجى إدخال رقم الهاتف");
      return;
    }

    if (!password) {
      alert("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);
    loginMutation.mutate({ identifier: finalIdentifier, password });
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>C</Text>
            </View>

            <Text style={styles.brand}>CwaAX</Text>
            <Text style={styles.subtitle}>مرحباً بعودتك</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>تسجيل الدخول</Text>

            <Text style={styles.description}>
              قم بتسجيل الدخول إلى حسابك للمتابعة
            </Text>

            {/* Login method tabs */}
            <View style={styles.methodTabs}>
              <Pressable
                onPress={() => setLoginMethod("email")}
                style={[styles.methodTab, loginMethod === "email" && styles.methodTabActive]}
              >
                <Text style={[styles.methodTabText, loginMethod === "email" && styles.methodTabTextActive]}>
                  بريد إلكتروني
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLoginMethod("phone")}
                style={[styles.methodTab, loginMethod === "phone" && styles.methodTabActive]}
              >
                <Text style={[styles.methodTabText, loginMethod === "phone" && styles.methodTabTextActive]}>
                  رقم هاتف
                </Text>
              </Pressable>
            </View>

            {loginMethod === "email" ? (
              <>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <TextInput
              underlineColorAndroid="transparent"
                  style={[styles.input, noOutline]}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="أدخل البريد الإلكتروني"
                  placeholderTextColor={P.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textAlign="right"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>رقم الهاتف</Text>
                <View style={styles.phonePickerContainer}>
                  <View style={styles.phoneRow}>
                    <Pressable
                      onPress={() => setShowCountryPicker((v) => !v)}
                      style={({ pressed }) => [styles.countryBtn, pressed && styles.pressed]}
                    >
                      <MaterialIcons name={showCountryPicker ? "expand-less" : "expand-more"} size={18} color={P.muted} />
                      <Text style={styles.countryBtnText}>{countryCode}</Text>
                      <Text style={styles.countryFlag}>{COUNTRY_CODES.find((c) => c.code === countryCode)?.flag}</Text>
                    </Pressable>

                    <TextInput
              underlineColorAndroid="transparent"
                      style={[styles.input, styles.phoneInput, noOutline]}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="5XXXXXXXX"
                      placeholderTextColor={P.muted}
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
              </>
            )}

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
              underlineColorAndroid="transparent"
              style={[styles.input, noOutline]}
              value={password}
              onChangeText={setPassword}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor={P.muted}
              secureTextEntry={!showPassword}
              textAlign="right"
            />

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotContainer}
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={styles.forgot}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>

            {/* Login */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Text>
            </TouchableOpacity>

            {/* Register */}
            <View style={styles.registerRow}>
              <Text style={styles.registerQuestion}>
                ليس لديك حساب؟
              </Text>

              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.registerLink}> إنشاء حساب</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            باستخدامك CwaAX فإنك توافق على الشروط والأحكام وسياسة الخصوصية.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: P.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, justifyContent: "center" },

  header: { alignItems: "center", justifyContent: "center", marginBottom: 24, position: "relative" },
  backButton: { position: "absolute", right: 0, top: 4, width: 44, height: 44, borderRadius: 22, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 30, color: P.text, marginTop: -3 },

  logoContainer: { alignItems: "center", marginBottom: 28 },
  logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: P.accent, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  logoSmall: { width: 54, height: 54, borderRadius: 18, backgroundColor: P.accent, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  logoText: { color: P.onAccent, fontSize: 34, fontWeight: "900" },
  brand: { fontSize: 28, fontWeight: "900", color: P.text, letterSpacing: 0.5 },
  subtitle: { marginTop: 6, fontSize: 14, color: P.muted },

  card: { width: "100%", backgroundColor: P.card, borderRadius: 26, padding: 22, borderWidth: 1, borderColor: P.border },
  title: { fontSize: 26, fontWeight: "900", color: P.text, textAlign: "right", marginBottom: 8 },
  description: { fontSize: 14, color: P.muted, textAlign: "right", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: P.text, textAlign: "right", marginBottom: 8 },
  input: { height: 54, borderWidth: 1, borderColor: P.border, borderRadius: 16, backgroundColor: P.field, paddingHorizontal: 16, color: P.text, fontSize: 15, marginBottom: 18 },
  pressed: { opacity: 0.7 },

  methodTabs: { flexDirection: "row", backgroundColor: P.field, borderRadius: 16, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: P.border },
  methodTab: { flex: 1, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  methodTabActive: { backgroundColor: P.accent },
  methodTabText: { color: P.muted, fontSize: 14, fontWeight: "700" },
  methodTabTextActive: { color: P.onAccent, fontWeight: "900" },

  phonePickerContainer: { position: "relative", zIndex: 1000, elevation: 1000 },
  phoneRow: { width: "100%", flexDirection: "row", gap: 10, marginBottom: 18, alignItems: "stretch" },
  phoneInput: { flex: 1, width: 0, minWidth: 0, flexShrink: 1, marginBottom: 0 },
  countryBtn: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 4, height: 54, paddingHorizontal: 12, borderWidth: 1, borderColor: P.border, borderRadius: 16, backgroundColor: P.field },
  countryBtnText: { color: P.text, fontSize: 15, fontWeight: "700" },
  countryFlag: { fontSize: 18 },
  pickerBackdrop: { position: "absolute", top: 0, left: -400, right: -400, bottom: -2000, zIndex: 1001, elevation: 1001 },
  countryList: { position: "absolute", top: 60, right: 0, width: 230, backgroundColor: "#222225", borderRadius: 16, borderWidth: 1, borderColor: P.border, paddingVertical: 6, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, zIndex: 1002, elevation: 1002 },
  countryOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, paddingHorizontal: 14 },
  countryOptionActive: { backgroundColor: P.soft },
  countryOptionCode: { color: P.muted, fontSize: 13, fontWeight: "600" },
  countryOptionName: { color: P.text, fontSize: 14, fontWeight: "600" },

  passwordHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  showPassword: { color: P.accent, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  forgotContainer: { alignItems: "flex-start", marginTop: -5, marginBottom: 20 },
  forgot: { color: P.accent, fontSize: 13, fontWeight: "700" },

  termsRow: { marginTop: 2, marginBottom: 20 },
  termsText: { color: P.muted, fontSize: 12, lineHeight: 19, textAlign: "right" },

  loginButton: { height: 56, borderRadius: 28, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
  loginText: { color: P.onAccent, fontSize: 17, fontWeight: "900" },
  registerButton: { height: 56, borderRadius: 28, backgroundColor: P.accent, alignItems: "center", justifyContent: "center" },
  registerText: { color: P.onAccent, fontSize: 17, fontWeight: "900" },
  disabled: { opacity: 0.6 },

  registerRow: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", marginTop: 22 },
  registerQuestion: { color: P.muted, fontSize: 14 },
  registerLink: { color: P.accent, fontSize: 14, fontWeight: "900" },
  loginRow: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", marginTop: 22 },
  loginQuestion: { color: P.muted, fontSize: 14 },
  loginLink: { color: P.accent, fontSize: 14, fontWeight: "900" },

  footer: { textAlign: "center", color: P.muted, fontSize: 11, lineHeight: 18, marginTop: 24, paddingHorizontal: 15 },
});
