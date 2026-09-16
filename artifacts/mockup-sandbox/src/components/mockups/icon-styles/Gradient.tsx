import React from 'react';
import {
  Home,
  Bell,
  ShoppingBag,
  TrendingUp,
  Heart,
  MessageSquare,
  Coins,
  Store,
  User,
  Settings,
  Plus,
  Package,
  Zap,
  Smartphone,
  Shirt,
  Car,
  Home as HomeIcon,
  Activity,
  Gamepad2,
  Book,
  TreePine,
  Search,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';

export function Gradient() {
  const sidebarItems = [
    { name: 'Overview', icon: Home, gradient: 'from-[#F26B21] to-[#e03e3e]', active: true },
    { name: 'Notifications', icon: Bell, gradient: 'from-blue-400 to-indigo-500' },
    { name: 'Orders', icon: ShoppingBag, gradient: 'from-emerald-400 to-teal-500' },
    { name: 'Sales', icon: TrendingUp, gradient: 'from-amber-400 to-orange-500' },
    { name: 'Watchlist', icon: Heart, gradient: 'from-pink-400 to-rose-500' },
    { name: 'Messages', icon: MessageSquare, gradient: 'from-cyan-400 to-blue-500' },
    { name: 'Credits', icon: Coins, gradient: 'from-yellow-400 to-amber-500' },
    { name: 'My Store', icon: Store, gradient: 'from-violet-400 to-purple-500' },
    { name: 'Profile', icon: User, gradient: 'from-fuchsia-400 to-pink-500' },
    { name: 'Settings', icon: Settings, gradient: 'from-slate-400 to-gray-500' },
  ];

  const stats = [
    { label: 'Active Listings', value: '142', icon: Store, gradient: 'from-[#F26B21] to-[#e03e3e]' },
    { label: 'Orders (30d)', value: '89', icon: ShoppingBag, gradient: 'from-[#4A5CE8] to-[#2c3baa]' },
    { label: 'Credits Balance', value: '4,500', icon: Coins, gradient: 'from-yellow-400 to-amber-500' },
    { label: 'Watchers', value: '1,204', icon: Heart, gradient: 'from-pink-400 to-rose-500' },
  ];

  const categories = [
    { name: 'Electronics', icon: Smartphone, gradient: 'from-cyan-400 to-blue-500' },
    { name: 'Fashion', icon: Shirt, gradient: 'from-fuchsia-400 to-pink-500' },
    { name: 'Cars', icon: Car, gradient: 'from-slate-600 to-gray-800' },
    { name: 'Home', icon: HomeIcon, gradient: 'from-emerald-400 to-teal-500' },
    { name: 'Sports', icon: Activity, gradient: 'from-[#F26B21] to-orange-500' },
    { name: 'Gaming', icon: Gamepad2, gradient: 'from-violet-400 to-purple-500' },
    { name: 'Books', icon: Book, gradient: 'from-amber-400 to-orange-500' },
    { name: 'Garden', icon: TreePine, gradient: 'from-green-400 to-emerald-600' },
  ];

  const quickActions = [
    { name: 'Sell an Item', icon: Plus, gradient: 'from-[#F26B21] to-[#e03e3e]' },
    { name: 'View Orders', icon: Package, gradient: 'from-[#4A5CE8] to-[#2c3baa]' },
    { name: 'Boost Listings', icon: Zap, gradient: 'from-yellow-400 to-amber-500' },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-50 text-[#1A1D2E] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F26B21] to-[#4A5CE8] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Bazunk</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <a
                  href="#"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    item.active
                      ? 'bg-blue-50 text-[#4A5CE8] font-medium'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                      item.active ? 'from-[#4A5CE8] to-[#2c3baa] text-white shadow-sm' : `${item.gradient} text-white`
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span>{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 p-0.5">
              <img src="https://ui-avatars.com/api/?name=Alex+Smith&background=fff&color=1A1D2E" alt="Avatar" className="w-full h-full rounded-full border-2 border-white object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Alex Smith</p>
              <p className="text-xs text-gray-500 truncate">Premium Seller</p>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-96 focus-within:ring-2 focus-within:ring-[#4A5CE8] focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings, orders..."
              className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F26B21] rounded-full border border-white"></span>
            </button>
            <button className="flex items-center gap-2 bg-[#4A5CE8] hover:bg-[#3d4cdb] text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Sell Item
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Greeting */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1A1D2E]">Welcome back, Alex</h1>
            <p className="text-gray-500 mt-1">Here's what's happening with your store today.</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white mb-4 shadow-sm`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                <p className="text-2xl font-bold text-[#1A1D2E] mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-[#1A1D2E] mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.name}
                  className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-200 hover:border-[#4A5CE8] hover:shadow-md transition-all group"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-[#1A1D2E]">{action.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Browse Categories */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1A1D2E]">Browse Categories</h2>
              <button className="text-sm font-medium text-[#4A5CE8] flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {categories.map((category) => (
                <button
                  key={category.name}
                  className="bg-white flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
