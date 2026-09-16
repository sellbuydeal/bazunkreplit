import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createAdminToken(): string {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", SESSION_SECRET).update(`admin:${ts}`).digest("hex");
  return Buffer.from(`${ts}:${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return false;
    const ts = decoded.slice(0, colonIdx);
    const sig = decoded.slice(colonIdx + 1);
    if (Date.now() - parseInt(ts) > TOKEN_TTL_MS) return false;
    const expected = createHmac("sha256", SESSION_SECRET).update(`admin:${ts}`).digest("hex");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "Invalid or expired admin token" });
    return;
  }
  next();
}
