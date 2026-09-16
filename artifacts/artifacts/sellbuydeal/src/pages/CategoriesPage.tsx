import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Grid3X3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { CATEGORIES } from "@/data/categories";
import * as LucideIcons from "lucide-react";

type LucideIconName = keyof typeof LucideIcons;

interface ApiListing {
  category: string;
  subcategory: string | null;
}

function CategoryIcon({ name }: { name: string }) {
  const Icon = (LucideIcons[name as LucideIconName] ?? LucideIcons.Tag) as React.ElementType;
  return <Icon className="w-5 h-5 text-white" />;
}

export function CategoriesPage() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState<ApiListing[]>([]);

  useEffect(() => {
    fetch("/api/listings?limit=500")
      .then((r) => r.json())
      .then((data: ApiListing[]) => setListings(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filtered = search.trim()
    ? CATEGORIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.subcategories.some((s) =>
            s.name.toLowerCase().includes(search.toLowerCase())
          )
      )
    : CATEGORIES;

  function catCount(slug: string) {
    return listings.filter((l) => l.category === slug).length;
  }
  function subCount(catSlug: string, subSlug: string) {
    return listings.filter((l) => l.category === catSlug && l.subcategory === subSlug).length;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Page header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">All Categories</h1>
          </div>
          <p className="text-gray-500 mb-6 ml-[52px]">
            Browse all {CATEGORIES.length} categories and their subcategories
          </p>

          {/* Search inside page */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter categories..."
              className="pl-9 rounded-full border-gray-200 bg-gray-50 focus-visible:ring-[#4A5CE8]"
              data-testid="input-category-search"
            />
          </div>
        </div>
      </div>

      <AdSlot slotKey="categories_top" />

      {/* Categories grid */}
      <main className="flex-1 container mx-auto px-4 py-10">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No categories match "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((category, index) => {
              const isOpen = openSlug === category.slug;
              const totalListings = catCount(category.slug);
              return (
                <motion.div
                  key={category.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  data-testid={`card-category-${category.slug}`}
                >
                  {/* Category header row */}
                  <button
                    className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
                    onClick={() =>
                      setOpenSlug(isOpen ? null : category.slug)
                    }
                    data-testid={`button-expand-${category.slug}`}
                  >
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CategoryIcon name={category.icon} />
                    </div>

                    {/* Name + counts */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        {category.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {category.subcategories.length} subcategories
                        </p>
                        {totalListings > 0 && (
                          <>
                            <span className="text-gray-200">·</span>
                            <Link
                              href={`/browse?category=${category.slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-[#4A5CE8] font-medium hover:underline"
                            >
                              {totalListings} listing{totalListings !== 1 ? "s" : ""}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </motion.div>
                  </button>

                  {/* Subcategories dropdown */}
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
                        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/60">
                          <ul className="space-y-1">
                            {category.subcategories.map((sub) => {
                              const sc = subCount(category.slug, sub.slug);
                              return (
                                <li key={sub.slug}>
                                  <Link
                                    href={`/browse?category=${category.slug}&sub=${sub.slug}`}
                                    className="flex items-center justify-between gap-2 text-sm text-gray-600 hover:text-[#4A5CE8] py-1.5 px-2 rounded-lg hover:bg-white transition-colors group"
                                    data-testid={`link-subcategory-${sub.slug}`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#4A5CE8]/40 group-hover:bg-[#4A5CE8] transition-colors flex-shrink-0" />
                                      <span className="truncate">{sub.name}</span>
                                    </div>
                                    {sc > 0 && (
                                      <span className="text-[10px] text-gray-400 bg-white border border-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {sc}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
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
