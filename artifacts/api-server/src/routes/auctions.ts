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

import { storage } from "../storage.js";
import { getPromoConfig } from "../lib/promoConfig.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

const router = Router();

/** Bids placed in the last EXTEND_WINDOW_MS of an auction with Auction Extensions push the end out so that long remains. */
const EXTEND_WINDOW_MS = 2 * 60 * 1000;

/**
 * What the public may see of an auction. The reserve amount is a secret — only say whether
 * one exists and (once there are bids) whether it has been met.
 */
function publicAuction(a: Record<string, unknown>): Record<string, unknown> {
  const { reserve_price, ...rest } = a;
  const hasReserve = reserve_price !== null && reserve_price !== undefined && reserve_price !== "";
  const current = rest["current_bid"] ? parseFloat(rest["current_bid"] as string) : null;
  return {
    ...rest,
    has_reserve: hasReserve,
    reserve_met: hasReserve ? current !== null && current >= parseFloat(reserve_price as string) : null,
  };
}

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
  res.json(rows.rows.map(r => publicAuction(r as Record<string, unknown>)));
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
  res.json(rows.rows.map(r => publicAuction(r as Record<string, unknown>)));
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
    const reserve = a["reserve_price"] ? parseFloat(a["reserve_price"] as string) : null;
    const topBid = a["winner_bid"] ? parseFloat(a["winner_bid"] as string) : null;
    const reserveMissed = reserve !== null && (topBid === null || topBid < reserve);
    if (reserveMissed) {
      // Highest bid didn't reach the hidden reserve: no sale, nobody wins.
      const bidder = a["winner_email"] as string | null;
      await db.execute(sql`
        UPDATE auctions SET status = 'ended', winner_email = NULL, winner_name = NULL, winner_bid = NULL, updated_at = NOW() WHERE id = ${id}
      `);
      a["status"] = "ended"; a["winner_email"] = null; a["winner_name"] = null; a["winner_bid"] = null;
      if (topBid !== null) {
        void sendSystemMessage(a["seller_email"] as string, {
          category: "Auctions",
          subject: `Auction ended — reserve not met`,
          body: `Your auction "${a["title"]}" ended with a top bid of £${topBid.toFixed(2)}, which didn't reach your reserve price, so it hasn't sold. You can relist it any time.`,
        });
        if (bidder) {
          void sendSystemMessage(bidder, {
            category: "Auctions",
            subject: `Auction ended — reserve not met`,
            body: `The auction "${a["title"]}" ended without meeting the seller's reserve price, so there is no winner this time.`,
          });
        }
      }
    } else {
      await db.execute(sql`UPDATE auctions SET status = 'ended', updated_at = NOW() WHERE id = ${id}`);
      a["status"] = "ended";
    }
    // Send winner/seller end notifications (fire-and-forget)
    if (!reserveMissed && a["winner_email"] && a["winner_name"] && a["winner_bid"]) {
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
  res.json({ ...publicAuction(a), bids: bidsRes.rows });
});

router.post("/auctions", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { title, description, category, condition, sellerEmail, sellerName, startingBid, reservePrice, bidIncrement, endTime } = body as Record<string, string>;
  const images = (body["images"] as string[]) ?? [];
  if (!title || !sellerEmail || !sellerName || !startingBid || !endTime) {
    res.status(400).json({ error: "title, sellerEmail, sellerName, startingBid, endTime are required" });
    return;
  }
  const wantsExtension = body["extendEnabled"] === true || body["extendEnabled"] === "true";
  const wantsReserve = !!reservePrice && parseFloat(reservePrice) > 0;

  // Optional paid add-ons (prices and availability are set in Admin → Promotions)
  const reserveCfg = await getPromoConfig("reserve-auction");
  const extendCfg = await getPromoConfig("auction-extension");
  if (wantsReserve && reserveCfg && !reserveCfg.enabled) { res.status(400).json({ error: "Reserve prices aren't available right now." }); return; }
  if (wantsExtension && extendCfg && !extendCfg.enabled) { res.status(400).json({ error: "Auction Extensions aren't available right now." }); return; }
  const fee = (wantsReserve ? (reserveCfg?.cost ?? 0) : 0) + (wantsExtension ? (extendCfg?.cost ?? 0) : 0);
  if (fee > 0) {
    const balance = await storage.getCredits(sellerEmail);
    if (balance < fee) {
      res.status(402).json({ error: "Insufficient credits for the auction add-ons", balance, required: fee });
      return;
    }
  }

  const id = `AUC-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO auctions
      (id, title, description, images, category, condition, seller_email, seller_name,
       starting_bid, reserve_price, bid_increment, end_time, extend_enabled, status, created_at, updated_at)
    VALUES (
      ${id}, ${title}, ${description ?? null}, ${JSON.stringify(images)},
      ${category ?? null}, ${condition ?? "used"}, ${sellerEmail}, ${sellerName},
      ${parseFloat(startingBid)},
      ${wantsReserve ? parseFloat(reservePrice) : null},
      ${bidIncrement ? parseFloat(bidIncrement) : 1.0},
      ${endTime}, ${wantsExtension}, 'active', NOW(), NOW()
    )
  `);
  let newBalance: number | undefined;
  if (fee > 0) {
    newBalance = Number(await storage.addCredits(sellerEmail, -fee));
    const parts = [wantsReserve && "Reserve Price", wantsExtension && "Auction Extensions"].filter(Boolean).join(" + ");
    void sendSystemMessage(sellerEmail, {
      category: "Promotions",
      subject: `${parts} added to your auction`,
      body: `You added ${parts} to "${title}" and spent ${Math.round(fee * 100)} credits. Your new balance is ${Math.round((newBalance ?? 0) * 100)} credits.`,
    });
  }
  res.status(201).json({ id, creditsSpent: fee, newBalance });
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
  // Auction Extensions: a bid in the final minutes pushes the end time out
  let extended = false;
  let newEndTime: string | null = null;
  if (auction["extend_enabled"] === true) {
    const endMs = new Date(auction["end_time"] as string).getTime();
    if (endMs - Date.now() <= EXTEND_WINDOW_MS) {
      const target = new Date(Date.now() + EXTEND_WINDOW_MS);
      await db.execute(sql`UPDATE auctions SET end_time = ${target.toISOString()} WHERE id = ${id} AND end_time < ${target.toISOString()}`);
      extended = true;
      newEndTime = target.toISOString();
    }
  }
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
  res.status(201).json({ id: bidId, currentBid: bidAmount, extended, endTime: newEndTime });
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
