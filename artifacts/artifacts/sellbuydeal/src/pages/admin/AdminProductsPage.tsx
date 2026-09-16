import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Search, Plus, Pencil, Trash2, RefreshCw, Package, CheckCircle, XCircle,
  X, ChevronDown, Upload, Download, Loader2, ImageIcon, Tag, Save, AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string; name: string; slug: string; description: string | null; product_count: number;
}

interface Variant {
  type: string; value: string; priceModifier: string; inventory: string;
}

interface Product {
  id: string; title: string; description: string | null; price: string;
  status: string; inventory: number; condition: string; tags: string | null;
  images: string[]; variants: Variant[]; seller_email: string | null;
  category_id: string | null; category_name: string | null; created_at: string;
}

interface ProductForm {
  title: string; description: string; price: string; category_id: string;
  condition: string; status: string; inventory: string; tags: string;
  seller_email: string; images: string[]; variants: Variant[];
}

const EMPTY_FORM: ProductForm = {
  title: "", description: "", price: "0", category_id: "", condition: "new",
  status: "pending", inventory: "0", tags: "", seller_email: "", images: [], variants: [],
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const CONDITION_STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-600",
  used: "bg-gray-100 text-gray-600",
  refurbished: "bg-purple-50 text-purple-600",
};

const VARIANT_TYPES = ["size", "color", "condition", "material", "style", "other"];

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminProductsPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"products" | "categories" | "import-export">("products");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    const res = await authFetch("/api/admin/categories");
    if (res.ok) { const d = await res.json(); setCategories(d.categories ?? []); }
  }

  const TABS = [
    { id: "products", label: "All Products", icon: Package },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "import-export", label: "Import / Export", icon: Upload },
  ] as const;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Product Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your marketplace catalogue</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "products"      && <ProductsTab authFetch={authFetch} categories={categories} />}
      {tab === "categories"    && <CategoriesTab authFetch={authFetch} categories={categories} onRefresh={loadCategories} />}
      {tab === "import-export" && <ImportExportTab authFetch={authFetch} categories={categories} />}
    </AdminLayout>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────────

function ProductsTab({ authFetch, categories }: { authFetch: (url: string, opts?: RequestInit) => Promise<Response>; categories: Category[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { load(); }, [search, statusFilter, categoryFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await authFetch(`/api/admin/products?${params}`);
      if (res.ok) { const d = await res.json(); setProducts(d.products ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }

  async function setStatus(id: string, status: string) {
    setActionId(id);
    const res = await authFetch(`/api/admin/products/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
    setActionId(null);
  }

  async function deleteProduct(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setActionId(id);
    setDeleteConfirm(null);
    await authFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await load();
    setActionId(null);
  }

  function openAdd() { setEditProduct(null); setDrawerOpen(true); }
  function openEdit(p: Product) { setEditProduct(p); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setEditProduct(null); }

  const STATUS_PILLS = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
          />
        </div>
        <select
          value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 text-gray-600"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700 disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F26B21] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {STATUS_PILLS.map(p => (
          <button key={p.value} onClick={() => setStatusFilter(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === p.value
                ? "bg-[#1A1D2E] text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:text-gray-700"
            }`}
          >{p.label}</button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{total} products</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["", "Product", "Category", "Price", "Condition", "Stock", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center text-gray-400 py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No products found</p>
                  <p className="text-xs text-gray-300 mt-1">Add your first product or adjust filters</p>
                </td></tr>
              )}
              {products.map(p => {
                const imgs: string[] = Array.isArray(p.images) ? p.images : [];
                const thumb = imgs[0];
                const isActing = actionId === p.id;
                return (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 w-12">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="font-semibold text-gray-800 truncate">{p.title}</p>
                      {p.seller_email && <p className="text-[10px] text-gray-400 truncate">{p.seller_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.category_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">£{parseFloat(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${CONDITION_STYLE[p.condition] ?? "bg-gray-100 text-gray-500"}`}>{p.condition}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{p.inventory}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {p.status === "pending" && (
                          <>
                            <button onClick={() => setStatus(p.id, "approved")} disabled={isActing} title="Approve"
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setStatus(p.id, "rejected")} disabled={isActing} title="Reject"
                              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <button onClick={() => setStatus(p.id, "rejected")} disabled={isActing} title="Reject"
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {p.status === "rejected" && (
                          <button onClick={() => setStatus(p.id, "approved")} disabled={isActing} title="Approve"
                            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center disabled:opacity-40 transition-colors">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="w-7 h-7 rounded-lg bg-[#4A5CE8]/10 hover:bg-[#4A5CE8]/20 text-[#4A5CE8] flex items-center justify-center transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} disabled={isActing}
                          className={`h-7 rounded-lg flex items-center justify-center gap-1 px-2 transition-colors disabled:opacity-40 ${
                            deleteConfirm === p.id
                              ? "bg-red-500 text-white text-[10px] font-bold"
                              : "w-7 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500"
                          }`}
                          title={deleteConfirm === p.id ? "Click to confirm" : "Delete"}
                          onBlur={() => setDeleteConfirm(null)}
                        >
                          {deleteConfirm === p.id ? <><AlertTriangle className="w-3 h-3" /> Confirm</> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Drawer */}
      {drawerOpen && (
        <ProductDrawer
          product={editProduct}
          categories={categories}
          authFetch={authFetch}
          onClose={closeDrawer}
          onSaved={() => { closeDrawer(); load(); }}
        />
      )}
    </div>
  );
}

// ── Product Drawer ────────────────────────────────────────────────────────────

function ProductDrawer({
  product, categories, authFetch, onClose, onSaved,
}: {
  product: Product | null;
  categories: Category[];
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<ProductForm>(() => product ? {
    title: product.title,
    description: product.description ?? "",
    price: product.price,
    category_id: product.category_id ?? "",
    condition: product.condition,
    status: product.status,
    inventory: String(product.inventory),
    tags: product.tags ?? "",
    seller_email: product.seller_email ?? "",
    images: Array.isArray(product.images) ? [...product.images] : [],
    variants: Array.isArray(product.variants) ? product.variants.map(v => ({ ...v, priceModifier: String(v.priceModifier), inventory: String(v.inventory) })) : [],
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof ProductForm, val: any) => setForm(f => ({ ...f, [key]: val }));

  function addImage() { set("images", [...form.images, ""]); }
  function setImage(i: number, val: string) { const imgs = [...form.images]; imgs[i] = val; set("images", imgs); }
  function removeImage(i: number) { set("images", form.images.filter((_, idx) => idx !== i)); }

  function addVariant() { set("variants", [...form.variants, { type: "size", value: "", priceModifier: "0", inventory: "0" }]); }
  function setVariant(i: number, key: keyof Variant, val: string) {
    const vs = [...form.variants]; vs[i] = { ...vs[i], [key]: val }; set("variants", vs);
  }
  function removeVariant(i: number) { set("variants", form.variants.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    const body = {
      ...form,
      price: parseFloat(form.price) || 0,
      inventory: parseInt(form.inventory) || 0,
      category_id: form.category_id || null,
      images: form.images.filter(u => u.trim()),
      variants: form.variants.map(v => ({
        type: v.type, value: v.value,
        priceModifier: parseFloat(v.priceModifier) || 0,
        inventory: parseInt(v.inventory) || 0,
      })),
    };
    const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
    const res = await authFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(body) });
    if (res.ok) { onSaved(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save"); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-900">{isEdit ? "Edit Product" : "New Product"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `ID: ${product!.id.slice(0, 8)}…` : "Fill in the product details"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Core fields */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Title *</span>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                placeholder="Product name" />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Description</span>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                rows={3}
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                placeholder="Describe the product…" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Price (£)</span>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Inventory</span>
                <input type="number" min="0" value={form.inventory} onChange={e => set("inventory", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Condition</span>
                <select value={form.condition} onChange={e => set("condition", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 bg-white">
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Status</span>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 bg-white">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Category</span>
                <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 bg-white">
                  <option value="">None</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Seller Email</span>
                <input value={form.seller_email} onChange={e => set("seller_email", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  placeholder="seller@example.com" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tags</span>
                <input value={form.tags} onChange={e => set("tags", e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  placeholder="tag1, tag2, tag3" />
              </label>
            </div>
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Images</span>
              <button onClick={addImage} className="flex items-center gap-1 text-xs font-semibold text-[#4A5CE8] hover:underline">
                <Plus className="w-3 h-3" /> Add URL
              </button>
            </div>
            {form.images.length === 0 && (
              <p className="text-xs text-gray-400 italic">No images — click "Add URL" to add image links</p>
            )}
            <div className="space-y-2">
              {form.images.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  {url && <img src={url} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  {!url && <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center"><ImageIcon className="w-3 h-3 text-gray-300" /></div>}
                  <input value={url} onChange={e => setImage(i, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                  <button onClick={() => removeImage(i)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Variants</span>
              <button onClick={addVariant} className="flex items-center gap-1 text-xs font-semibold text-[#4A5CE8] hover:underline">
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>
            {form.variants.length === 0 && (
              <p className="text-xs text-gray-400 italic">No variants — click "Add Variant" for size, colour, etc.</p>
            )}
            {form.variants.length > 0 && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-[100px_1fr_80px_60px_32px] gap-0 bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                  <span>Type</span><span>Value</span><span>Price +/-</span><span>Stock</span><span />
                </div>
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[100px_1fr_80px_60px_32px] gap-1 px-2 py-2 border-t border-gray-50 items-center">
                    <select value={v.type} onChange={e => setVariant(i, "type", e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]">
                      {VARIANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={v.value} onChange={e => setVariant(i, "value", e.target.value)}
                      placeholder="e.g. Large" className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                    <input type="number" step="0.01" value={v.priceModifier} onChange={e => setVariant(i, "priceModifier", e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                    <input type="number" min="0" value={v.inventory} onChange={e => setVariant(i, "inventory", e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                    <button onClick={() => removeVariant(i)} className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {isEdit ? "Save Changes" : "Create Product"}</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Categories Tab ────────────────────────────────────────────────────────────

function CategoriesTab({ authFetch, categories, onRefresh }: {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  categories: Category[];
  onRefresh: () => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function createCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    await authFetch("/api/admin/categories", { method: "POST", body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }) });
    setNewName(""); setNewDesc("");
    onRefresh(); setSaving(false);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    await authFetch(`/api/admin/categories/${id}`, { method: "PUT", body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }) });
    setEditId(null); onRefresh(); setSaving(false);
  }

  async function deleteCategory(id: string) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    setDeleteConfirm(null);
    await authFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Add Category</h3>
        <div className="flex gap-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createCategory()}
            placeholder="Category name"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
          <button onClick={createCategory} disabled={saving || !newName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F26B21] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Category list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {["Name", "Slug", "Description", "Products", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">No categories yet</td></tr>
            )}
            {categories.map(c => (
              <tr key={c.id} className="border-t border-gray-50">
                <td className="px-4 py-3">
                  {editId === c.id ? (
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full border border-[#4A5CE8] rounded-lg px-2 py-1 text-sm focus:outline-none" autoFocus />
                  ) : (
                    <span className="font-semibold text-gray-800">{c.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 text-gray-500 max-w-48">
                  {editId === c.id ? (
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      className="w-full border border-[#4A5CE8] rounded-lg px-2 py-1 text-sm focus:outline-none" />
                  ) : (
                    <span className="truncate block">{c.description ?? <span className="text-gray-300">—</span>}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-[#4A5CE8]/10 text-[#4A5CE8] text-xs font-bold px-2 py-1 rounded-full">{c.product_count}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {editId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c.id)} disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#4A5CE8] text-white rounded-lg text-xs font-bold disabled:opacity-40">
                          <Save className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(c.id); setEditName(c.name); setEditDesc(c.description ?? ""); }}
                          className="w-7 h-7 rounded-lg bg-[#4A5CE8]/10 hover:bg-[#4A5CE8]/20 text-[#4A5CE8] flex items-center justify-center transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteCategory(c.id)}
                          className={`h-7 rounded-lg flex items-center gap-1 px-2 transition-colors ${
                            deleteConfirm === c.id ? "bg-red-500 text-white text-[10px] font-bold" : "w-7 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500"
                          }`}
                          onBlur={() => setDeleteConfirm(null)}>
                          {deleteConfirm === c.id ? <><AlertTriangle className="w-3 h-3" /> Confirm</> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Import / Export Tab ───────────────────────────────────────────────────────

function ImportExportTab({ authFetch, categories }: {
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
  categories: Category[];
}) {
  const [exportStatus, setExportStatus] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const SAMPLE_CSV = `title,description,price,category_slug,condition,inventory,status,tags,image_url,seller_email
"Blue Denim Jacket","Classic slim-fit denim jacket",29.99,clothing,used,5,approved,"jacket,denim",https://example.com/jacket.jpg,seller@example.com
"Wireless Headphones","Sony WH-1000XM4",199.99,electronics,new,10,pending,"audio,wireless",,`;

  async function handleExport() {
    const params = new URLSearchParams();
    if (exportStatus) params.set("status", exportStatus);
    const res = await authFetch(`/api/admin/products/export?${params}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `products-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);
    const res = await authFetch("/api/admin/products/import", {
      method: "POST", body: JSON.stringify({ csv: importText }),
    });
    if (res.ok) { const d = await res.json(); setImportResult(d); }
    else { setImportResult({ imported: 0, errors: ["Import failed — check CSV format"] }); }
    setImporting(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImportText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Export */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Download className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Export Products</h3>
            <p className="text-xs text-gray-400">Download all products as CSV</p>
          </div>
        </div>

        <label className="block mb-4">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Filter by Status</span>
          <select value={exportStatus} onChange={e => setExportStatus(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30">
            <option value="">All Products</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </label>

        <button onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" /> Download CSV
        </button>

        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-600 mb-2">CSV Columns</p>
          <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
            id, title, description, price, category_slug, condition, inventory, status, tags, image_url, seller_email
          </p>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center">
            <Upload className="w-4 h-4 text-[#4A5CE8]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Import Products</h3>
            <p className="text-xs text-gray-400">Bulk upload via CSV file or paste</p>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Upload File
          </button>
          <button onClick={() => setImportText(SAMPLE_CSV)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Load Sample
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </div>

        <textarea
          value={importText} onChange={e => setImportText(e.target.value)}
          rows={8}
          placeholder="Paste CSV content here or upload a file above…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none mb-3"
        />

        <button onClick={handleImport} disabled={importing || !importText.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#4A5CE8] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
          {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import Products</>}
        </button>

        {importResult && (
          <div className={`mt-4 rounded-xl p-4 ${importResult.imported > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}>
            <p className={`text-sm font-bold mb-2 ${importResult.imported > 0 ? "text-emerald-700" : "text-gray-600"}`}>
              {importResult.imported > 0 ? `✓ ${importResult.imported} products imported` : "No products imported"}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="space-y-1">
                {importResult.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-[10px] text-amber-700 font-semibold">Category slugs must match existing categories. Use the <strong>Categories</strong> tab to manage them first.</p>
        </div>
      </div>
    </div>
  );
}
