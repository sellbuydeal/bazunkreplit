import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Smartphone, Shirt, Armchair, Dumbbell, BookOpen, CarFront,
  Gamepad2, Gem, ArrowRight,
} from "lucide-react";

const CATEGORIES = [
  { name: "Electronics",   icon: Smartphone, href: "/browse?category=electronics",   bg: "bg-blue-500",      ring: "ring-blue-200"   },
  { name: "Fashion",       icon: Shirt,       href: "/browse?category=fashion",       bg: "bg-pink-500",      ring: "ring-pink-200"   },
  { name: "Gaming",        icon: Gamepad2,    href: "/browse?category=gaming",        bg: "bg-violet-500",    ring: "ring-violet-200" },
  { name: "Home & Garden", icon: Armchair,    href: "/browse?category=home",          bg: "bg-teal-500",      ring: "ring-teal-200"   },
  { name: "Sports",        icon: Dumbbell,    href: "/browse?category=sports",        bg: "bg-emerald-500",   ring: "ring-emerald-200"},
  { name: "Books",         icon: BookOpen,    href: "/browse?category=books",         bg: "bg-amber-500",     ring: "ring-amber-200"  },
  { name: "Collectibles",  icon: Gem,         href: "/browse?category=collectibles",  bg: "bg-[#F26B21]",     ring: "ring-orange-200" },
  { name: "Automotive",    icon: CarFront,    href: "/browse?category=automotive",    bg: "bg-slate-600",     ring: "ring-slate-200"  },
];

/* ── Bento spotlight cards ────────────────────────────── */
const BENTO = [
  {
    title: "Time for an upgrade?",
    items: ["Electronics", "Gaming", "Cameras", "Tablets"],
    bg: "bg-[#4A5CE8]",
    accent: "bg-[#4A5CE8]/80",
    href: "/browse?category=electronics",
  },
  {
    title: "Fresh style, better prices",
    items: ["Trainers", "Denim", "Accessories", "Outerwear"],
    bg: "bg-[#F26B21]",
    accent: "bg-[#F26B21]/80",
    href: "/browse?category=fashion",
  },
  {
    title: "Home & Garden",
    items: ["Furniture", "Lighting", "Garden Tools", "Décor"],
    bg: "bg-teal-600",
    accent: "bg-teal-700",
    href: "/browse?category=home",
  },
];

export function CategorySection() {
  return (
    <section className="bg-gray-50 py-10 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Scrollable icon row ─────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 mb-10">
          {CATEGORIES.map(({ name, icon: Icon, href, bg, ring }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={href}>
                <div className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 w-20">
                  <div className={`w-14 h-14 rounded-2xl ${bg} ring-4 ring-transparent group-hover:${ring} flex items-center justify-center shadow-sm group-hover:scale-105 transition-all`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 text-center leading-tight transition-colors">{name}</p>
                </div>
              </Link>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45 }}
          >
            <Link href="/categories">
              <div className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 w-20">
                <div className="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-900 text-center leading-tight transition-colors">All Categories</p>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* ── Bento spotlight grid ────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BENTO.map(({ title, items, bg, href }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={href}>
                <div className={`${bg} rounded-2xl p-5 h-44 flex flex-col justify-between cursor-pointer group hover:opacity-95 transition-opacity overflow-hidden relative`}>
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full bg-white/8" />
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                  <div className="relative z-10">
                    <p className="text-white font-black text-lg leading-snug">{title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {items.map(item => (
                        <span key={item} className="text-white/80 text-[11px] font-medium bg-white/15 px-2 py-0.5 rounded-full">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-1.5 text-white/80 text-xs font-bold group-hover:text-white transition-colors">
                    Shop Now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
