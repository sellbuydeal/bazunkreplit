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

const CATEGORY_PHOTOS: Record<string, string[]> = {
  appliances: ["/dyson.png", "/samsung-tv.png"],
  "arts-crafts-sewing": ["/camera.png", "/tshirt.png"],
  automotive: ["/camera.png"],
  "baby-products": ["/tshirt.png", "/sneakers.png"],
  "beauty-personal-care": ["/camera.png"],
  books: ["/macbook.png"],
  "cds-vinyl": ["/ps5.png"],
  "cell-phones": ["/macbook.png", "/camera.png"],
  "clothing-shoes-jewelry": ["/sneakers.png", "/jeans.png", "/tshirt.png"],
  electronics: ["/macbook.png", "/camera.png", "/ps5.png"],
  "eco-friendly": ["/dyson.png"],
  "health-household": ["/dyson.png"],
  "home-kitchen": ["/dyson.png", "/samsung-tv.png"],
  "industrial-scientific": ["/camera.png"],
  "movies-tv": ["/samsung-tv.png", "/ps5.png"],
};

function CategoryIcon({ name, className = "w-6 h-6 text-white" }: { name: string; className?: string }) {
  const Icon = (LucideIcons[name as LucideIconName] ?? LucideIcons.Tag) as React.ElementType;
  return <Icon className={className} />;
}

export function CategoriesPage() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<CategoryCount[]>([]);

  useEffect(() => {
    fetch("/api/listings/category-counts")
      .then((r) => r.json())
      .then((data: CategoryCount[]) => setCounts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filtered = search.trim()
    ? CATEGORIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.subcategories.some((sub) => sub.name.toLowerCase().includes(search.toLowerCase()))
      )
    : CATEGORIES;

  function catCount(slug: string) {
    return counts.filter((l) => l.category === slug).reduce((sum, l) => sum + Number(l.count || 0), 0);
  }

  function subCount(catSlug: string, subSlug: string) {
    return counts.find((l) => l.category === catSlug && l.subcategory === subSlug)?.count ?? 0;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 dark:bg-[#091426] dark:text-white flex flex-col transition-colors">
      <Navbar />

      <div className="border-b border-gray-200 bg-white dark:border-white/5 dark:bg-[radial-gradient(circle_at_top_left,_rgba(74,92,232,0.18),_transparent_38%)] transition-colors">
        <div className="container mx-auto px-4 py-8 lg:py-10">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-center">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#263d8f] to-[#142552] border border-blue-400/20 flex items-center justify-center shadow-lg shadow-blue-950/30">
                  <Grid3X3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Categories</h1>
                  <p className="text-gray-600 dark:text-slate-200 font-medium mt-1">Explore all categories and find exactly what you're looking for.</p>
                </div>
              </div>
            </div>

            <Link
              href="/sell"
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4263f4] via-[#6547ef] to-[#e743c4] p-5 lg:p-6 shadow-xl shadow-purple-950/20 group"
            >
              <div className="absolute -right-8 -bottom-10 w-40 h-40 rounded-full bg-cyan-300/20" />
              <div className="absolute right-20 -top-10 w-24 h-24 rounded-full bg-pink-300/20" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Tag className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xl lg:text-2xl font-black">Private Sellers Sell for FREE</p>
                  <p className="text-white/80 text-sm mt-1">No final value fees. Keep 100% of your sale price.</p>
                </div>
                <span className="hidden sm:inline-flex bg-white text-indigo-700 font-bold rounded-xl px-4 py-2.5 items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Start Selling <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>

          <div className="relative max-w-lg mt-7">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories or subcategories..."
              className="pl-11 h-11 rounded-xl border-gray-300 bg-white text-gray-950 placeholder:text-gray-500 dark:border-white/15 dark:bg-white/[0.08] dark:text-white dark:placeholder:text-slate-300 focus-visible:ring-[#4A5CE8]"
              data-testid="input-category-search"
            />
          </div>
        </div>
      </div>

      <AdSlot slotKey="categories_top" />

      <main className="flex-1 container mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600 dark:text-slate-300">
            <p className="text-lg font-medium">No categories match "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {filtered.map((category, index) => {
              const isOpen = openSlug === category.slug;
              const totalListings = catCount(category.slug);
              const theme = CATEGORY_THEMES[index % CATEGORY_THEMES.length];

              return (
                <motion.div
                  key={category.slug}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.3) }}
                  className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
                    isOpen
                      ? "border-gray-300 shadow-2xl shadow-black/10 bg-white dark:border-white/20 dark:shadow-black/30 dark:bg-[#0e1c32]"
                      : "border-gray-200 shadow-lg shadow-black/5 bg-white hover:-translate-y-0.5 hover:border-gray-300 dark:border-white/[0.08] dark:shadow-black/10 dark:bg-[#0e1a2e] dark:hover:border-white/15"
                  }`}
                  data-testid={`card-category-${category.slug}`}
                >
                  <button
                    className={`relative overflow-hidden w-full text-left bg-gradient-to-br ${theme} p-5 min-h-[128px]`}
                    onClick={() => setOpenSlug(isOpen ? null : category.slug)}
                    data-testid={`button-expand-${category.slug}`}
                  >
                    <div className="absolute -right-8 -bottom-12 w-36 h-36 rounded-full bg-white/10" />
                    <div className="absolute right-12 -top-12 w-24 h-24 rounded-full bg-white/[0.06]" />

                    <div className="absolute inset-y-0 right-3 w-[48%] pointer-events-none overflow-hidden">
                      {(CATEGORY_PHOTOS[category.slug] ?? ["/camera.png"]).slice(0, 3).map((src, photoIndex) => (
                        <img
                          key={`${category.slug}-${src}`}
                          src={src}
                          alt=""
                          aria-hidden="true"
                          className={`absolute bottom-[-6px] object-contain drop-shadow-2xl ${
                            photoIndex === 0 ? "right-0 h-[82%] w-[72%]" :
                            photoIndex === 1 ? "right-[38%] h-[58%] w-[52%]" :
                            "right-[8%] h-[45%] w-[42%]"
                          }`}
                        />
                      ))}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/5" />
                    </div>

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-black/10 border border-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm">
                        <CategoryIcon name={category.icon} />
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className="w-9 h-9 rounded-full bg-white/20 border border-white/15 flex items-center justify-center"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </div>

                    <div className="relative mt-4 max-w-[70%] drop-shadow-md">
                      <p className="font-black text-lg leading-tight text-white drop-shadow-sm">{category.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-bold text-white">
                        <span>{category.subcategories.length} subcategories</span>
                        {totalListings > 0 && (
                          <>
                            <span className="text-white/40">•</span>
                            <span className="font-semibold">{totalListings} listing{totalListings !== 1 ? "s" : ""}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="subcats"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pt-3 pb-4">
                          <ul className="space-y-1">
                            {category.subcategories.map((sub) => {
                              const sc = subCount(category.slug, sub.slug);
                              return (
                                <li key={sub.slug}>
                                  <Link
                                    href={`/browse?category=${category.slug}&sub=${sub.slug}`}
                                    className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-800 hover:text-[#4A5CE8] py-2 px-2.5 rounded-lg hover:bg-indigo-50 dark:text-white dark:hover:text-white dark:hover:bg-white/[0.09] transition-colors group"
                                    data-testid={`link-subcategory-${sub.slug}`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <CategoryIcon name={category.icon} className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#4A5CE8] dark:text-slate-300 dark:group-hover:text-indigo-200" />
                                      <span className="truncate">{sub.name}</span>
                                    </div>
                                    {sc > 0 && <span className="text-[11px] font-bold text-gray-500 dark:text-slate-300 flex-shrink-0">{sc}</span>}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>

                          <Link
                            href={`/browse?category=${category.slug}`}
                            className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 hover:bg-indigo-50 text-xs font-extrabold text-gray-900 dark:border-white/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-white py-2.5 transition-colors"
                          >
                            View all {category.name} <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
