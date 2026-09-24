import type { CurrencyCode } from "@/lib/_core/preferences";

/*
 * Static, approximate rates relative to 1 USD. These are NOT live rates —
 * for production use, replace this with a call to a live exchange-rate
 * API (e.g. from the Cloudflare Worker, cached for a few hours) instead
 * of hardcoded numbers.
 */
export const CURRENCIES: { code: CurrencyCode; name: string; symbol: string; rate: number }[] = [
  { code: "USD", name: "الدولار الأمريكي", symbol: "$", rate: 1 },
  { code: "EUR", name: "اليورو", symbol: "€", rate: 0.92 },
  { code: "GBP", name: "الجنيه الإسترليني", symbol: "£", rate: 0.79 },
  { code: "SAR", name: "الريال السعودي", symbol: "ر.س", rate: 3.75 },
  { code: "AED", name: "الدرهم الإماراتي", symbol: "د.إ", rate: 3.67 },
  { code: "EGP", name: "الجنيه المصري", symbol: "ج.م", rate: 49.5 },
];

export function formatAmount(usdAmount: number, currency: CurrencyCode): string {
  const info = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const converted = usdAmount * info.rate;
  const formatted = converted.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return `${info.symbol}${formatted}`;
}
