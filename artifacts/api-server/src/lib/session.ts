import crypto from "node:crypto";
import type { Request } from "express";

const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "dev-session-secret";

export function signSession(merchantId: string): string {
  const payload = Buffer.from(merchantId).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function getMerchantId(req: Request): string | null {
  const cookie = req.cookies?.["session"];
  return verifySession(cookie);
}
