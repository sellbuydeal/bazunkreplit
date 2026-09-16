import { Tag, Zap, Shield, Gavel, Handshake } from "lucide-react";

const PERKS = [
  {
    icon: Tag,
    title: "Free to List",
    sub: "No upfront selling fees, ever",
    color: "text-[#F26B21]",
    bg: "bg-[#F26B21]/10",
  },
  {
    icon: Zap,
    title: "Flash Sales",
    sub: "Time-limited deals, updated daily",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: Shield,
    title: "Buyer Protected",
    sub: "Secure checkout, 30-day dispute window",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Gavel,
    title: "Live Auctions",
    sub: "Bid on real items in real time",
    color: "text-[#4A5CE8]",
    bg: "bg-[#4A5CE8]/10",
  },
  {
    icon: Handshake,
    title: "Make an Offer",
    sub: "Negotiate directly with sellers",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export function PerksStrip() {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center overflow-x-auto scrollbar-none divide-x divide-gray-100">
          {PERKS.map(({ icon: Icon, title, sub, color, bg }) => (
            <div key={title} className="flex items-center gap-3 px-6 py-4 shrink-0 flex-1 min-w-[180px]">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: "18px", height: "18px" }} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-xs leading-tight">{title}</p>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
