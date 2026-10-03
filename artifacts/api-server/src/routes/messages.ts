import { Router, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

async function authEmail(req: Request): Promise<string | null> {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) return null;
  const user = await clerkClient.users.getUser(userId);
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
}

async function conversationForUser(id: number, email: string) {
  const r = await db.execute(sql`
    SELECT c.*, l.title, l.price, l.image, l.public_id,
           COALESCE(l.seller_username, l.seller_name, split_part(l.seller_email,'@',1)) AS seller_display
    FROM marketplace_conversations c
    JOIN listings l ON l.id = c.listing_id
    WHERE c.id=${id} AND (LOWER(c.buyer_email)=LOWER(${email}) OR LOWER(c.seller_email)=LOWER(${email}))
    LIMIT 1
  `);
  return r.rows[0] as any | undefined;
}

router.post("/messages/conversations", async (req: Request, res: Response) => {
  const email = await authEmail(req);
  if (!email) return res.status(401).json({ error: "Sign in to message a seller" });
  const listingId = Number(req.body?.listingId);
  if (!Number.isInteger(listingId) || listingId <= 0) return res.status(400).json({ error: "Invalid listing" });
  const lr = await db.execute(sql`SELECT id, seller_email FROM listings WHERE id=${listingId} AND status='active' LIMIT 1`);
  const listing = lr.rows[0] as any;
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  const seller = String(listing.seller_email).toLowerCase();
  if (seller === email) return res.status(400).json({ error: "You cannot message yourself about your own listing" });
  const cr = await db.execute(sql`
    INSERT INTO marketplace_conversations (listing_id,buyer_email,seller_email,updated_at)
    VALUES (${listingId},${email},${seller},NOW())
    ON CONFLICT (listing_id,buyer_email,seller_email) DO UPDATE SET updated_at=marketplace_conversations.updated_at
    RETURNING id
  `);
  res.json({ id: Number((cr.rows[0] as any).id) });
});

router.get("/messages/conversations", async (req: Request, res: Response) => {
  const email = await authEmail(req);
  if (!email) return res.status(401).json({ error: "Sign in required" });
  const r = await db.execute(sql`
    SELECT c.id,c.listing_id,c.buyer_email,c.seller_email,c.updated_at,
      l.title,l.price,l.image,l.public_id,l.seller_name,l.seller_username,
      (SELECT text FROM marketplace_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) last_text,
      (SELECT created_at FROM marketplace_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) last_at,
      (SELECT COUNT(*)::int FROM marketplace_messages m WHERE m.conversation_id=c.id AND LOWER(m.sender_email)<>LOWER(${email}) AND m.read_at IS NULL) unread
    FROM marketplace_conversations c JOIN listings l ON l.id=c.listing_id
    WHERE LOWER(c.buyer_email)=LOWER(${email}) OR LOWER(c.seller_email)=LOWER(${email})
    ORDER BY COALESCE((SELECT MAX(m.created_at) FROM marketplace_messages m WHERE m.conversation_id=c.id),c.updated_at) DESC
  `);
  const items=[] as any[];
  for (const row of r.rows as any[]) {
    const other = String(row.buyer_email).toLowerCase()===email ? row.seller_email : row.buyer_email;
    const ur=await db.execute(sql`SELECT name FROM users WHERE LOWER(email)=LOWER(${other}) LIMIT 1`);
    const otherName=(ur.rows[0] as any)?.name || (String(row.seller_email).toLowerCase()===String(other).toLowerCase() ? row.seller_username || row.seller_name : null) || String(other).split('@')[0];
    items.push({id:Number(row.id),with:{name:otherName,avatar:otherName.slice(0,2).toUpperCase(),location:"UK",rating:0,reviews:0},listingTitle:row.title,listingPrice:Number(row.price),listingImage:row.image||"",listingId:Number(row.listing_id),unread:Number(row.unread||0),lastText:row.last_text||"No messages yet",lastAt:row.last_at||row.updated_at});
  }
  res.json(items);
});

router.get("/messages/conversations/:id", async (req: Request, res: Response) => {
  const email=await authEmail(req); if(!email) return res.status(401).json({error:"Sign in required"});
  const id=Number(req.params.id); const c=await conversationForUser(id,email); if(!c) return res.status(404).json({error:"Conversation not found"});
  await db.execute(sql`UPDATE marketplace_messages SET read_at=NOW() WHERE conversation_id=${id} AND LOWER(sender_email)<>LOWER(${email}) AND read_at IS NULL`);
  const mr=await db.execute(sql`SELECT id,sender_email,text,created_at,read_at FROM marketplace_messages WHERE conversation_id=${id} ORDER BY created_at ASC`);
  res.json({messages:(mr.rows as any[]).map(m=>({id:Number(m.id),senderId:String(m.sender_email).toLowerCase()===email?"me":"them",text:m.text,timestamp:m.created_at,read:!!m.read_at}))});
});

router.post("/messages/conversations/:id/messages", async (req: Request, res: Response) => {
  const email=await authEmail(req); if(!email) return res.status(401).json({error:"Sign in required"});
  const id=Number(req.params.id); const c=await conversationForUser(id,email); if(!c) return res.status(404).json({error:"Conversation not found"});
  const text=String(req.body?.text||"").trim(); if(!text) return res.status(400).json({error:"Message cannot be empty"}); if(text.length>2000) return res.status(400).json({error:"Message is too long"});
  const r=await db.execute(sql`INSERT INTO marketplace_messages(conversation_id,sender_email,text) VALUES(${id},${email},${text}) RETURNING id,created_at`);
  await db.execute(sql`UPDATE marketplace_conversations SET updated_at=NOW() WHERE id=${id}`);
  const row=r.rows[0] as any; res.status(201).json({id:Number(row.id),senderId:"me",text,timestamp:row.created_at,read:false});
});

export default router;
