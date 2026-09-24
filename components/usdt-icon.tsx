import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export function UsdtIcon({ size = 20 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <Image
        source={{ uri: "https://assets.coincap.io/assets/icons/usdt@2x.png" }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.55 }]}>тВо</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: "#26A17B", alignItems: "center", justifyContent: "center" },
  fallbackText: { color: "#fff", fontWeight: "900" },
});
