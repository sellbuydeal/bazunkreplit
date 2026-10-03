import * as crypto from "node:crypto";
import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { rapidApiErrorMessage, type ApiTestResult } from "./rapidapi.js";

const API_INFO = {
  amazon: { name: "Amazon (Real-Time Amazon Data)", host: "real-time-amazon-data.p.rapidapi.com", url: "https://real-time-amazon-data.p.rapidapi.com/search?query=usb&country=GB&page=1" },
  ebay: { name: "eBay (Real-Time eBay Data)", host: "real-time-ebay-data.p.rapidapi.com", url: "https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=usb&marketplace_id=EBAY_GB&offset=0" },
  aliexpress: { name: "AliExpress (DataHub)", host: "aliexpress-datahub.p.rapidapi.com", url: "https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=1005006000000000&currency=USD&locale=en_US&region=GB&country=GB" },
} as const;

function secretKey(): Buffer {
  const secret = process.env.RAPIDAPI_USER_KEY_ENCRYPTION_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("RAPIDAPI_USER_KEY_ENCRYPTION_SECRET is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}
function encrypt(value: string): string {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(b => b.toString("base64url")).join(".");
}
function decrypt(value: string): string {
  const [ivS, tagS, dataS] = value.split("."); if (!ivS || !tagS || !dataS) throw new Error("Invalid encrypted key");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivS, "base64url"));
  decipher.setAuthTag(Buffer.from(tagS, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataS, "base64url")), decipher.final()]).toString("utf8");
}
export async function authEmail(req: Request): Promise<string | null> {
  const a = getAuth(req); if (!a.isAuthenticated || !a.userId) return null;
  const u = await clerkClient.users.getUser(a.userId);
  return u.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
}
export async function isBazunkAdmin(email: string): Promise<boolean> {
  const row = await db.execute(sql`SELECT value FROM site_settings WHERE key='admin_email' LIMIT 1`).then(r => r.rows[0] as any);
  return email.toLowerCase() === String(row?.value || "cczslater@gmail.com").trim().toLowerCase();
}
export async function getRapidApiKeyForEmail(email: string): Promise<{key:string|null; admin:boolean}> {
  if (await isBazunkAdmin(email)) return { key: process.env.RAPIDAPI_KEY?.trim() || null, admin: true };
  const row = await db.execute(sql`SELECT encrypted_key FROM user_rapidapi_keys WHERE LOWER(user_email)=LOWER(${email}) LIMIT 1`).then(r => r.rows[0] as any);
  if (!row?.encrypted_key) return { key: null, admin: false };
  try { return { key: decrypt(String(row.encrypted_key)), admin: false }; } catch { return { key: null, admin: false }; }
}
export async function saveUserRapidApiKey(email: string, key: string) {
  const clean=key.trim(); if (clean.length < 20) throw new Error("That does not look like a RapidAPI key");
  await db.execute(sql`INSERT INTO user_rapidapi_keys(user_email, encrypted_key, key_hint, updated_at) VALUES (${email},${encrypt(clean)},${"…"+clean.slice(-4)},NOW()) ON CONFLICT(user_email) DO UPDATE SET encrypted_key=EXCLUDED.encrypted_key,key_hint=EXCLUDED.key_hint,updated_at=NOW()`);
}
export async function deleteUserRapidApiKey(email:string){ await db.execute(sql`DELETE FROM user_rapidapi_keys WHERE LOWER(user_email)=LOWER(${email})`); }
export async function userRapidApiStatus(email:string){
  const admin=await isBazunkAdmin(email); if(admin) return {admin:true,configured:!!process.env.RAPIDAPI_KEY,hint:process.env.RAPIDAPI_KEY?`…${process.env.RAPIDAPI_KEY.slice(-4)}`:null};
  const row=await db.execute(sql`SELECT key_hint FROM user_rapidapi_keys WHERE LOWER(user_email)=LOWER(${email}) LIMIT 1`).then(r=>r.rows[0] as any);
  return {admin:false,configured:!!row,hint:row?.key_hint||null};
}
async function ping(info: typeof API_INFO[keyof typeof API_INFO], key:string):Promise<ApiTestResult>{
  try { const r=await fetch(info.url,{headers:{"X-RapidAPI-Key":key,"X-RapidAPI-Host":info.host}}); return {api:info.name,ok:r.ok,status:r.status,message:r.ok?"Working":rapidApiErrorMessage(info.name,r.status)}; }
  catch{return {api:info.name,ok:false,status:null,message:`${info.name}: could not reach RapidAPI.`};}
}
export async function testUserRapidApiKey(key:string){ return Promise.all(Object.values(API_INFO).map(i=>ping(i,key))); }
