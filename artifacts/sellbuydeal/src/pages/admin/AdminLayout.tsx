import { useLocation } from "wouter";
import { LayoutDashboard, Users, Settings, CreditCard, LogOut, ShieldCheck, Package, Shield, RotateCcw, Gavel, Zap, LifeBuoy, Gift, Megaphone, List, ArrowDownToLine, FileText } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

const NAV = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Users",        href: "/admin/users",        icon: Users           },
  { label: "Products",     href: "/admin/products",     icon: Package         },
  { label: "Listings",     href: "/admin/listings",     icon: List            },
  { label: "Imports",      href: "/admin/imports",      icon: ArrowDownToLine },
  { label: "Classifieds",  href: "/admin/classifieds",  icon: FileText        },
  { label: "Payments",   href: "/admin/payments",   icon: CreditCard      },
  { label: "Auctions",   href: "/admin/auctions",   icon: Gavel           },
  { label: "Flash Sales",href: "/admin/flash-sales",icon: Zap             },
  { label: "Disputes",   href: "/admin/disputes",   icon: Shield          },
  { label: "Returns",    href: "/admin/returns",    icon: RotateCcw       },
  { label: "Support",    href: "/admin/support",    icon: LifeBuoy        },
  { label: "Rewards",    href: "/admin/rewards",    icon: Gift            },
  { label: "Promotions", href: "/admin/promotions", icon: Megaphone       },
  { label: "Settings",   href: "/admin/settings",   icon: Settings        },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAdmin();
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar — always visible */}
      <aside className="w-52 shrink-0 bg-[#1A1D2E] flex flex-col">
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/10 flex flex-col gap-2">
          <img src="/bazunk-logo.png" alt="Bazunk" className="h-7 w-auto object-contain self-start rounded bg-white px-2 py-0.5" />
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F26B21]" />
            <span className="font-semibold text-white/70 text-xs tracking-wide uppercase">Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <button
                key={href}
                onClick={() => setLocation(href)}
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
      <div className="flex-1 min-w-0 overflow-auto">
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
