import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";
import {
  sendNewBidNotification,
  sendOutbidNotification,
  sendAuctionWonNotification,
  sendAuctionEndedSellerNotification,
} from "../email.js";

const router = Router();

const VALID_STATUSES = ["active", "ended", "cancelled"];

router.get("/auctions", async (req, res) => {
  const { status = "active", category, sort = "ending", limit = "40", offset = "0" } = req.query as Record<string, string>;
  const orderClause = sort === "newest" ? sql`ORDER BY created_at DESC` : sql`ORDER BY end_time ASC`;
  let rows;
  if (category && category !== "all") {
    rows = await db.execute(sql`SELECT * FROM auctions WHERE status = ${status} AND category = ${category} ${orderClause} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
  } else {
    rows = await db.execute(sql`SELECT * FROM auctions WHERE status = ${status} ${orderClause} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
  }
  res.json(rows.rows);
});

router.get("/auctions/my-bids", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const rows = await db.execute(sql`
    SELECT DISTINCT a.*, b.amount AS my_latest_bid
    FROM auctions a
    JOIN bids b ON b.auction_id = a.id
    WHERE b.bidder_email = ${email}
    ORDER BY a.end_time DESC
    LIMIT 50
  `);
  res.json(rows.rows);
});

router.get("/auctions/my-listings", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const rows = await db.execute(sql`SELECT * FROM auctions WHERE seller_email = ${email} ORDER BY created_at DESC LIMIT 50`);
  res.json(rows.rows);
});

router.get("/auctions/:id", async (req, res) => {
  const { id } = req.params;
  const auctionRes = await db.execute(sql`SELECT * FROM auctions WHERE id = ${id}`);
  if (auctionRes.rows.length === 0) { res.status(404).json({ error: "Auction not found" }); return; }
  const auction = auctionRes.rows[0];
  // Auto-end if past end_time
  const a = auction as Record<string, unknown>;
  if (a["status"] === "active" && new Date(a["end_time"] as string) < new Date()) {
    await db.execute(sql`UPDATE auctions SET status = 'ended', updated_at = NOW() WHERE id = ${id}`);
    a["status"] = "ended";
    // Send winner/seller end notifications (fire-and-forget)
    if (a["winner_email"] && a["winner_name"] && a["winner_bid"]) {
      void sendAuctionWonNotification({
        winnerEmail: a["winner_email"] as string,
        winnerName: a["winner_name"] as string,
        auctionTitle: a["title"] as string,
        auctionId: id,
        winningBid: parseFloat(a["winner_bid"] as string),
        sellerName: a["seller_name"] as string,
      });
      void sendAuctionEndedSellerNotification({
        sellerEmail: a["seller_email"] as string,
        sellerName: a["seller_name"] as string,
        auctionTitle: a["title"] as string,
        auctionId: id,
        winnerName: a["winner_name"] as string,
        winnerEmail: a["winner_email"] as string,
        winningBid: parseFloat(a["winner_bid"] as string),
      });
    }
  }
  const bidsRes = await db.execute(sql`SELECT * FROM bids WHERE auction_id = ${id} ORDER BY created_at DESC LIMIT 30`);
  res.json({ ...a, bids: bidsRes.rows });
});

router.post("/auctions", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { title, description, category, condition, sellerEmail, sellerName, startingBid, reservePrice, bidIncrement, endTime } = body as Record<string, string>;
  const images = (body["images"] as string[]) ?? [];
  if (!title || !sellerEmail || !sellerName || !startingBid || !endTime) {
    res.status(400).json({ error: "title, sellerEmail, sellerName, startingBid, endTime are required" });
    return;
  }
  const id = `AUC-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO auctions
      (id, title, description, images, category, condition, seller_email, seller_name,
       starting_bid, reserve_price, bid_increment, end_time, status, created_at, updated_at)
    VALUES (
      ${id}, ${title}, ${description ?? null}, ${JSON.stringify(images)},
      ${category ?? null}, ${condition ?? "used"}, ${sellerEmail}, ${sellerName},
      ${parseFloat(startingBid)},
      ${reservePrice ? parseFloat(reservePrice) : null},
      ${bidIncrement ? parseFloat(bidIncrement) : 1.0},
      ${endTime}, 'active', NOW(), NOW()
    )
  `);
  res.status(201).json({ id });
});

router.post("/auctions/:id/bid", async (req, res) => {
  const { id } = req.params;
  const { bidderEmail, bidderName, amount } = req.body as Record<string, string>;
  if (!bidderEmail || !bidderName || !amount) {
    res.status(400).json({ error: "bidderEmail, bidderName, amount are required" });
    return;
  }
  const bidAmount = parseFloat(amount);
  const auctionRes = await db.execute(sql`SELECT * FROM auctions WHERE id = ${id}`);
  if (auctionRes.rows.length === 0) { res.status(404).json({ error: "Auction not found" }); return; }
  const auction = auctionRes.rows[0] as Record<string, unknown>;
  if (auction["status"] !== "active") { res.status(400).json({ error: "Auction is not active" }); return; }
  if (new Date(auction["end_time"] as string) < new Date()) { res.status(400).json({ error: "Auction has ended" }); return; }
  if (auction["seller_email"] === bidderEmail) { res.status(400).json({ error: "You cannot bid on your own auction" }); return; }
  const currentBid = auction["current_bid"] ? parseFloat(auction["current_bid"] as string) : null;
  const startingBid = parseFloat(auction["starting_bid"] as string);
  const increment = parseFloat(auction["bid_increment"] as string);
  const minBid = currentBid !== null ? currentBid + increment : startingBid;
  if (bidAmount < minBid) {
    res.status(400).json({ error: `Minimum bid is £${minBid.toFixed(2)}`, minBid });
    return;
  }
  const prevWinnerEmail = auction["winner_email"] as string | null ?? null;
  const prevWinnerName = auction["winner_name"] as string | null ?? null;
  const bidId = `BID-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO bids (id, auction_id, bidder_email, bidder_name, amount, created_at)
    VALUES (${bidId}, ${id}, ${bidderEmail}, ${bidderName}, ${bidAmount}, NOW())
  `);
  await db.execute(sql`
    UPDATE auctions
    SET current_bid = ${bidAmount}, bid_count = bid_count + 1,
        winner_email = ${bidderEmail}, winner_name = ${bidderName}, winner_bid = ${bidAmount},
        updated_at = NOW()
    WHERE id = ${id}
  `);
  const newBidCount = (auction["bid_count"] as number ?? 0) + 1;
  const nextMinBid = bidAmount + increment;
  // Notify seller (fire-and-forget)
  void sendNewBidNotification({
    sellerEmail: auction["seller_email"] as string,
    sellerName: auction["seller_name"] as string,
    auctionTitle: auction["title"] as string,
    auctionId: id,
    bidderName,
    bidAmount,
    currentBidCount: newBidCount,
  });
  // Notify outbid previous winner (if different from new bidder)
  if (prevWinnerEmail && prevWinnerEmail !== bidderEmail) {
    void sendOutbidNotification({
      email: prevWinnerEmail,
      name: prevWinnerName ?? prevWinnerEmail,
      auctionTitle: auction["title"] as string,
      auctionId: id,
      newBidAmount: bidAmount,
      minNextBid: nextMinBid,
    });
  }
  res.status(201).json({ id: bidId, currentBid: bidAmount });
});

router.patch("/auctions/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const { email } = req.body as Record<string, string>;
  const auctionRes = await db.execute(sql`SELECT * FROM auctions WHERE id = ${id}`);
  if (auctionRes.rows.length === 0) { res.status(404).json({ error: "Auction not found" }); return; }
  const auction = auctionRes.rows[0] as Record<string, unknown>;
  if (auction["seller_email"] !== email) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.execute(sql`UPDATE auctions SET status = 'cancelled', updated_at = NOW() WHERE id = ${id}`);
  res.json({ ok: true });
});

router.get("/admin/auctions", requireAdmin, async (req, res) => {
  const rows = await db.execute(sql`SELECT * FROM auctions ORDER BY created_at DESC LIMIT 200`);
  res.json(rows.rows);
});

router.patch("/admin/auctions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) { res.status(400).json({ error: "Valid status required" }); return; }
  await db.execute(sql`UPDATE auctions SET status = ${status}, updated_at = NOW() WHERE id = ${id}`);
  res.json({ ok: true });
});

export default router;
