import { Router, type Request } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { db } from '@workspace/db'; import { sql } from 'drizzle-orm'; import { randomUUID } from 'crypto';
import { requireAdmin } from '../middlewares/adminAuth.js'; import { ensureReferralUser, awardReferralMilestone } from '../lib/referrals.js';
const router=Router();
async function email(req:Request){const a=getAuth(req);if(!a.isAuthenticated||!a.userId)return null;const u=await clerkClient.users.getUser(a.userId);return u.primaryEmailAddress?.emailAddress?.toLowerCase()??null;}
router.get('/referrals/me',async(req,res)=>{const e=await email(req);if(!e)return res.status(401).json({error:'Sign in required'});const code=await ensureReferralUser(e);const rows=await db.execute(sql`SELECT r.id,r.referred_email,r.created_at,r.joined_rewarded_at,r.purchase_rewarded_at,r.seller_rewarded_at FROM referrals r WHERE LOWER(r.referrer_email)=LOWER(${e}) ORDER BY r.created_at DESC`);const rewards=await db.execute(sql`SELECT COALESCE(SUM(referrer_credits),0)::int total FROM referral_rewards rr JOIN referrals r ON r.id=rr.referral_id WHERE LOWER(r.referrer_email)=LOWER(${e})`);const sr=await db.execute(sql`SELECT key,value FROM referral_settings`);
const settings=Object.fromEntries(sr.rows.map((x:any)=>[x.key,Number(x.value)]));
res.json({code,totalEarned:Number((rewards.rows[0] as any)?.total||0),settings,referrals:rows.rows.map((x:any)=>({...x,referred_email:x.referred_email.replace(/^(.{2}).*(@.*)$/,'$1***$2')}))});});
router.post('/referrals/claim',async(req,res)=>{const e=await email(req);if(!e)return res.status(401).json({error:'Sign in required'});const code=String(req.body?.code||'').trim().toUpperCase();if(!code)return res.status(400).json({error:'Referral code required'});await ensureReferralUser(e);const own=await db.execute(sql`SELECT referral_code FROM users WHERE LOWER(email)=LOWER(${e})`);if((own.rows[0] as any)?.referral_code===code)return res.status(400).json({error:'You cannot refer yourself'});const ref=await db.execute(sql`SELECT email FROM users WHERE referral_code=${code} LIMIT 1`);if(!ref.rows.length)return res.status(404).json({error:'Referral code not found'});const referrer=(ref.rows[0] as any).email;const ins=await db.execute(sql`INSERT INTO referrals(id,referrer_email,referred_email,referral_code,created_at) VALUES(${randomUUID()},${referrer},${e},${code},NOW()) ON CONFLICT(referred_email) DO NOTHING RETURNING id`);if(!ins.rows.length)return res.status(409).json({error:'This account already has a referrer'});await awardReferralMilestone(e,'joined');res.json({ok:true});});
router.get('/admin/referrals',requireAdmin,async(_req,res)=>{const [rels,settings]=await Promise.all([db.execute(sql`SELECT * FROM referrals ORDER BY created_at DESC`),db.execute(sql`SELECT key,value FROM referral_settings`)]);res.json({referrals:rels.rows,settings:Object.fromEntries(settings.rows.map((x:any)=>[x.key,Number(x.value)]))});});
router.patch('/admin/referrals/settings',requireAdmin,async(req,res)=>{
 try{
  const allowed=['enabled','join_referrer','join_friend','purchase_referrer','purchase_friend','seller_referrer','seller_friend'];
  for(const k of allowed){
   if(!(k in (req.body||{}))) continue;
   const n=Number(req.body[k]);
   if(!Number.isFinite(n)||n<0) return res.status(400).json({error:`Invalid value for ${k}`});
   await db.execute(sql`INSERT INTO referral_settings(key,value) VALUES(${k},${String(Math.round(n))}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`);
  }
  const saved=await db.execute(sql`SELECT key,value FROM referral_settings`);
  res.json({ok:true,settings:Object.fromEntries(saved.rows.map((x:any)=>[x.key,Number(x.value)]))});
 }catch(err){console.error('Saving referral settings failed:',err);res.status(500).json({error:'Could not save referral settings'});}
});
export default router;
