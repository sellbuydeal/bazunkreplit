import { createHmac, timingSafeEqual } from "crypto";

const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL ?? "https://apx.didit.me";
const DIDIT_CLIENT_ID = process.env.DIDIT_CLIENT_ID ?? "";
const DIDIT_CLIENT_SECRET = process.env.DIDIT_CLIENT_SECRET ?? "";
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET ?? "";

interface DiditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface DiditSession {
  session_id: string;
  url: string;
  status: string;
  vendor_data: string;
}

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export const DIDIT_STATUS_MAP: Record<string, VerificationStatus> = {
  Approved: "verified",
  Declined: "rejected",
  "In Progress": "pending",
  "Not started": "unverified",
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  if (!DIDIT_CLIENT_ID || !DIDIT_CLIENT_SECRET) {
    throw new Error("DIDIT_CLIENT_ID and DIDIT_CLIENT_SECRET must be configured");
  }

  const credentials = Buffer.from(`${DIDIT_CLIENT_ID}:${DIDIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${DIDIT_BASE_URL}/auth/v2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Didit token request failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as DiditTokenResponse;
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function createVerificationSession(opts: {
  vendorData: string;
  redirectUrl: string;
  callbackUrl: string;
  features?: string;
}): Promise<DiditSession> {
  const token = await getAccessToken();
  const res = await fetch(`${DIDIT_BASE_URL}/verification/v1/session/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vendor_data: opts.vendorData,
      features: opts.features ?? "OCR + FACE",
      callback: opts.callbackUrl,
      redirect_url: opts.redirectUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Didit session creation failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<DiditSession>;
}

/**
 * Verifies the Didit webhook signature.
 * Didit sends: x-signature: sha256=<hmac_hex>
 * The HMAC is computed over the raw request body using the webhook secret.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
  try {
    if (!DIDIT_WEBHOOK_SECRET) return false;

    const expected = (() => {
      if (signatureHeader.startsWith("sha256=")) {
        return createHmac("sha256", DIDIT_WEBHOOK_SECRET).update(rawBody).digest("hex");
      }
      // Timestamped format: t=<ts>,v1=<hex>
      const parts = Object.fromEntries(
        signatureHeader.split(",").map((p) => {
          const idx = p.indexOf("=");
          return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
        }),
      );
      const { t: ts, v1: _sig } = parts;
      if (ts) {
        const payload = `${ts}.${rawBody.toString("utf-8")}`;
        return createHmac("sha256", DIDIT_WEBHOOK_SECRET).update(payload).digest("hex");
      }
      return null;
    })();

    if (!expected) return false;

    const received = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7)
      : (signatureHeader.split(",").find((p) => p.startsWith("v1="))?.slice(3) ?? "");

    const receivedBuf = Buffer.from(received, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (receivedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}
