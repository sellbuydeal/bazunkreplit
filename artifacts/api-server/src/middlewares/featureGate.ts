import type { Request,Response,NextFunction } from "express";
import { featureEnabled } from "../lib/featureFlags.js";
const rules:[RegExp,string][]=[
 [/^\/auctions(?:\/|$)/,"auctions"],[/^\/flash-sales(?:\/|$)/,"flash_sales"],[/^\/classifieds(?:\/|$)/,"classifieds"],[/^\/live(?:\/|$)|^\/livekit(?:\/|$)/,"live"],
 [/^\/rewards(?:\/|$)|^\/treasure-hunt(?:\/|$)/,"games"],[/^\/referrals(?:\/|$)/,"referrals"],[/^\/promotions(?:\/|$)/,"promotions"],
 [/^\/watch(?:ers)?(?:\/|$)/,"watchers"],[/^\/messages(?:\/|$)/,"messaging"],[/^\/reviews(?:\/|$)/,"reviews"],[/^\/verification(?:\/|$)/,"verification"],
 [/^\/disputes(?:\/|$)|^\/returns(?:\/|$)/,"disputes_returns"],[/^\/user\/(?:search|import)|^\/user\/rapidapi/,"importers"]
];
export async function featureGate(req:Request,res:Response,next:NextFunction){
 if(req.path.startsWith('/admin')||req.path==='/settings/public'||req.path.startsWith('/health')) return next();
 const hit=rules.find(([r])=>r.test(req.path)); if(!hit)return next();
 if(await featureEnabled(hit[1])) return next();
 res.status(503).json({error:"Feature temporarily unavailable",feature:hit[1],disabled:true});
}
