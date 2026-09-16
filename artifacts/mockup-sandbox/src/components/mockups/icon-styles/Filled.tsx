import React from "react";
import {
  LayoutDashboard,
  Bell,
  ShoppingCart,
  TrendingUp,
  Bookmark,
  MessageSquare,
  Coins,
  Store,
  User,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  Monitor,
  Shirt,
  Car,
  Home,
  Dumbbell,
  Gamepad2,
  BookOpen,
  Flower2,
  QrCode,
  CreditCard,
  Gift
} from "lucide-react";

export function Filled() {
  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-[#1A1D2E] tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-[#F26B21] flex items-center justify-center">
              <span className="text-white text-lg leading-none font-black">S</span>
            </div>
            Bazunk
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-2">Main</div>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-100 text-gray-900 font-medium transition-colors">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1A1D2E] text-white shadow-sm">
              <LayoutDashboard size={16} strokeWidth={2.5} />
            </div>
            Overview
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4A5CE8] text-white shadow-sm group-hover:shadow transition-shadow">
              <Bell size={16} strokeWidth={2.5} />
            </div>
            Notifications
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
          </a>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">Buying</div>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4A5CE8] text-white shadow-sm group-hover:shadow transition-shadow">
              <ShoppingCart size={16} strokeWidth={2.5} />
            </div>
            Orders
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 text-white shadow-sm group-hover:shadow transition-shadow">
              <Bookmark size={16} strokeWidth={2.5} />
            </div>
            Watchlist
          </a>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">Selling</div>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F26B21] text-white shadow-sm group-hover:shadow transition-shadow">
              <Store size={16} strokeWidth={2.5} />
            </div>
            My Store
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F26B21] text-white shadow-sm group-hover:shadow transition-shadow">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
            Sales
          </a>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-2">Account</div>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500 text-white shadow-sm group-hover:shadow transition-shadow">
              <MessageSquare size={16} strokeWidth={2.5} />
            </div>
            Messages
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white shadow-sm group-hover:shadow transition-shadow">
              <Coins size={16} strokeWidth={2.5} />
            </div>
            Credits
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 text-white shadow-sm group-hover:shadow transition-shadow">
              <User size={16} strokeWidth={2.5} />
            </div>
            Profile
          </a>
          <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-500 text-white shadow-sm group-hover:shadow transition-shadow">
              <Settings size={16} strokeWidth={2.5} />
            </div>
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search items, categories, or sellers..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4A5CE8] focus:border-[#4A5CE8] sm:text-sm transition-colors"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-[#F26B21] hover:bg-[#d95c1a] text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-[#F26B21]/20">
              <div className="bg-white/20 rounded-md p-0.5">
                <Plus size={16} strokeWidth={3} />
              </div>
              Sell an Item
            </button>
            <div className="w-10 h-10 rounded-xl bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Greeting */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back, Alex 👋</h1>
              <p className="text-gray-500 mt-1">Here's what's happening with your store and watchlist today.</p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
              <button className="flex-1 bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer text-left">
                <div className="w-12 h-12 rounded-xl bg-[#4A5CE8] text-white flex items-center justify-center shadow-sm shadow-[#4A5CE8]/30 group-hover:scale-105 transition-transform">
                  <QrCode size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Scan Code</h3>
                  <p className="text-sm text-gray-500">Quickly list items</p>
                </div>
              </button>
              
              <button className="flex-1 bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer text-left">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <CreditCard size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Top up Credits</h3>
                  <p className="text-sm text-gray-500">Current balance: $45</p>
                </div>
              </button>
              
              <button className="flex-1 bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer text-left">
                <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/30 group-hover:scale-105 transition-transform">
                  <Gift size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Invite Friends</h3>
                  <p className="text-sm text-gray-500">Earn $10 credit</p>
                </div>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Total Revenue", value: "$4,290.00", trend: "+12.5%", icon: TrendingUp, color: "bg-[#1A1D2E]" },
                { label: "Active Listings", value: "24", trend: "+3", icon: Store, color: "bg-[#F26B21]" },
                { label: "Pending Orders", value: "5", trend: "-2", icon: ShoppingCart, color: "bg-blue-500" },
                { label: "New Messages", value: "12", trend: "Unread", icon: MessageSquare, color: "bg-purple-500" }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className={`w-14 h-14 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-md mb-6`}>
                    <stat.icon size={28} strokeWidth={2} />
                  </div>
                  <h3 className="text-gray-500 font-medium mb-1">{stat.label}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-2">
                    {stat.trend.startsWith('+') && <ArrowUpRight size={16} />}
                    {stat.trend}
                  </div>
                </div>
              ))}
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Browse Categories</h2>
                <a href="#" className="text-sm font-medium text-[#4A5CE8] hover:underline">View all</a>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { name: "Electronics", icon: Monitor, color: "bg-blue-500" },
                  { name: "Fashion", icon: Shirt, color: "bg-pink-500" },
                  { name: "Vehicles", icon: Car, color: "bg-[#F26B21]" },
                  { name: "Home & Garden", icon: Home, color: "bg-teal-500" },
                  { name: "Sports", icon: Dumbbell, color: "bg-emerald-500" },
                  { name: "Gaming", icon: Gamepad2, color: "bg-purple-500" },
                  { name: "Books", icon: BookOpen, color: "bg-amber-500" },
                  { name: "Outdoor", icon: Flower2, color: "bg-lime-500" }
                ].map((cat, i) => (
                  <a key={i} href="#" className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group text-center aspect-square">
                    <div className={`w-16 h-16 rounded-2xl ${cat.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <cat.icon size={32} strokeWidth={2} />
                    </div>
                    <span className="font-medium text-gray-700 group-hover:text-gray-900">{cat.name}</span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
