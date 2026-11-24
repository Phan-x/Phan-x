import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a wallet/currency amount for display: strips the meaningless
 * trailing zeros that come from the database's fixed 8-decimal storage
 * (e.g. "3361.00000000" -> "3,361", "840.25000000" -> "840.25"),
 * while keeping full precision for amounts that actually need it (e.g.
 * "0.00012345" stays as-is). Never throws — invalid input becomes "0".
 */
export function formatAmount(value: string | number | null | undefined, maxDecimals = 8): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";

  let fixed = n.toFixed(maxDecimals);
  if (fixed.includes(".")) {
    fixed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  }

  const negative = fixed.startsWith("-");
  const [intPart, decPart] = (negative ? fixed.slice(1) : fixed).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${negative ? "-" : ""}${withCommas}${decPart ? `.${decPart}` : ""}`;
}
