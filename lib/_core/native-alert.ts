import { Platform, Alert } from "react-native";

export function notify(title: string, message?: string, onDismiss?: () => void) {
  var text = title;
  if (message) {
    text = title + "\n\n" + message;
  }

  if (typeof window !== "undefined") {
    window.alert(text);
    if (onDismiss) onDismiss();
    return;
  }

  Alert.alert(title, message, [
    {
      text: "حسناً",
      onPress: function () {
        if (onDismiss) onDismiss();
      },
    },
  ]);
}

export function confirmAsync(
  title: string,
  message?: string,
  _confirmLabel?: string
): Promise<boolean> {
  var text = title;
  if (message) {
    text = title + "\n\n" + message;
  }

  if (typeof window !== "undefined") {
    return Promise.resolve(window.confirm(text));
  }

  return new Promise(function (resolve) {
    Alert.alert(title, message, [
      {
        text: "إلغاء",
        style: "cancel",
        onPress: function () {
          resolve(false);
        },
      },
      {
        text: "تأكيد",
        onPress: function () {
          resolve(true);
        },
      },
    ]);
  });
}
