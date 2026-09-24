import { ScrollViewStyleReset } from "expo-router/html";

/**
 * Root HTML wrapper for the static web export (Expo Router).
 * This is the one place we control <head> content, which is where the
 * PWA "Add to Home Screen" name/icon come from — without this, Chrome
 * falls back to the page <title>/URL and a generic letter icon.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>CwaAX Wallet</title>

        {/* Standard PWA manifest — drives the Android "Add to Home
            Screen" name + icon (public/manifest.json). */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B8754" />

        {/* Favicon (browser tab) */}
        <link rel="icon" href="/favicon.ico" />

        {/* iOS "Add to Home Screen" support — Safari ignores the web
            manifest entirely and needs these specific tags instead. */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CwaAX" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
