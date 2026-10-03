import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { BAZUNK_API_EMAILS, encryptRapidKey, requestEmail, rapidKeyForRequest } from "../lib/userRapidApi.js";
const router=Router();
const tests=[
 ["amazon","https://real-time-amazon-data.p.rapidapi.com/search?query=usb&country=GB&page=1","real-time-amazon-data.p.rapidapi.com"],
 ["ebay","https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=usb&marketplace_id=EBAY_GB&offset=0","real-time-ebay-data.p.rapidapi.com"],
 ["aliexpress","https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=1005006000000000&currency=USD&locale=en_US&region=GB&country=GB","aliexpress-datahub.p.rapidapi.com"]
] as const;
async function check(key:string){ const out:any={}; for(const [name,url,host] of tests){ try{const r=await fetch(url,{headers:{"X-RapidAPI-Key":key,"X-RapidAPI-Host":host}}); out[name]={ok:r.ok,status:r.status,message:r.ok?"Connected":r.status===403?"Subscription required or key not authorised":r.status===429?"Quota exceeded":`HTTP ${r.status}`};}catch{out[name]={ok:false,status:0,message:"Connection failed"};}} return out; }
router.get("/user/rapidapi",async(req,res)=>{const x=await rapidKeyForRequest(req); if(!x.email){res.status(401).json({error:"Sign in required"});return;} if(x.bazunk){res.json({bazunk:true,connected:!!x.key,masked:"Bazunk server credentials"});return;} const r=await db.execute(sql`SELECT key_last4 FROM user_rapidapi_keys WHERE email=${x.email}`); const row=r.rows[0] as any; res.json({bazunk:false,connected:!!row,masked:row?`••••••••${row.key_last4}`:null});});
router.put("/user/rapidapi",async(req,res)=>{const email=await requestEmail(req); if(!email){res.status(401).json({error:"Sign in required"});return;} if(BAZUNK_API_EMAILS.has(email)){res.status(400).json({error:"Bazunk accounts use the server credentials automatically"});return;} const key=String(req.body?.key||"").trim(); if(key.length<20){res.status(400).json({error:"Enter your X-RapidAPI-Key"});return;} const encrypted=encryptRapidKey(key); await db.execute(sql`INSERT INTO user_rapidapi_keys(email,encrypted_key,key_last4,updated_at) VALUES(${email},${encrypted},${key.slice(-4)},NOW()) ON CONFLICT(email) DO UPDATE SET encrypted_key=EXCLUDED.encrypted_key,key_last4=EXCLUDED.key_last4,updated_at=NOW()`); res.json({ok:true,masked:`••••••••${key.slice(-4)}`});});
router.delete("/user/rapidapi",async(req,res)=>{const email=await requestEmail(req); if(!email){res.status(401).json({error:"Sign in required"});return;} if(BAZUNK_API_EMAILS.has(email)){res.status(400).json({error:"Bazunk server credentials cannot be removed here"});return;} await db.execute(sql`DELETE FROM user_rapidapi_keys WHERE email=${email}`);res.json({ok:true});});
router.post("/user/rapidapi/test",async(req,res)=>{const x=await rapidKeyForRequest(req); if(!x.email){res.status(401).json({error:"Sign in required"});return;} if(!x.key){res.status(400).json({error:"Connect a RapidAPI key first"});return;} res.json({bazunk:x.bazunk,results:await check(x.key)});});
export default router;
