import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";

export function referralCode(email:string) { return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0,8).toUpperCase(); }
async function setting(key:string, fallback:number){ const r=await db.execute(sql`SELECT value FROM referral_settings WHERE key=${key}`); return Number((r.rows[0] as any)?.value ?? fallback); }
export async function ensureReferralUser(email:string){ const code=referralCode(email); await db.execute(sql`UPDATE users SET referral_code=COALESCE(referral_code,${code}) WHERE LOWER(email)=LOWER(${email})`); return code; }
export async function awardReferralMilestone(referredEmail:string, milestone:'joined'|'purchase'|'seller'){
 const enabled=await setting('enabled',1); if(!enabled)return;
 const rel=await db.execute(sql`SELECT * FROM referrals WHERE LOWER(referred_email)=LOWER(${referredEmail}) LIMIT 1`); const row=rel.rows[0] as any; if(!row)return;
 const a=milestone==='joined'?'join_referrer':milestone==='purchase'?'purchase_referrer':'seller_referrer';
 const b=milestone==='joined'?'join_friend':milestone==='purchase'?'purchase_friend':'seller_friend';
 const refAmt=await setting(a,milestone==='joined'?5:milestone==='purchase'?10:15); const friendAmt=await setting(b,milestone==='joined'?5:10);
 const eventId=`${row.id}:${milestone}`;
 const inserted=await db.execute(sql`INSERT INTO referral_rewards(id,referral_id,milestone,referrer_credits,friend_credits,created_at) VALUES(${eventId},${row.id},${milestone},${refAmt},${friendAmt},NOW()) ON CONFLICT(id) DO NOTHING RETURNING id`);
 if(!inserted.rows.length)return;
 for(const [email,amt,who] of [[row.referrer_email,refAmt,'referrer'],[row.referred_email,friendAmt,'friend']] as any[]){ if(amt<=0)continue; await db.execute(sql`UPDATE users SET credits=credits+${amt} WHERE LOWER(email)=LOWER(${email})`); await db.execute(sql`INSERT INTO credit_transactions(id,email,credits_added,created_at) VALUES(${randomUUID()},${email},${amt},NOW())`); }
 await db.execute(sql`UPDATE referrals SET ${sql.raw(milestone+'_rewarded_at')}=NOW() WHERE id=${row.id}`);
}
