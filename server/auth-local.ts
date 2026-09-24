import crypto from "node:crypto";

const KEYLEN = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLEL = 1;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEYLEN, { N: COST, r: BLOCK_SIZE, p: PARALLEL });
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLEL}$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, Buffer.from(hash, "hex").length, { N: Number(n), r: Number(r), p: Number(p) });
    return crypto.timingSafeEqual(derived, Buffer.from(hash, "hex"));
  } catch { return false; }
}
