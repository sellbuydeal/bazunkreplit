import { Link } from "wouter";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { Power } from "lucide-react";

export function isFeatureEnabled(settings: Record<string,string>, key:string){ return settings[`feature_${key}`] !== "false"; }
export function useFeature(key:string){ return isFeatureEnabled(useRawSettings(), key); }
export function FeatureVisible({feature,children}:{feature:string;children:React.ReactNode}){ return useFeature(feature) ? <>{children}</> : null; }
export function featureForHref(href:string):string|undefined {
  const path=href.split("?")[0];
  if(path.startsWith("/live")) return "live";
  if(path.startsWith("/auctions")) return "auctions";
  if(path.startsWith("/flash-sales")) return "flash_sales";
  if(path.startsWith("/classifieds")) return "classifieds";
  if(path.startsWith("/offers")) return "offers";
  if(path.startsWith("/messages")) return "messaging";
  if(path.startsWith("/importers")) return "importers";
  if(path.startsWith("/buyer-protection")) return "buyer_protection";
  if(path.startsWith("/referrals")) return "referrals";
  if(path.startsWith("/rewards")) return "games";
  if(path.startsWith("/promotions")) return "promotions";
  return undefined;
}
export function FeatureGate({feature,name,children}:{feature:string;name:string;children:React.ReactNode}){const on=useFeature(feature);if(on)return <>{children}</>;return <div className="min-h-[65vh] flex items-center justify-center p-6"><div className="max-w-md text-center bg-card border rounded-2xl p-8 shadow-sm"><Power className="w-10 h-10 mx-auto mb-3 text-muted-foreground"/><h1 className="text-2xl font-bold">{name} is temporarily unavailable</h1><p className="text-muted-foreground mt-2">This feature is currently unavailable.</p><Link href="/" className="inline-block mt-5 px-4 py-2 rounded-xl bg-[#F26B21] text-white font-semibold">Back to Bazunk</Link></div></div>}
