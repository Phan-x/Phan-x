/**
 * NativeWind v4 can swallow onPress on Pressable / Touchable* when className
 * is mapped onto the component. Disable className mapping so touch handlers
 * always fire (especially important on react-native-web / Cloudflare static).
 */
import {
  Pressable,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
} from "react-native";
import { remapProps } from "nativewind";

try {
  remapProps(Pressable, { className: false });
  remapProps(TouchableOpacity, { className: false });
  remapProps(TouchableHighlight, { className: false });
  remapProps(TouchableWithoutFeedback, { className: false });
} catch (e) {
  console.warn("[nativewind-pressable] remapProps failed:", e);
}
