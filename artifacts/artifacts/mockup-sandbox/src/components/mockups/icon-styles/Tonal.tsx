import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Bell, 
  ShoppingCart, 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  Coins, 
  Store, 
  User, 
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  Monitor,
  Smartphone,
  Watch,
  Headphones,
  Camera,
  Gamepad,
  Speaker,
  Mic,
  PlusCircle,
  FileText,
  Share2
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { name: "Overview", icon: LayoutDashboard, color: "blue" },
  { name: "Notifications", icon: Bell, color: "red", badge: 3 },
  { name: "Orders", icon: ShoppingCart, color: "green" },
  { name: "Sales", icon: TrendingUp, color: "purple" },
  { name: "Watchlist", icon: Heart, color: "rose" },
  { name: "Messages", icon: MessageSquare, color: "teal", badge: 12 },
  { name: "Credits", icon: Coins, color: "orange" },
  { name: "My Store", icon: Store, color: "indigo" },
  { name: "Profile", icon: User, color: "pink" },
  { name: "Settings", icon: Settings, color: "slate" },
];

const STATS = [
  { label: "Total Revenue", value: "$24,592.00", change: "+14.5%", icon: TrendingUp, color: "green" },
  { label: "Active Orders", value: "34", change: "+2.4%", icon: ShoppingCart, color: "blue" },
  { label: "Unread Messages", value: "12", change: "-1.2%", icon: MessageSquare, color: "teal" },
  { label: "Store Views", value: "8,234", change: "+24.8%", icon: Store, color: "purple" },
];

const CATEGORIES = [
  { name: "Laptops & Computers", icon: Monitor, color: "blue" },
  { name: "Smartphones", icon: Smartphone, color: "sky" },
  { name: "Smartwatches", icon: Watch, color: "indigo" },
  { name: "Headphones", icon: Headphones, color: "violet" },
  { name: "Cameras & Photo", icon: Camera, color: "fuchsia" },
  { name: "Gaming Consoles", icon: Gamepad, color: "pink" },
  { name: "Speakers & Audio", icon: Speaker, color: "rose" },
  { name: "Microphones", icon: Mic, color: "orange" },
];

const QUICK_ACTIONS = [
  { name: "Create Listing", icon: PlusCircle, color: "blue" },
  { name: "Generate Report", icon: FileText, color: "emerald" },
  { name: "Share Store", icon: Share2, color: "violet" },
];

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: "bg-blue-50 hover:bg-blue-100", text: "text-blue-700", iconBg: "bg-blue-100 text-blue-600" },
  red: { bg: "bg-red-50 hover:bg-red-100", text: "text-red-700", iconBg: "bg-red-100 text-red-600" },
  green: { bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700", iconBg: "bg-emerald-100 text-emerald-600" },
  emerald: { bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700", iconBg: "bg-emerald-100 text-emerald-600" },
  purple: { bg: "bg-purple-50 hover:bg-purple-100", text: "text-purple-700", iconBg: "bg-purple-100 text-purple-600" },
  rose: { bg: "bg-rose-50 hover:bg-rose-100", text: "text-rose-700", iconBg: "bg-rose-100 text-rose-600" },
  teal: { bg: "bg-teal-50 hover:bg-teal-100", text: "text-teal-700", iconBg: "bg-teal-100 text-teal-600" },
  orange: { bg: "bg-orange-50 hover:bg-orange-100", text: "text-orange-700", iconBg: "bg-orange-100 text-orange-600" },
  indigo: { bg: "bg-indigo-50 hover:bg-indigo-100", text: "text-indigo-700", iconBg: "bg-indigo-100 text-indigo-600" },
  pink: { bg: "bg-pink-50 hover:bg-pink-100", text: "text-pink-700", iconBg: "bg-pink-100 text-pink-600" },
  slate: { bg: "bg-slate-50 hover:bg-slate-100", text: "text-slate-700", iconBg: "bg-slate-100 text-slate-600" },
  sky: { bg: "bg-sky-50 hover:bg-sky-100", text: "text-sky-700", iconBg: "bg-sky-100 text-sky-600" },
  violet: { bg: "bg-violet-50 hover:bg-violet-100", text: "text-violet-700", iconBg: "bg-violet-100 text-violet-600" },
  fuchsia: { bg: "bg-fuchsia-50 hover:bg-fuchsia-100", text: "text-fuchsia-700", iconBg: "bg-fuchsia-100 text-fuchsia-600" },
};

export function Tonal() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#4A5CE8] flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1A1D2E]">Bazunk</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.name;
            const colors = COLOR_MAP[item.color];
            
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? "bg-[#4A5CE8] text-white shadow-md shadow-blue-500/20" 
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors duration-200 ${
                    isActive 
                      ? "bg-white/20 text-white" 
                      : `${colors.iconBg} group-hover:scale-105`
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${isActive ? "text-white" : ""}`}>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : `${colors.bg} ${colors.text}`
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">Jane Doe</p>
              <p className="text-xs text-slate-500 truncate">Pro Seller</p>
            </div>
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1D2E]">Overview</h1>
            <p className="text-sm text-slate-500">Welcome back to your dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 bg-[#F26B21] hover:bg-[#E05A10] text-white px-5 py-2.5 rounded-2xl font-medium transition-colors shadow-lg shadow-orange-500/20">
              <Plus className="w-5 h-5" />
              New Listing
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Quick Actions Row */}
            <section className="flex gap-4">
              {QUICK_ACTIONS.map((action) => {
                const colors = COLOR_MAP[action.color];
                return (
                  <button key={action.name} className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border border-transparent ${colors.bg} transition-all hover:-translate-y-0.5`}>
                    <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className={`font-semibold ${colors.text}`}>{action.name}</span>
                    <ArrowUpRight className={`w-4 h-4 ml-auto opacity-50 ${colors.text}`} />
                  </button>
                );
              })}
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-4 gap-6">
              {STATS.map((stat, i) => {
                const colors = COLOR_MAP[stat.color];
                return (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3.5 rounded-2xl ${colors.iconBg}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <span className={`text-sm font-semibold flex items-center gap-1 ${stat.change.startsWith('+') ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'} px-2.5 py-1 rounded-full`}>
                        {stat.change}
                      </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.label}</h3>
                    <p className="text-2xl font-bold text-[#1A1D2E]">{stat.value}</p>
                  </div>
                );
              })}
            </section>

            {/* Categories */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1A1D2E]">Browse Categories</h2>
                <button className="text-[#4A5CE8] font-medium hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {CATEGORIES.map((cat, i) => {
                  const colors = COLOR_MAP[cat.color];
                  return (
                    <div key={i} className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] cursor-pointer hover:border-blue-100 transition-all hover:shadow-[0_8px_24px_rgba(74,92,232,0.08)]">
                      <div className={`w-14 h-14 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                        <cat.icon className="w-7 h-7" />
                      </div>
                      <h3 className="font-semibold text-slate-800">{cat.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">1,240 items</p>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
