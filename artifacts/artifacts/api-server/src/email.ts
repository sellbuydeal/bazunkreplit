// Email via Resend — uses @replit/connectors-sdk proxy (no API key needed)
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./lib/logger.js";

const FROM = "Bazunk <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const connectors = new ReplitConnectors();
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn({ to, subject, status: res.status, body: text }, "Resend non-OK response");
    }
  } catch (err) {
    logger.warn({ err, to, subject }, "Failed to send email (non-fatal)");
  }
}

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);}
  .header{background:#1A1D2E;padding:24px 32px;display:flex;align-items:center;}
  .logo{font-size:20px;font-weight:700;color:#fff;letter-spacing:-.5px;}
  .logo span{color:#F26B21;}
  .body{padding:32px;}
  h2{margin:0 0 12px;font-size:20px;color:#1A1D2E;}
  p{margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;}
  .btn{display:inline-block;padding:12px 28px;background:#4A5CE8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;}
  .highlight{font-weight:700;color:#F26B21;}
  .footer{padding:20px 32px;background:#f9f9f9;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center;}
</style></head>
<body>
<div class="wrap">
  <div class="header"><span class="logo">Baz<span>unk</span></span></div>
  <div class="body">${content}</div>
  <div class="footer">© ${new Date().getFullYear()} Bazunk · UK Peer-to-Peer Marketplace</div>
</div>
</body></html>`;
}

export async function sendNewBidNotification(opts: {
  sellerEmail: string;
  sellerName: string;
  auctionTitle: string;
  auctionId: string;
  bidderName: string;
  bidAmount: number;
  currentBidCount: number;
}): Promise<void> {
  const { sellerEmail, sellerName, auctionTitle, auctionId, bidderName, bidAmount, currentBidCount } = opts;
  const html = base(`
    <h2>You have a new bid!</h2>
    <p>Hi ${sellerName},</p>
    <p><strong>${bidderName}</strong> just placed a bid of <span class="highlight">£${bidAmount.toFixed(2)}</span> on your auction:</p>
    <p><strong>${auctionTitle}</strong></p>
    <p>Total bids so far: ${currentBidCount}</p>
    <p><a class="btn" href="https://bazunk.replit.app/auctions/${auctionId}">View Auction</a></p>
    <p>Good luck with your sale!</p>
  `);
  await send(sellerEmail, `New bid on "${auctionTitle}"`, html);
}

export async function sendOutbidNotification(opts: {
  email: string;
  name: string;
  auctionTitle: string;
  auctionId: string;
  newBidAmount: number;
  minNextBid: number;
}): Promise<void> {
  const { email, name, auctionTitle, auctionId, newBidAmount, minNextBid } = opts;
  const html = base(`
    <h2>You've been outbid</h2>
    <p>Hi ${name},</p>
    <p>Someone has placed a higher bid of <span class="highlight">£${newBidAmount.toFixed(2)}</span> on:</p>
    <p><strong>${auctionTitle}</strong></p>
    <p>You can still win — the minimum next bid is <strong>£${minNextBid.toFixed(2)}</strong>.</p>
    <p><a class="btn" href="https://bazunk.replit.app/auctions/${auctionId}">Bid Again</a></p>
  `);
  await send(email, `You've been outbid on "${auctionTitle}"`, html);
}

export async function sendAuctionWonNotification(opts: {
  winnerEmail: string;
  winnerName: string;
  auctionTitle: string;
  auctionId: string;
  winningBid: number;
  sellerName: string;
}): Promise<void> {
  const { winnerEmail, winnerName, auctionTitle, auctionId, winningBid, sellerName } = opts;
  const html = base(`
    <h2>🎉 You won the auction!</h2>
    <p>Congratulations ${winnerName},</p>
    <p>You won <strong>${auctionTitle}</strong> with a bid of <span class="highlight">£${winningBid.toFixed(2)}</span>.</p>
    <p>The seller <strong>${sellerName}</strong> will be in touch to arrange delivery or collection.</p>
    <p><a class="btn" href="https://bazunk.replit.app/auctions/${auctionId}">View Auction</a></p>
  `);
  await send(winnerEmail, `You won "${auctionTitle}"!`, html);
}

export async function sendAuctionEndedSellerNotification(opts: {
  sellerEmail: string;
  sellerName: string;
  auctionTitle: string;
  auctionId: string;
  winnerName: string;
  winnerEmail: string;
  winningBid: number;
}): Promise<void> {
  const { sellerEmail, sellerName, auctionTitle, auctionId, winnerName, winnerEmail, winningBid } = opts;
  const html = base(`
    <h2>Your auction has ended</h2>
    <p>Hi ${sellerName},</p>
    <p>Your auction <strong>${auctionTitle}</strong> has ended with a winning bid of <span class="highlight">£${winningBid.toFixed(2)}</span>.</p>
    <p>Winner: <strong>${winnerName}</strong> (${winnerEmail})</p>
    <p>Please arrange delivery or collection with the winner.</p>
    <p><a class="btn" href="https://bazunk.replit.app/auctions/${auctionId}">View Auction</a></p>
  `);
  await send(sellerEmail, `Your auction "${auctionTitle}" has ended`, html);
}

export async function sendCreditsConfirmation(opts: {
  email: string;
  name?: string;
  creditsAdded: number;
  newBalance: number;
}): Promise<void> {
  const { email, name, creditsAdded, newBalance } = opts;
  const html = base(`
    <h2>Credits added to your account</h2>
    <p>Hi ${name ?? "there"},</p>
    <p><span class="highlight">£${creditsAdded.toFixed(2)}</span> in credits have been added to your Bazunk account.</p>
    <p>Your new balance is <strong>£${newBalance.toFixed(2)}</strong>.</p>
    <p>Use your credits to buy listings or boost your auctions on Bazunk.</p>
    <p><a class="btn" href="https://bazunk.replit.app/dashboard">Go to Dashboard</a></p>
  `);
  await send(email, "Your Bazunk credits have been added", html);
}

export async function sendOrderConfirmation(opts: {
  email: string;
  name?: string;
  items: Array<{ title: string; price: number; quantity: number }>;
  total: number;
}): Promise<void> {
  const { email, name, items, total } = opts;
  const itemRows = items.map(i =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${i.title}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">x${i.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">£${(i.price * i.quantity).toFixed(2)}</td></tr>`
  ).join("");
  const html = base(`
    <h2>Order confirmed</h2>
    <p>Hi ${name ?? "there"},</p>
    <p>Thank you for your purchase on Bazunk. Here's your order summary:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
      <thead><tr>
        <th style="text-align:left;padding:6px 0;border-bottom:2px solid #eee">Item</th>
        <th style="text-align:right;padding:6px 0;border-bottom:2px solid #eee">Qty</th>
        <th style="text-align:right;padding:6px 0;border-bottom:2px solid #eee">Price</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot><tr><td colspan="2" style="padding:8px 0;font-weight:700">Total</td><td style="padding:8px 0;font-weight:700;text-align:right">£${total.toFixed(2)}</td></tr></tfoot>
    </table>
    <p>The seller will be in touch to arrange delivery or collection.</p>
    <p><a class="btn" href="https://bazunk.replit.app/dashboard">View My Orders</a></p>
  `);
  await send(email, "Your Bazunk order is confirmed", html);
}
