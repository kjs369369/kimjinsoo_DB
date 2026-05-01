import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const pw = process.env.VAULT_PASSWORD;
  if (!pw) throw new Error("VAULT_PASSWORD not set");
  return pw;
}

export function issueAdminToken(): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `admin.${expiresAt}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== "admin") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const payload = `${role}.${expStr}`;
  const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function extractTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
