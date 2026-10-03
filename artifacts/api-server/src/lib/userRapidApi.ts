import crypto from "crypto";
import type { Request } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const BAZUNK_API_EMAILS = new Set(["cczslater@gmail.com", "admin@bazunk.com"]);
const secret = () => process.env.RAPIDAPI_USER_KEY_ENCRYPTION_SECRET || process.env.CLERK_SECRET_KEY || process.env.RAPIDAPI_KEY || "";
function key32(){ const s=secret(); if(!s) throw new Error("Encryption secret is not configured"); return crypto.createHash("sha256").update(s).digest(); }
export function encryptRapidKey(value:string){ const iv=crypto.randomBytes(12); const c=crypto.createCipheriv("aes-256-gcm",key32(),iv); const enc=Buffer.concat([c.update(value,"utf8"),c.final()]); return `${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${enc.toString("base64")}`; }
export function decryptRapidKey(value:string){ const [a,b,c]=value.split("."); const d=crypto.createDecipheriv("aes-256-gcm",key32(),Buffer.from(a,"base64")); d.setAuthTag(Buffer.from(b,"base64")); return Buffer.concat([d.update(Buffer.from(c,"base64")),d.final()]).toString("utf8"); }
export async function requestEmail(req:Request){ const a=getAuth(req); if(!a.isAuthenticated||!a.userId) return null; const u=await clerkClient.users.getUser(a.userId); return u.primaryEmailAddress?.emailAddress?.toLowerCase() || null; }
export async function rapidKeyForEmail(email:string){ email=email.toLowerCase(); if(BAZUNK_API_EMAILS.has(email)) return process.env.RAPIDAPI_KEY||null; const r=await db.execute(sql`SELECT encrypted_key FROM user_rapidapi_keys WHERE email=${email} LIMIT 1`); const encrypted=(r.rows[0] as any)?.encrypted_key; return encrypted?decryptRapidKey(String(encrypted)):null; }
export async function rapidKeyForRequest(req:Request){ const email=await requestEmail(req); if(!email) return {email:null,key:null,bazunk:false}; if(BAZUNK_API_EMAILS.has(email)) return {email,key:process.env.RAPIDAPI_KEY||null,bazunk:true}; return {email,key:await rapidKeyForEmail(email),bazunk:false}; }
