import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();
export const OPTIONAL_EMAIL_CATEGORIES = ["offers","auction_bids","listing_updates","flash_sales","rewards","marketing"] as const;
type Category = typeof OPTIONAL_EMAIL_CATEGORIES[number];
function emailFromToken(token:string):string|null {
  const secret=process.env.EMAIL_PREFERENCES_SECRET||process.env.SESSION_SECRET;
  if(!secret || !token.includes("."))return null;
  const [data,signature]=token.split(".");
  if(!data || !signature || data.length>500)return null;
  const expected=createHmac("sha256",secret).update(data).digest("base64url");
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length || !timingSafeEqual(a,b))return null;
  const email=Buffer.from(data,"base64url").toString("utf8").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null;
}
async function ensureTable(){
  await db.execute(sql`CREATE TABLE IF NOT EXISTS email_notification_preferences (
    email TEXT NOT NULL, category TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(email,category)
  )`);
}
router.get("/email-preferences",async(req,res)=>{
  const email=emailFromToken(String(req.query.token||""));
  if(!email){res.status(401).json({error:"Invalid preferences link"});return;}
  try {await ensureTable();const rows=await db.execute(sql`SELECT category,enabled FROM email_notification_preferences WHERE email=${email}`);
    const preferences=Object.fromEntries(OPTIONAL_EMAIL_CATEGORIES.map(key=>[key,true]));
    for(const row of rows.rows){if(OPTIONAL_EMAIL_CATEGORIES.includes(String(row.category) as Category))preferences[String(row.category)]=Boolean(row.enabled);}
    res.setHeader("Cache-Control","no-store");res.json({email,preferences});
  }catch{res.status(500).json({error:"Could not load preferences"});}
});
router.put("/email-preferences",async(req,res)=>{
  const email=emailFromToken(String(req.body?.token||""));
  if(!email){res.status(401).json({error:"Invalid preferences link"});return;}
  const input=req.body?.preferences;
  if(!input || typeof input!=="object" || Array.isArray(input)){res.status(400).json({error:"Invalid preferences"});return;}
  try {await ensureTable();
    for(const category of OPTIONAL_EMAIL_CATEGORIES){
      if(typeof input[category]!=="boolean")continue;
      await db.execute(sql`INSERT INTO email_notification_preferences(email,category,enabled) VALUES(${email},${category},${input[category]}) ON CONFLICT(email,category) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=NOW()`);
    }
    res.json({ok:true});
  }catch{res.status(500).json({error:"Could not save preferences"});}
});
export default router;
