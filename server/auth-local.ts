import crypto from "node:crypto";

const KEYLEN = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLEL = 1;

// تكلفة أخف (أسرع ~14 مرة) لعمليات الإدارة داخل Cloudflare Workers: الطلب يُقتل
// (HTTP 503) إذا تجاوز حد وقت المعالج. التحقق يقرأ التكلفة من الهاش نفسه،
// فالهاشات القديمة والجديدة تعمل معاً.
export const LIGHT_COST = 4096;

export function hashPassword(password: string, cost: number = COST): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEYLEN, { N: cost, r: BLOCK_SIZE, p: PARALLEL });
  return `scrypt$${cost}$${BLOCK_SIZE}$${PARALLEL}$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, Buffer.from(hash, "hex").length, { N: Number(n), r: Number(r), p: Number(p) });
    return crypto.timingSafeEqual(derived, Buffer.from(hash, "hex"));
  } catch { return false; }
}
