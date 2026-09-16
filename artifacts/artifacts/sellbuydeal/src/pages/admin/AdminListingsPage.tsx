import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, RefreshCw, ExternalLink, ShoppingCart, Loader2, Package } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface Listing {
  id: number;
  public_id: string | null;
  title: string;
  price: string;
  currency: string;
  category: string;
  subcategory: string | null;
  condition: string;
  status: string;
  seller_email: string;
  seller_username: string | null;
  specifications: string | null;
  created_at: string;
}

interface Specs {
  amazon_url?: string;
  asin?: string;
  source?: string;
}

function parseSpecs(raw: string | null): Specs {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  pending:  "bg-amber-100 text-amber-700",
  sold:     "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-600",
};

export function AdminListingsPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "imported" | "user">("all");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { setOffset(0); }, [search, filter]);
  useEffect(() => { load(); }, [search, filter, offset]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (search) params.set("search", search);
      if (filter === "imported") params.set("imported", "1");
      if (filter === "user") params.set("imported", "0");
      const res = await authFetch(`/api/admin/listings?${params}`);
      if (res.ok) {
        const d = await res.json();
        setListings(d.listings ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  const pages = Math.ceil(total / LIMIT);
  const page = Math.floor(offset / LIMIT);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Listings</h1>
          <p className="text-sm text-gray-400 mt-0.5">All marketplace listings · {total.toLocaleString()} total</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, ID, email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["all", "imported", "user"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {f === "imported" ? "Demo / Imported" : f === "user" ? "User Listed" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["ID", "Title", "Category", "Price", "Seller", "Status", "Amazon URL"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" />
                </td></tr>
              )}
              {!loading && listings.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No listings found</p>
                </td></tr>
              )}
              {!loading && listings.map(l => {
                const isImported = l.public_id?.startsWith("BZK-DEMO-") ?? false;
                const specs = parseSpecs(l.specifications);
                return (
                  <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    {/* ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-gray-500">{l.public_id ?? `#${l.id}`}</span>
                        {isImported && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold w-fit">
                            <ShoppingCart className="w-2.5 h-2.5" />
                            Imported
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 max-w-56">
                      <p className="font-medium text-gray-800 truncate text-xs leading-snug">{l.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{l.condition}</p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      <span className="capitalize">{l.category.replace(/-/g, " ")}</span>
                      {l.subcategory && <span className="text-gray-300"> · {l.subcategory.replace(/-/g, " ")}</span>}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                      £{parseFloat(l.price).toFixed(2)}
                    </td>

                    {/* Seller */}
                    <td className="px-4 py-3 max-w-36">
                      <p className="text-xs text-gray-600 truncate">{l.seller_email}</p>
                      {l.seller_username && <p className="text-[10px] text-gray-400">@{l.seller_username}</p>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_STYLE[l.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {l.status}
                      </span>
                    </td>

                    {/* Amazon URL */}
                    <td className="px-4 py-3">
                      {specs.amazon_url ? (
                        <a
                          href={specs.amazon_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9900]/10 hover:bg-[#FF9900]/20 text-[#c45d00] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {specs.asin ?? "View on Amazon"}
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >← Prev</button>
              <span className="px-3 py-1.5 text-xs text-gray-500">{page + 1} / {pages}</span>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
