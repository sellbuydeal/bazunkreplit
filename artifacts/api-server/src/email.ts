// Email via Resend. Set RESEND_API_KEY (and optionally EMAIL_FROM) in the environment.
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHmac } from "node:crypto";

const FROM = process.env.EMAIL_FROM ?? "Bazunk <onboarding@resend.dev>";
const SITE = process.env.PUBLIC_BASE_URL ?? "https://bazunk-web.onrender.com";


function esc(v: unknown): string { return String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"} as Record<string,string>)[ch]); }
function fill(text: string, vars: Record<string, unknown>): string { return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m,k) => String(vars[k] ?? "")); }
async function editableTemplate(key:string, defaultSubject:string, defaultBody:string, vars:Record<string,unknown>) {
  try {
    const rows=(await db.execute(sql`SELECT key,value FROM site_settings WHERE key IN (${`email_subject_${key}`},${`email_body_${key}`})`)).rows as any[];
    const values=Object.fromEntries(rows.map(r=>[String(r.key),String(r.value??"")]));
    const subject=fill(values[`email_subject_${key}`]||defaultSubject,vars);
    const bodyText=fill(values[`email_body_${key}`]||defaultBody,vars);
    const bodyHtml=bodyText.split(/\n{2,}/).map(p=>`<p>${p.split("\n").map(esc).join("<br>")}</p>`).join("");
    return {subject,bodyHtml};
  } catch { return {subject:fill(defaultSubject,vars),bodyHtml:defaultBody.split(/\n{2,}/).map(p=>`<p>${p.split("\n").map(esc).join("<br>")}</p>`).join("")}; }
}
export async function sendWelcomeEmail(email:string,name?:string):Promise<void>{
  const t=await editableTemplate("welcome","Welcome to Bazunk!","Hi {{name}},\n\nWelcome to Bazunk. Your account is ready. You can browse, make offers and sell.\n\nOpen your Dashboard: {{dashboard_url}}",{name:name||"there",dashboard_url:`${SITE}/dashboard`});
  await send(email,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<p><a class="btn" href="${SITE}/dashboard">Open Dashboard</a></p>`));
}

function tokenFor(email:string):string { const secret=process.env.EMAIL_PREFERENCES_SECRET||process.env.SESSION_SECRET; if(!secret)return "";const data=Buffer.from(email.toLowerCase().trim()).toString("base64url");return data+"."+createHmac("sha256",secret).update(data).digest("base64url"); }
async function send(to: string, subject: string, html: string): Promise<void> {
  const token=tokenFor(to);
  if(token){const url=`${SITE}/settings/notifications?token=${encodeURIComponent(token)}`;html=html.replace("</body>",`<div style="max-width:560px;margin:0 auto 20px;text-align:center;font:12px Arial;color:#777"><a href="${url}">Manage notifications</a> · <a href="${url}&unsubscribe=marketing">Unsubscribe from marketing</a></div></body>`);}

  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn({ to, subject }, "RESEND_API_KEY not set — email skipped");
      return;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
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
  <div class="footer">© ${new Date().getFullYear()} Bazunk · UK Peer-to-Peer Marketplace<br><a href="${SITE}/terms">Terms &amp; Conditions</a> · <a href="${SITE}/privacy">Privacy Policy</a></div>
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
    <p><a class="btn" href="${SITE}/auctions/${auctionId}">View Auction</a></p>
    <p>Good luck with your sale!</p>
  `);
  const t=await editableTemplate("new_bid",`New bid on "{{auction_title}}"`,`{{bidder_name}} placed a bid of £{{bid_amount}} on {{auction_title}}.\n\nTotal bids: {{bid_count}}\n\nView auction: {{auction_url}}`,{auction_title:auctionTitle,bidder_name:bidderName,bid_amount:bidAmount.toFixed(2),bid_count:currentBidCount,auction_url:`${SITE}/auctions/${auctionId}`});
  await send(sellerEmail,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<p><a class="btn" href="${SITE}/auctions/${auctionId}">View Auction</a></p>`));
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
    <p><a class="btn" href="${SITE}/auctions/${auctionId}">Bid Again</a></p>
  `);
  const t=await editableTemplate("outbid",`You\'ve been outbid on "{{auction_title}}"`,`You\'ve been outbid on {{auction_title}}.\n\nNew bid: £{{new_bid}}\nMinimum next bid: £{{min_next_bid}}\n\nBid again: {{auction_url}}`,{auction_title:auctionTitle,new_bid:newBidAmount.toFixed(2),min_next_bid:minNextBid.toFixed(2),auction_url:`${SITE}/auctions/${auctionId}`});
  await send(email,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<p><a class="btn" href="${SITE}/auctions/${auctionId}">Bid Again</a></p>`));
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
    <p><a class="btn" href="${SITE}/auctions/${auctionId}">View Auction</a></p>
  `);
  const t=await editableTemplate("auction_won",`You won "{{auction_title}}"!`,`Congratulations {{name}} — you won {{auction_title}} with a bid of £{{winning_bid}}.\n\nView auction: {{auction_url}}`,{name:winnerName,auction_title:auctionTitle,winning_bid:winningBid.toFixed(2),auction_url:`${SITE}/auctions/${auctionId}`});
  await send(winnerEmail,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<p><a class="btn" href="${SITE}/auctions/${auctionId}">View Auction</a></p>`));
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
    <p><a class="btn" href="${SITE}/auctions/${auctionId}">View Auction</a></p>
  `);
  const t=await editableTemplate("auction_ended",`Your auction "{{auction_title}}" has ended`,`Your auction {{auction_title}} ended with a winning bid of £{{winning_bid}}.\n\nWinner: {{winner_name}} ({{winner_email}})\n\nOpen auction: {{auction_url}}`,{auction_title:auctionTitle,winning_bid:winningBid.toFixed(2),winner_name:winnerName,winner_email:winnerEmail,auction_url:`${SITE}/auctions/${auctionId}`});
  await send(sellerEmail,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<p><a class="btn" href="${SITE}/auctions/${auctionId}">View Auction</a></p>`));
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
    <p><a class="btn" href="${SITE}/dashboard">Go to Dashboard</a></p>
  `);
  const t=await editableTemplate("credits_added","Your Bazunk credits have been added","Hi {{name}},\n\n{{credits}} credits have been added to your Bazunk account.\n\nYour new balance is {{balance}}.\n\nOpen Dashboard: {{dashboard_url}}",{name:name??"there",credits:creditsAdded.toFixed(2),balance:newBalance.toFixed(2),dashboard_url:`${SITE}/dashboard`});
  await send(email,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<p><a class="btn" href="${SITE}/dashboard">Go to Dashboard</a></p>`));
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
    <div style="margin:20px 0;padding:16px;background:#f3f5ff;border:1px solid #dfe3ff;border-radius:8px">
      <p style="margin:0 0 8px"><strong>Bought as a guest?</strong></p>
      <p style="margin:0">To see and track this order, create a Bazunk account using <strong>the same email address this confirmation was sent to</strong>. If you already have an account with this email, simply sign in. Once the email matches your Bazunk account, this purchase will appear automatically in your Dashboard — you do not need to enter an order number or claim the purchase manually.</p>
    </div>
    <p><a class="btn" href="${SITE}/sign-up">Create account / sign in</a></p>
    <p style="font-size:13px;color:#666">Already signed in with this email? <a href="${SITE}/dashboard">View My Orders</a></p>
  `);
  const t = await editableTemplate("order_confirmed","Your Bazunk order is confirmed","Hi {{name}},\n\nThanks for your purchase. Your Bazunk order is confirmed.\n\nTotal: £{{total}}\n\nIf you bought as a guest, create or sign in to Bazunk using this same email address. Your purchase will appear automatically in your Dashboard.\n\nView your orders: {{dashboard_url}}",{name:name??"there",total:total.toFixed(2),dashboard_url:`${SITE}/dashboard`});
  await send(email, t.subject, base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<hr style="border:0;border-top:1px solid #eee;margin:20px 0"/><table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px"><tbody>${itemRows}</tbody></table><p><a class="btn" href="${SITE}/dashboard">View My Orders</a></p>`));
}


export async function sendSellerSaleNotification(opts: { email: string; items: Array<{ title: string; price: number; quantity: number }>; buyerEmail: string }): Promise<void> {
  const rows = opts.items.map(i => `<li>${i.title} × ${i.quantity} — £${(i.price*i.quantity).toFixed(2)}</li>`).join("");
  const t=await editableTemplate("sale_made","New Bazunk sale — action required","You made a sale on Bazunk.\n\nBuyer: {{buyer_email}}\n\nOpen your seller Dashboard to fulfil the order: {{dashboard_url}}",{buyer_email:opts.buyerEmail,dashboard_url:`${SITE}/dashboard`});
  await send(opts.email,t.subject,base(`<h2>${esc(t.subject)}</h2>${t.bodyHtml}<ul>${rows}</ul><p><a class="btn" href="${SITE}/dashboard">Open seller dashboard</a></p>`));
}
