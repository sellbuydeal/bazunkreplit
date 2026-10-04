import { Router } from "express";
import { AccessToken, LiveKitAPI, StreamOutput, StreamProtocol } from "livekit-server-sdk";
import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";
import { logger } from "../lib/logger.js";
import { storage } from "../storage.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function getLiveKitConfig(): { apiKey: string; apiSecret: string; wsUrl: string } | null {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl     = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  return { apiKey, apiSecret, wsUrl };
}


async function authenticatedEmail(req: Request): Promise<string | null> {
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) return null;
  const user = await clerkClient.users.getUser(auth.userId);
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
}

function liveKitApi() {
  const cfg = getLiveKitConfig();
  if (!cfg) return null;
  return new LiveKitAPI({ host: cfg.wsUrl.replace(/^ws/, "http"), apiKey: cfg.apiKey, secret: cfg.apiSecret });
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
  if (canPublish === "true") {
    const email = await authenticatedEmail(req);
    if (!email || email !== String(identity).trim().toLowerCase()) {
      res.status(401).json({ error: "You must be signed in as the broadcaster." });
      return;
    }
  }
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


router.post("/livekit/youtube/start", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in to start a YouTube broadcast." }); return; }
  const api = liveKitApi();
  if (!api) { res.status(503).json({ error: "LiveKit is not configured on the server." }); return; }

  const roomName = String(req.body?.roomName ?? "").trim();
  const streamKey = String(req.body?.streamKey ?? "").trim();
  const rtmpsUrl = String(req.body?.rtmpsUrl ?? "").trim().replace(/\/$/, "");
  if (!roomName || !streamKey || !rtmpsUrl) {
    res.status(400).json({ error: "Room, YouTube RTMPS URL and stream key are required." }); return;
  }
  if (!/^rtmps:\/\//i.test(rtmpsUrl)) {
    res.status(400).json({ error: "Use the secure RTMPS Stream URL from YouTube Live Control Room." }); return;
  }
  if (/\s/.test(streamKey) || streamKey.length < 6) {
    res.status(400).json({ error: "The YouTube stream key does not look valid." }); return;
  }

  try {
    const owner:any = await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE broadcast_room=${roomName} AND LOWER(seller_email)=LOWER(${email}) AND is_live=TRUE LIMIT 1`);
    if (!owner.rows?.length) { res.status(403).json({ error: "This Bazunk live room does not belong to the signed-in seller." }); return; }
    // Never persist or log the stream key. It is used only to create this LiveKit egress.
    const output = new StreamOutput({ protocol: StreamProtocol.RTMP, urls: [`${rtmpsUrl}/${streamKey}`] });
    const info = await api.egress.startRoomCompositeEgress(roomName, { stream: output }, { layout: "speaker" });
    logger.info({ roomName, egressId: info.egressId, broadcaster: email }, "Started YouTube Live relay");
    res.json({ ok: true, egressId: info.egressId });
  } catch (err) {
    logger.error({ err, roomName, broadcaster: email }, "Failed to start YouTube Live relay");
    res.status(502).json({ error: "LiveKit could not start the YouTube relay. Check Egress is enabled and the RTMPS URL/key are correct." });
  }
});

router.post("/livekit/youtube/stop", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in to stop a YouTube broadcast." }); return; }
  const api = liveKitApi();
  if (!api) { res.status(503).json({ error: "LiveKit is not configured on the server." }); return; }
  const roomName = String(req.body?.roomName ?? "").trim();
  if (!roomName) { res.status(400).json({ error: "Room is required." }); return; }
  try {
    const owner:any = await db.execute(sql`SELECT 1 FROM live_stream_sessions WHERE broadcast_room=${roomName} AND LOWER(seller_email)=LOWER(${email}) LIMIT 1`);
    if (!owner.rows?.length) { res.status(403).json({ error: "This Bazunk live room does not belong to the signed-in seller." }); return; }
    const active = await api.egress.listEgress({ roomName, active: true });
    await Promise.all(active.map((e) => api.egress.stopEgress(e.egressId)));
    logger.info({ roomName, stopped: active.length, broadcaster: email }, "Stopped YouTube Live relay");
    res.json({ ok: true, stopped: active.length });
  } catch (err) {
    logger.error({ err, roomName, broadcaster: email }, "Failed to stop YouTube Live relay");
    res.status(502).json({ error: "Could not stop the YouTube relay." });
  }
});


// ── Public Bazunk live-room state + live chat ──────────────────────────────

router.get("/live/sessions", async (_req,res) => {
  try {
    const r:any=await db.execute(sql`SELECT * FROM live_stream_sessions WHERE is_live=TRUE ORDER BY started_at DESC LIMIT 100`);
    res.json({sessions:(r.rows||[]).map((x:any)=>({id:x.id,sellerId:x.seller_email,sellerName:x.seller_name,sellerInitials:x.seller_initials,title:x.title,platform:x.platform,streamUrl:x.stream_url,isLive:x.is_live,productIds:x.product_ids||[],viewerCount:x.viewer_count||0,startedAt:x.started_at}))});
  } catch { res.status(500).json({error:"Could not load live streams."}); }
});

router.post("/live/session", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in to create a live session." }); return; }
  const b = req.body ?? {};
  if (!b.id || !b.title || !b.platform || !b.streamUrl) { res.status(400).json({ error: "Invalid live session." }); return; }
  try {
    await db.execute(sql`
      INSERT INTO live_stream_sessions (id,seller_email,seller_name,seller_initials,title,platform,stream_url,broadcast_room,is_live,product_ids,viewer_count,started_at)
      VALUES (${String(b.id)},${email},${String(b.sellerName||email)},${String(b.sellerInitials||"")},${String(b.title)},${String(b.platform)},${String(b.streamUrl)},${b.broadcastRoom ? String(b.broadcastRoom) : null},TRUE,${JSON.stringify(Array.isArray(b.productIds)?b.productIds:[])}::jsonb,0,${b.startedAt ? new Date(b.startedAt) : new Date()})
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, stream_url=EXCLUDED.stream_url, broadcast_room=EXCLUDED.broadcast_room, is_live=TRUE, product_ids=EXCLUDED.product_ids
    `);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "Failed to persist live session"); res.status(500).json({ error: "Could not create live session." }); }
});

router.get("/live/session/:id", async (req, res) => {
  try {
    const r:any = await db.execute(sql`SELECT * FROM live_stream_sessions WHERE id=${req.params.id} LIMIT 1`);
    const x:any = r.rows?.[0];
    if (!x) { res.status(404).json({ error: "Stream not found" }); return; }
    res.json({ id:x.id,sellerId:x.seller_email,sellerName:x.seller_name,sellerInitials:x.seller_initials,title:x.title,platform:x.platform,streamUrl:x.stream_url,isLive:x.is_live,productIds:x.product_ids||[],viewerCount:x.viewer_count||0,startedAt:x.started_at });
  } catch { res.status(500).json({ error: "Could not load stream." }); }
});

router.post("/live/session/:id/end", async (req, res) => {
  const email = await authenticatedEmail(req);
  if (!email) { res.status(401).json({ error: "Sign in required." }); return; }
  await db.execute(sql`UPDATE live_stream_sessions SET is_live=FALSE, ended_at=NOW() WHERE id=${req.params.id} AND LOWER(seller_email)=LOWER(${email})`);
  res.json({ ok:true });
});

router.get("/live/session/:id/messages", async (req,res) => {
  try {
    const r:any=await db.execute(sql`SELECT id,sender_email,sender_name,text,created_at FROM live_stream_messages WHERE session_id=${req.params.id} ORDER BY created_at ASC LIMIT 200`);
    res.json({ messages:r.rows||[] });
  } catch { res.status(500).json({ error:"Could not load live chat." }); }
});

router.post("/live/session/:id/messages", async (req,res) => {
  const email=await authenticatedEmail(req);
  if(!email){res.status(401).json({error:"Sign in to chat."});return;}
  const text=String(req.body?.text??"").trim().slice(0,500);
  if(!text){res.status(400).json({error:"Message is empty."});return;}
  const auth=getAuth(req); const u=auth.userId?await clerkClient.users.getUser(auth.userId):null;
  const name=u ? ([u.firstName,u.lastName].filter(Boolean).join(" ") || email.split("@")[0]) : email.split("@")[0];
  const r:any=await db.execute(sql`INSERT INTO live_stream_messages(session_id,sender_email,sender_name,text) VALUES(${req.params.id},${email},${name},${text}) RETURNING id,sender_email,sender_name,text,created_at`);
  res.json({message:r.rows?.[0]});
});

export default router;

