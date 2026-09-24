import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { NetworkOption } from "@/constants/networks";

export function NetworkIcon({ network, size = 40 }: { network: NetworkOption; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (network.logo && !failed) {
    return (
      <Image
        source={{ uri: network.logo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#F2F3F2" }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: network.color }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>{network.name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { color: "#fff", fontWeight: "900" },
});
