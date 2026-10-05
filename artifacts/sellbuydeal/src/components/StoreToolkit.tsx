import { useState, type ElementType } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, Tag, Gavel, Zap, Radio, Package, BarChart2, Banknote, Megaphone, Coins, Gift, ShieldCheck, MessageSquare, RotateCcw, LifeBuoy, ArrowDownToLine } from "lucide-react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { isFeatureEnabled } from "@/components/FeatureGate";

type Tool = { label: string; description: string; group: string; icon: ElementType; color: string; href?: string; section?: string; feature?: string };
const tools: Tool[] = [
  { label: "Direct Sale", description: "Create a fixed-price listing", group: "Sell", icon: Tag, color: "#f97316", href: "/sell/direct", feature: "quick_sell" },
  { label: "Start an auction", description: "Let buyers bid on your items", group: "Sell", icon: Gavel, color: "#8b5cf6", href: "/auctions/create", feature: "auctions" },
  { label: "Create a flash sale", description: "Set up a limited-time deal", group: "Sell", icon: Zap, color: "#ec4899", href: "/flash-sales/create", feature: "flash_sales" },
  { label: "Go live", description: "Open your live selling tools", group: "Sell", icon: Radio, color: "#ef4444", section: "go-live", feature: "live" },
  { label: "Product importers", description: "Bring products into your listings", group: "Sell", icon: ArrowDownToLine, color: "#06b6d4", href: "/importers", feature: "importers" },
  { label: "Manage listings", description: "Edit, pause or remove your items", group: "Manage", icon: Package, color: "#3b82f6", section: "my-listings" },
  { label: "Sales & orders", description: "Review sales and order progress", group: "Manage", icon: BarChart2, color: "#10b981", section: "sales" },
  { label: "Seller payouts", description: "Manage your payout account", group: "Manage", icon: Banknote, color: "#14b8a6", section: "seller-payouts" },
  { label: "Promote listings", description: "Explore boosts and promotions", group: "Grow", icon: Megaphone, color: "#a855f7", section: "promotions", feature: "promotions" },
  { label: "Your credits", description: "Check your promotion credit balance", group: "Grow", icon: Coins, color: "#f59e0b", section: "credits" },
  { label: "Rewards Arcade", description: "Play games and earn free credits", group: "Grow", icon: Gift, color: "#ec4899", href: "/rewards", feature: "games" },
  { label: "Get verified", description: "Complete seller verification", group: "Support", icon: ShieldCheck, color: "#6366f1", section: "verification" },
  { label: "Buyer messages", description: "Reply to questions and enquiries", group: "Support", icon: MessageSquare, color: "#0ea5e9", href: "/messages", feature: "messaging" },
  { label: "Returns", description: "Review return requests", group: "Support", icon: RotateCcw, color: "#f59e0b", section: "returns" },
  { label: "Disputes", description: "Resolve issues with buyers", group: "Support", icon: ShieldCheck, color: "#f43f5e", section: "disputes" },
  { label: "Support centre", description: "Get help from the support team", group: "Support", icon: LifeBuoy, color: "#8b5cf6", section: "support-tickets" },
];

export function StoreToolkit({ onNavigate }: { onNavigate: (section: string) => void }) {
  const flags = useRawSettings();
  const [group, setGroup] = useState("All tools");
  const [query, setQuery] = useState("");
  const visible = tools.filter(tool => (!tool.feature || isFeatureEnabled(flags, tool.feature)) && (group === "All tools" || tool.group === group) && `${tool.label} ${tool.description}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
      <div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Your next move</p><h3 className="text-xl font-black text-foreground mt-1">Everything your store needs</h3><p className="text-sm text-muted-foreground mt-1">Sell, manage orders and grow from one place.</p></div>
      <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"><Search className="w-4 h-4 text-muted-foreground"/><input aria-label="Search store tools" placeholder="Find a tool…" value={query} onChange={e => setQuery(e.target.value)} className="bg-transparent text-sm outline-none w-full sm:w-40 text-foreground"/></label>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-3" role="group" aria-label="Filter store tools">{["All tools", "Sell", "Manage", "Grow", "Support"].map(tab => <button key={tab} aria-pressed={group === tab} onClick={() => setGroup(tab)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${group === tab ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{tab}</button>)}</div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-2">{visible.map(tool => {
      const Icon = tool.icon;
      const content = <><div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${tool.color}20`, color: tool.color }}><Icon className="w-5 h-5"/></div><div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-foreground">{tool.label}</p><ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform"/></div><p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{tool.description}</p></>;
      const className = "group block text-left p-4 rounded-xl border border-border bg-background hover:shadow-md hover:border-violet-400 transition-all focus-visible:outline-2 focus-visible:outline-violet-500";
      return tool.href ? <Link key={tool.label} href={tool.href} className={className}>{content}</Link> : <button key={tool.label} onClick={() => onNavigate(tool.section!)} className={className}>{content}</button>;
    })}</div>
    {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">No tools found. Try another search or category.</p>}
  </section>;
}
