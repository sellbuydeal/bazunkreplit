import { Link } from "wouter";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { Power } from "lucide-react";
export function useFeature(key:string){const s=useRawSettings();return s[`feature_${key}`]!=="false";}
export function FeatureGate({feature,name,children}:{feature:string;name:string;children:React.ReactNode}){const on=useFeature(feature);if(on)return <>{children}</>;return <div className="min-h-[65vh] flex items-center justify-center p-6"><div className="max-w-md text-center bg-card border rounded-2xl p-8 shadow-sm"><Power className="w-10 h-10 mx-auto mb-3 text-muted-foreground"/><h1 className="text-2xl font-bold">{name} is temporarily unavailable</h1><p className="text-muted-foreground mt-2">This feature has been switched off by Bazunk. Nothing has been deleted and it can be enabled again at any time.</p><Link href="/" className="inline-block mt-5 px-4 py-2 rounded-xl bg-[#F26B21] text-white font-semibold">Back to Bazunk</Link></div></div>}
