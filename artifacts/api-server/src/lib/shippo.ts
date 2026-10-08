import { logger } from "./logger.js";

const BASE="https://api.goshippo.com";
const carrierMap:Record<string,string>={
 "royal mail":"royal_mail","royalmail":"royal_mail","evri":"hermes_uk","hermes":"hermes_uk",
 "dpd":"dpd_uk","dpd uk":"dpd_uk","dhl":"dhl_express","dhl express":"dhl_express",
 "ups":"ups","yodel":"yodel","parcelforce":"parcelforce","fedex":"fedex","usps":"usps"
};

export function shippoCarrier(name?:string|null, trackingNumber?:string|null){
 if (/^SHIPPO_(?:PRE_TRANSIT|TRANSIT|DELIVERED|RETURNED|FAILURE|UNKNOWN)$/i.test(String(trackingNumber||"").trim())) return "shippo";
 const n=String(name||"").trim().toLowerCase();
 return carrierMap[n]||n.replace(/\s+/g,"_");
}
export function shippoEnabled(){return Boolean(process.env.SHIPPO_API_TOKEN);}
async function request(path:string,init:RequestInit={}){
 const token=process.env.SHIPPO_API_TOKEN;
 if(!token) throw new Error("SHIPPO_API_TOKEN is not configured");
 const r=await fetch(`${BASE}${path}`,{...init,headers:{Authorization:`ShippoToken ${token}`,"Content-Type":"application/json","SHIPPO-API-VERSION":"2018-02-08",...(init.headers||{})}});
 const body:any=await r.json().catch(()=>({}));
 if(!r.ok) {
  const detail = body?.detail ?? body?.message ?? body?.messages ?? body?.error ?? body;
  const detailText = typeof detail === "string" ? detail : JSON.stringify(detail);
  throw new Error(`Shippo HTTP ${r.status}: ${detailText.slice(0, 500)}`);
 }
 return body;
}
export async function registerTracking(carrier:string,trackingNumber:string,orderId:string){
 const token=shippoCarrier(carrier,trackingNumber);
 try{return await request("/tracks",{method:"POST",body:JSON.stringify({carrier:token,tracking_number:trackingNumber,metadata:`Bazunk ${orderId}`.slice(0,100)})});}
 catch(err){logger.warn({err,orderId,carrier:token},"Shippo tracking registration failed");throw err;}
}
export async function getTracking(carrier:string,trackingNumber:string){
 return request(`/tracks/${encodeURIComponent(shippoCarrier(carrier,trackingNumber))}/${encodeURIComponent(trackingNumber)}`);
}
export function mapShippoStatus(status?:string|null){
 switch(String(status||"").toUpperCase()){
  case "DELIVERED": return "delivered";
  case "TRANSIT": return "shipped";
  case "RETURNED": case "FAILURE": return "shipped";
  default:return null;
 }
}
