import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CWAAX } from "@/constants/cwaax";
import { NetworkIcon } from "@/components/network-icon";

export type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

export function CwaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoBadge}><Text style={styles.logoLetter}>C</Text></View>
      {!compact && <Text style={styles.logoText}>Cwa<Text style={styles.logoAccent}>AX</Text></Text>}
    </View>
  );
}

export function IconButton({ icon, onPress, label, tone = "light" }: { icon: IconName; onPress?: () => void; label?: string; tone?: "light" | "green" }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, tone === "green" && styles.iconButtonGreen, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={21} color={tone === "green" ? CWAAX.white : CWAAX.ink} />
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: object; onPress?: () => void }) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return content;
  return <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.cardPressed]}>{content}</Pressable>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action && (onAction ? <Pressable onPress={onAction} style={({ pressed }) => [pressed && styles.pressed]}><Text style={styles.sectionAction}>{action}</Text></Pressable> : <Text style={styles.sectionAction}>{action}</Text>)}
    </View>
  );
}

/* ================================================================ */
/*  CoinMark — يستخدم NetworkIcon لكل العملات والشبكات المعروفة     */
/* ================================================================ */

const KNOWN_CODES = new Set([
  "TRC20", "TRON", "ERC20", "ETH", "ETHEREUM", "OPTIMISM", "OP",
  "ARETH", "ARBITRUM", "ARB", "AVAX", "AVALANCHE", "OPBNB", "BEP20", "BNB",
  "SOL", "SOLANA", "TON", "POLYGON", "MATIC", "CELO",
  "USDT", "BTC", "BITCOIN", "DOGE", "DOGECOIN", "XLM", "STELLAR",
  "XRP", "ADA", "TRX", "DOT", "LINK", "LTC", "BCH", "NEAR", "UNI", "ATOM", "SHIB",
]);

/*
 * All coin logos come from CoinCap's public icon CDN (proven reliable
 * elsewhere in this app — see NetworkIcon/UsdtIcon). Every symbol maps
 * to https://assets.coincap.io/assets/icons/{symbol}@2x.png.
 */
const COIN_ICON_SYMBOLS: Record<string, string> = {
  USDT: "usdt", BTC: "btc", BITCOIN: "btc", DOGE: "doge", DOGECOIN: "doge",
  XLM: "xlm", STELLAR: "xlm", ETH: "eth", ETHEREUM: "eth", BNB: "bnb",
  SOL: "sol", SOLANA: "sol", XRP: "xrp", ADA: "ada", TRX: "trx", TRON: "trx",
  TON: "ton", AVAX: "avax", AVALANCHE: "avax", DOT: "dot", LINK: "link",
  MATIC: "matic", POLYGON: "matic", LTC: "ltc", BCH: "bch", NEAR: "near",
  UNI: "uni", ATOM: "atom", SHIB: "shib",
};

function coinIconUrl(symbol: string): string {
  return `https://assets.coincap.io/assets/icons/${symbol}@2x.png`;
}

export function CoinMark({ mark, color, size = 42 }: { mark: string; color: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const upper = (mark || "").toUpperCase();
  const iconSymbol = COIN_ICON_SYMBOLS[upper];

  if (iconSymbol && !failed) {
    return (
      <Image
        source={{ uri: coinIconUrl(iconSymbol) }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#F2F3F2" }}
        onError={() => setFailed(true)}
      />
    );
  }

  if (!iconSymbol && KNOWN_CODES.has(upper)) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
        <NetworkIcon network={{ code: upper, name: upper, chain: upper, feeUsd: 0, feeToken: "", color }} size={size} />
      </View>
    );
  }

  return (
    <View style={[styles.coin, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.coinText, { fontSize: size * 0.4 }]}>
        {(mark || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export function TrendLine({ color = CWAAX.green }: { color?: string }) {
  return <View style={styles.trendLine}>{[18, 11, 15, 7, 12, 4, 8, 2, 6].map((height, index) => <View key={index} style={[styles.trendBar, { height, backgroundColor: color, opacity: 0.35 + index * 0.07 }]} />)}</View>;
}

export function StatusPill({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "warning" | "danger" }) {
  const toneStyle = tone === "warning" ? styles.warningPill : tone === "danger" ? styles.dangerPill : styles.successPill;
  const textStyle = tone === "warning" ? styles.warningText : tone === "danger" ? styles.dangerText : styles.successText;
  return <View style={[styles.pill, toneStyle]}><Text style={[styles.pillText, textStyle]}>{children}</Text></View>;
}

/**
 * A styled replacement for native alert()/confirm() dialogs, used both
 * directly by screens and internally by notify()/confirmAsync() (see
 * lib/_core/native-alert.ts + components/alert-host.tsx) so every message
 * and confirmation in the app shares one consistent look instead of the
 * browser/OS's plain system dialog.
 *
 * Pass onCancel to get a two-button confirm dialog (إلغاء / confirmLabel).
 * Omit onCancel to get a single-button info dialog (just confirmLabel) —
 * this is how simple "notify" messages reuse the same component.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  danger = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={styles.confirmOverlay} pointerEvents="box-none">
      <View style={styles.confirmScrim} pointerEvents="auto">
        <View style={styles.confirmCard}>
          <View style={[styles.confirmIconWrap, danger && styles.confirmIconWrapDanger]}>
            <MaterialIcons name={danger ? "warning-amber" : "help-outline"} size={26} color={danger ? CWAAX.red : CWAAX.green} />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          {!!message && <Text style={styles.confirmMessage}>{message}</Text>}
          <View style={[styles.confirmActions, !onCancel && styles.confirmActionsSingle]}>
            {onCancel && (
              <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={styles.confirmCancelBtn}>
                <Text style={styles.confirmCancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.7}
              style={[styles.confirmOkBtn, danger && styles.confirmOkBtnDanger]}
            >
              <Text style={styles.confirmOkText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoBadge: { width: 34, height: 34, borderRadius: 12, backgroundColor: CWAAX.green, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] },
  logoLetter: { color: CWAAX.white, fontSize: 23, fontWeight: "900", transform: [{ rotate: "8deg" }] },
  logoText: { color: CWAAX.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.8 },
  logoAccent: { color: CWAAX.green },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: CWAAX.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: CWAAX.line },
  iconButtonGreen: { backgroundColor: CWAAX.green, borderColor: CWAAX.green },
  pressed: { opacity: 0.62, transform: [{ scale: 0.96 }] },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  card: { backgroundColor: CWAAX.white, borderWidth: 1, borderColor: CWAAX.line, borderRadius: 22, padding: 16, shadowColor: "#15231c", shadowOpacity: 0.035, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitleText: { fontSize: 17, fontWeight: "800", color: CWAAX.ink },
  sectionAction: { fontSize: 13, color: CWAAX.green, fontWeight: "700" },
  coin: { alignItems: "center", justifyContent: "center" },
  coinText: { color: CWAAX.white, fontWeight: "900" },
  trendLine: { height: 24, width: 56, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  trendBar: { width: 4, borderRadius: 5 },
  pill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start" },
  successPill: { backgroundColor: CWAAX.greenSoft },
  warningPill: { backgroundColor: "#FFF6DF" },
  dangerPill: { backgroundColor: "#FDECEB" },
  pillText: { fontSize: 11, fontWeight: "700" },
  successText: { color: CWAAX.green },
  warningText: { color: CWAAX.gold },
  dangerText: { color: CWAAX.red },
  confirmOverlay: {
    ...(Platform.OS === "web"
      ? ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 } as object)
      : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }),
    zIndex: 999999,
    elevation: 24,
  },
  confirmScrim: { flex: 1, backgroundColor: "rgba(16,26,22,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  confirmCard: { width: "100%", maxWidth: 360, backgroundColor: CWAAX.white, borderRadius: 24, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20, alignItems: "center" },
  confirmIconWrap: { width: 52, height: 52, borderRadius: 18, backgroundColor: CWAAX.greenSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  confirmIconWrapDanger: { backgroundColor: "#FDECEB" },
  confirmTitle: { color: CWAAX.ink, fontSize: 17, fontWeight: "900", textAlign: "center" },
  confirmMessage: { color: CWAAX.muted, fontSize: 12.5, lineHeight: 19, textAlign: "center", marginTop: 10 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 22, width: "100%" },
  confirmActionsSingle: { flexDirection: "column" },
  confirmCancelBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: CWAAX.line, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { color: CWAAX.ink, fontSize: 13, fontWeight: "800" },
  confirmOkBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: CWAAX.green, alignItems: "center", justifyContent: "center" },
  confirmOkBtnDanger: { backgroundColor: CWAAX.red },
  confirmOkText: { color: CWAAX.white, fontSize: 13, fontWeight: "900" },
});
