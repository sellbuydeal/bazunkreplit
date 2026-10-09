import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CircleDollarSign, LayoutDashboard, Users, Settings, CreditCard, ShoppingCart, LogOut, ShieldCheck, Package, Shield, RotateCcw, Gavel, Zap, LifeBuoy, Gift, Megaphone, List, ArrowDownToLine, FileText, Star, Activity, ScrollText, ServerCog, Flag, Mail, Menu, X } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

const NAV = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Users",        href: "/admin/users",        icon: Users           },
  { label: "Products",     href: "/admin/products",     icon: Package         },
  { label: "Listings",     href: "/admin/listings",     icon: List            },
  { label: "Imports",      href: "/admin/imports",      icon: ArrowDownToLine },
  { label: "Importer Control", href: "/admin/importer-control", icon: Activity },
  { label: "Classifieds",  href: "/admin/classifieds",  icon: FileText        },
  { label: "Orders",       href: "/admin/orders",       icon: ShoppingCart     },
  { label: "Payments",   href: "/admin/payments",   icon: CreditCard      },
  { label: "Auctions",   href: "/admin/auctions",   icon: Gavel           },
  { label: "Flash Sales",href: "/admin/flash-sales",icon: Zap             },
  { label: "Disputes",   href: "/admin/disputes",   icon: Shield          },
  { label: "Returns",    href: "/admin/returns",    icon: RotateCcw       },
  { label: "Support",    href: "/admin/support",    icon: LifeBuoy        },
  { label: "Rewards",    href: "/admin/rewards",    icon: Gift            },
  { label: "Credits Economy", href: "/admin/credits-economy", icon: CircleDollarSign },
  { label: "Referrals",  href: "/admin/referrals",  icon: Users           },
  { label: "Promotions", href: "/admin/promotions", icon: Megaphone       },
  { label: "Reviews",    href: "/admin/reviews",    icon: Star            },
  { label: "Audit Log",  href: "/admin/audit-log",  icon: ScrollText       },
  { label: "System Status", href: "/admin/system-status", icon: ServerCog },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
  { label: "Email Templates", href: "/admin/emails", icon: Mail },
  { label: "Settings",   href: "/admin/settings",   icon: Settings        },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, isAdmin } = useAdmin();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location]);

  useEffect(() => { if (!isAdmin) setLocation("/admin", { replace: true }); }, [isAdmin, setLocation]);
  if (!isAdmin) return <div className="p-6">Your admin session has ended. Returning to sign-in…</div>;

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <img src="/bazunk-logo.png" alt="Bazunk admin" className="h-8 w-auto object-contain" />
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen} className="rounded-lg p-2 text-gray-900 hover:bg-gray-100"><Menu className="h-6 w-6" /></button>
      </header>
      {menuOpen && <button type="button" aria-label="Close admin menu" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar — always visible */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#1A1D2E] shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-52 lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/10 flex flex-col gap-2 relative">
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" className="absolute right-3 top-4 rounded-lg p-2 text-white lg:hidden"><X className="h-5 w-5" /></button>
          <img src="/bazunk-logo.png" alt="Bazunk" className="h-7 w-auto object-contain self-start rounded bg-white px-2 py-0.5" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F26B21]" />
            <span className="font-semibold text-white/70 text-xs tracking-wide uppercase">Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <button
                key={href}
                onClick={() => { setMenuOpen(false); setLocation(href); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#F26B21] text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4 border-t border-white/10 pt-3">
          <button
            onClick={() => { logout(); setLocation("/admin"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <main className="w-full min-w-0 p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
