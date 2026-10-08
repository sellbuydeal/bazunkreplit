import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Search, Grid3X3, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { CATEGORIES } from "@/data/categories";
import * as LucideIcons from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");

type LucideIconName = keyof typeof LucideIcons;

interface CategoryCount {
  category: string;
  subcategory: string | null;
  count: number;
}

const CATEGORY_THEMES = [
  "from-blue-600 via-blue-500 to-indigo-500",
  "from-orange-500 via-amber-500 to-orange-400",
  "from-fuchsia-600 via-pink-500 to-purple-500",
  "from-emerald-600 via-green-500 to-teal-400",
  "from-rose-500 via-pink-500 to-rose-400",
  "from-violet-600 via-purple-500 to-fuchsia-500",
  "from-lime-600 via-green-500 to-emerald-500",
  "from-amber-500 via-yellow-500 to-orange-400",
  "from-red-600 via-rose-500 to-orange-500",
  "from-cyan-600 via-sky-500 to-blue-500",
  "from-indigo-600 via-blue-600 to-violet-500",
  "from-purple-600 via-violet-500 to-fuchsia-500",
  "from-sky-600 via-cyan-500 to-teal-500",
  "from-slate-600 via-blue-600 to-indigo-500",
  "from-green-700 via-emerald-600 to-lime-500",
];

const CATEGORY_ART: Record<string, string> = {
  "adult": "/category-art/adult.png",
  "digital": "/category-art/digital.png",
  "musical-instruments": "/category-art/musical-instruments.png",
  "office-products": "/category-art/office-products.png",
  "patio-lawn-garden": "/category-art/patio-lawn-garden.png",
  "pet-supplies": "/category-art/pet-supplies.png",
  "tools-home-improvement": "/category-art/tools-home-improvement.png",
  "video-games": "/category-art/video-games.png",

  electronics: "/category-art/electronics.webp",
  "home-kitchen": "/category-art/home-kitchen.webp",
  "clothing-shoes-jewelry": "/category-art/clothing-shoes-jewelry.webp",
  "health-household": "/category-art/health-household.webp",
  "toys-games": "/category-art/toys-games.webp",
  automotive: "/category-art/automotive.webp",
  "baby-products": "/category-art/baby-products.webp",
  "sports-outdoors": "/category-art/sports-outdoors.webp",
  books: "/category-art/books.webp",
  "cds-vinyl": "/category-art/cds-vinyl.webp",
  "arts-crafts-sewing": "/category-art/arts-crafts-sewing.webp",
  "industrial-scientific": "/category-art/industrial-scientific.webp",
  appliances: "/category-art/home-kitchen.webp",
  "beauty-personal-care": "/category-art/health-household.webp",
  "cell-phones": "/category-art/electronics.webp",
  "eco-friendly": "/category-art/health-household.webp",
  "movies-tv": "/category-art/electronics.webp",
};

const CATEGORY_ORDER = [
  "electronics", "home-kitchen", "clothing-shoes-jewelry",
  "health-household", "toys-games", "automotive",
  "baby-products", "sports-outdoors", "books",
  "cds-vinyl", "arts-crafts-sewing", "industrial-scientific",
];

function CategoryIcon({ name, className = "w-6 h-6 text-white" }: { name: string; className?: string }) {
  const Icon = (LucideIcons[name as LucideIconName] ?? LucideIcons.Tag) as React.ElementType;
  return <Icon className={className} />;
}

export function CategoriesPage() {
  const { formatPrice, currency } = useCurrency();
  const [openSlug, setOpenSlug] = useState<string | null>("electronics");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<CategoryCount[]>([]);

  useEffect(() => {
    fetch("${API_BASE}/api/listings/category-counts")
      .then((r) => r.json())
      .then((data: CategoryCount[]) => setCounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const digital = CATEGORIES.find((c) => c.slug === "digital")!;
  const legacyDigital = CATEGORIES.find((c) => c.slug === "digital-products")!;
  const digitalSubs = [...digital.subcategories];
  for (const sub of legacyDigital.subcategories) {
    if (!digitalSubs.some((existing) => existing.name === sub.name)) digitalSubs.push(sub);
  }
  const displayCategories = CATEGORIES.filter((c) => c.slug !== "digital-products").map((c) => c.slug === "digital" ? { ...c, name: "Digital Products", subcategories: digitalSubs } : c);
  const ordered = [...displayCategories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.slug);
    const bi = CATEGORY_ORDER.indexOf(b.slug);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const filtered = search.trim()
    ? ordered.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.subcategories.some((sub) => sub.name.toLowerCase().includes(search.toLowerCase()))
      )
    : ordered;

  const selected = displayCategories.find((c) => c.slug === openSlug) ?? null;

  function catCount(slug: string) {
    return counts.filter((l) => (l.category === slug || (slug === "digital" && l.category === "digital-products"))).reduce((sum, l) => sum + Number(l.count || 0), 0);
  }

  function subCount(catSlug: string, subSlug: string) {
    return counts.filter((l) => (l.category === catSlug || (catSlug === "digital" && l.category === "digital-products")) && (l.subcategory === subSlug || (catSlug === "digital" && subSlug === "software-apps" && l.subcategory === "software"))).reduce((sum, l) => sum + Number(l.count || 0), 0);
  }

  function themeFor(slug: string) {
    const i = ordered.findIndex((c) => c.slug === slug);
    return CATEGORY_THEMES[(i < 0 ? 0 : i) % CATEGORY_THEMES.length];
  }

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-slate-950 dark:bg-[#071426] dark:text-white flex flex-col transition-colors">
      <Navbar />

      <div className="border-b border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#071426]">
        <div className="container mx-auto px-4 py-5 lg:py-7">
          <div className="grid lg:grid-cols-[0.78fr_1.22fr] gap-5 items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6548ff] to-[#4936d9] flex items-center justify-center shadow-lg shadow-indigo-900/20">
                <Grid3X3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-950 dark:text-white">Categories</h1>
                <p className="text-slate-600 dark:text-slate-300 font-medium mt-1">
                  Explore all categories and find exactly what you're looking for.
                </p>
              </div>
            </div>

            <Link
              href="/sell"
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5b56f5] via-[#7845f4] to-[#ed42c7] px-5 py-4 shadow-xl shadow-purple-950/15 group"
            >
              <div className="absolute right-0 inset-y-0 w-[38%] bg-[radial-gradient(circle_at_center,_rgba(255,210,60,.45),_transparent_58%)]" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Tag className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xl lg:text-2xl font-black text-white">Private Sellers Sell for <span className="text-3xl">{formatPrice(0)}</span></p>
                  <p className="text-white text-sm font-semibold mt-0.5">No listing fees. No final value fees. Keep 100% of your sale price.</p>
                </div>
                <span className="hidden sm:inline-flex bg-white text-indigo-700 font-black rounded-xl px-5 py-3 items-center gap-1 shadow-lg group-hover:translate-x-1 transition-transform">
                  Start Selling <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>

          <div className="relative max-w-md mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="pl-11 h-10 rounded-xl border-slate-200 bg-slate-50 text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            />
          </div>
        </div>
      </div>

      <AdSlot slotKey="categories_top" />

      <main className="flex-1 container mx-auto px-4 py-7">
        <div className={`grid gap-5 items-start ${selected ? "xl:grid-cols-[minmax(0,3fr)_minmax(330px,1.2fr)]" : ""}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((category, index) => {
              const isOpen = openSlug === category.slug;
              const totalListings = catCount(category.slug);
              const art = CATEGORY_ART[category.slug];
              return (
                <motion.button
                  type="button"
                  key={category.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.22) }}
                  onClick={() => setOpenSlug(isOpen ? null : category.slug)}
                  className={`relative overflow-hidden min-h-[145px] rounded-2xl text-left bg-gradient-to-br ${themeFor(category.slug)}
                    border ${isOpen ? "border-white/60 ring-2 ring-white/20" : "border-white/10"}
                    shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:shadow-xl transition-all`}
                  data-testid={`card-category-${category.slug}`}
                >
                  <div className="absolute inset-x-0 bottom-0 h-[72%] overflow-hidden pointer-events-none">
                    {art && (
                      <img
                        src={art}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover object-bottom"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
                  </div>

                  <div className="relative z-10 p-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-black/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                      <CategoryIcon name={category.icon} />
                    </div>
                    <div className="relative isolate min-w-0 flex-1 pt-0.5 drop-shadow-md">
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-x-4 -inset-y-3 -z-10"
                        style={{ background: "radial-gradient(ellipse at 40% 50%, rgba(10, 15, 25, 0.40) 0%, rgba(10, 15, 25, 0.30) 45%, rgba(10, 15, 25, 0) 75%)" }}
                      />
                      <p className="text-[16px] leading-tight font-black text-white">{category.name}</p>
                      <p className="mt-1 text-[12px] font-extrabold text-white">
                        {category.subcategories.length} subcategories
                        {totalListings > 0 && <> <span className="text-white/70">•</span> {totalListings.toLocaleString()} listing{totalListings !== 1 ? "s" : ""}</>}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/35 border border-white/20 flex items-center justify-center flex-shrink-0">
                      <ChevronRight className={`w-5 h-5 text-slate-900 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {selected && (
              <motion.aside
                key={selected.slug}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="xl:sticky xl:top-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0a1a2e]"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-300">
                    <span>Categories</span><ChevronRight className="w-3 h-3"/><span className="font-black text-slate-900 dark:text-white">{selected.name}</span>
                  </div>
                  <button onClick={() => setOpenSlug(null)} className="text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xl leading-none">×</button>
                </div>

                <div className={`relative overflow-hidden bg-gradient-to-br ${themeFor(selected.slug)} px-5 py-5 min-h-[115px]`}>
                  {CATEGORY_ART[selected.slug] && (
                    <img src={CATEGORY_ART[selected.slug]} alt="" aria-hidden="true" className="absolute right-0 bottom-0 h-full w-[58%] object-cover object-bottom opacity-95" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/5" />
                  <div className="relative z-10 flex items-center gap-3 max-w-[65%]">
                    <div className="w-12 h-12 rounded-xl bg-black/10 border border-white/20 flex items-center justify-center">
                      <CategoryIcon name={selected.icon} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white drop-shadow">{selected.name}</h2>
                      <p className="text-xs font-extrabold text-white mt-1">
                        {selected.subcategories.length} subcategories
                        {catCount(selected.slug) > 0 && <> • {catCount(selected.slug).toLocaleString()} listings</>}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  {selected.subcategories.map((sub) => {
                    const sc = subCount(selected.slug, sub.slug);
                    return (
                      <Link
                        key={sub.slug}
                        href={`/browse?category=${selected.slug}&sub=${sub.slug}`}
                        className="group flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-indigo-50 dark:border-white/[0.07] dark:hover:bg-white/[0.06]"
                      >
                        <div className={`relative w-14 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br ${themeFor(selected.slug)}`}>
                          {CATEGORY_ART[selected.slug] && <img src={CATEGORY_ART[selected.slug]} alt="" className="w-full h-full object-cover object-bottom" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-slate-950 dark:text-white truncate">{sub.name}</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{sc.toLocaleString()} listing{sc !== 1 ? "s" : ""}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                      </Link>
                    );
                  })}
                </div>

                <div className="p-4">
                  <Link
                    href={`/browse?category=${selected.slug}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 py-3 text-sm font-black text-slate-950 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] dark:text-white"
                  >
                    View all {selected.name} <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
