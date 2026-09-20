import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";
import { logger } from "../lib/logger.js";
import { storage } from "../storage.js";

const router = Router();

function getLiveKitConfig(): { apiKey: string; apiSecret: string; wsUrl: string } | null {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl     = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  return { apiKey, apiSecret, wsUrl };
}

router.get("/livekit/config", (_req, res) => {
  const cfg = getLiveKitConfig();
  res.json({ configured: !!cfg, wsUrl: cfg?.wsUrl ?? null });
});

router.get("/livekit/token", async (req, res) => {
  const cfg = getLiveKitConfig();
  if (!cfg) {
    res.status(503).json({ error: "LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET to your secrets." });
    return;
  }

  const { room, identity, canPublish } = req.query as Record<string, string>;
  if (!room || !identity) {
    res.status(400).json({ error: "room and identity query parameters are required" });
    return;
  }

  try {
    const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
      identity,
      ttl: "6h",
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: canPublish === "true",
      canSubscribe: true,
    });
    const token = await at.toJwt();

    // identity is the broadcaster's email (see LiveKitBroadcaster/LiveKitViewer
    // callers). A publish-capable token means this user is going live —
    // complete the "Go Live!" milestone. Fire-and-forget: never block or
    // fail the stream over a milestone-tracking issue.
    if (canPublish === "true") {
      storage.completeMilestone(identity, "first-live").catch((err) => {
        logger.error({ err, identity }, "Failed to record first-live milestone");
      });
    }

    res.json({ token, wsUrl: cfg.wsUrl });
  } catch (err) {
    logger.error({ err }, "Failed to generate LiveKit token");
    res.status(500).json({ error: "Failed to generate token" });
  }
});

export default router;

