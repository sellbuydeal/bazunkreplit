import { createHmac, timingSafeEqual } from "crypto";

const DIDIT_API_URL = "https://verification.didit.me";
const DIDIT_API_KEY = process.env.DIDIT_API_KEY ?? "";
const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET ?? "";
export const DIDIT_WORKFLOW_ID = "58ada7b4-08f6-4dff-b98f-97cfd225988e"; // Free KYC

export interface DiditSession {
  session_id: string;
  session_token?: string;
  url: string;
  status?: string;
  workflow_id?: string;
  vendor_data?: string;
}

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export const DIDIT_STATUS_MAP: Record<string, VerificationStatus> = {
  "Not Started": "unverified",
  "In Progress": "pending",
  "Awaiting User": "pending",
  "In Review": "pending",
  Approved: "verified",
  Declined: "rejected",
  Resubmitted: "pending",
  Abandoned: "pending",
  Expired: "unverified",
  "Kyc Expired": "unverified",
};

export function diditConfigured() {
  return Boolean(DIDIT_API_KEY && DIDIT_WEBHOOK_SECRET);
}

export async function createVerificationSession(opts: {
  vendorData: string;
  callbackUrl: string;
}): Promise<DiditSession> {
  if (!DIDIT_API_KEY) throw new Error("DIDIT_API_KEY is not configured");

  const res = await fetch(`${DIDIT_API_URL}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": DIDIT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: DIDIT_WORKFLOW_ID,
      vendor_data: opts.vendorData,
      callback: opts.callbackUrl,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Didit session creation failed ${res.status}: ${detail}`);
  }
  return res.json() as Promise<DiditSession>;
}

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shortenFloats);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shortenFloats(v)]),
    );
  }
  return value;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function verifyWebhookSignature(
  parsedBody: unknown,
  signature: string,
  timestampHeader: string | undefined,
): boolean {
  try {
    if (!DIDIT_WEBHOOK_SECRET || !signature || !timestampHeader) return false;
    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

    const canonical = JSON.stringify(sortKeys(shortenFloats(parsedBody)));
    const expected = createHmac("sha256", DIDIT_WEBHOOK_SECRET)
      .update(canonical, "utf8")
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
