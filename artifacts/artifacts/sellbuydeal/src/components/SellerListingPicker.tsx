import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronDown, ChevronUp, Check, Plus, Loader2, X } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";

export interface SellerListing {
  id: number;
  title: string;
  price: number;
  condition?: string;
  category?: string;
  image?: string;
  description?: string;
  location?: string;
}

// Single-select props
interface SingleProps {
  multiSelect?: false;
  onSelect: (listing: SellerListing) => void;
  selectedId?: number | null;
  selectedIds?: never;
  onMultiSelect?: never;
}

// Multi-select props
interface MultiProps {
  multiSelect: true;
  onSelect?: never;
  selectedId?: never;
  selectedIds: number[];
  onMultiSelect: (listings: SellerListing[]) => void;
}

type Props = SingleProps | MultiProps;

export function SellerListingPicker(props: Props) {
  const { user } = useAuth();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);
    fetch(`/api/listings/mine?email=${encodeURIComponent(user.email)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: number; title: string; price: string; condition?: string; category?: string; image?: string | null; description?: string }>) => {
        setListings(data.map((l) => ({
          id: l.id,
          title: l.title,
          price: parseFloat(l.price),
          condition: l.condition,
          category: l.category,
          image: l.image ?? undefined,
          description: l.description,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  const isMulti = props.multiSelect === true;

  // Multi-select: toggle a listing in/out of selectedIds
  function toggleMulti(listing: SellerListing) {
    if (!isMulti) return;
    const { selectedIds, onMultiSelect } = props as MultiProps;
    const already = selectedIds.includes(listing.id);
    const next = already
      ? listings.filter((l) => selectedIds.includes(l.id) && l.id !== listing.id)
      : [...listings.filter((l) => selectedIds.includes(l.id)), listing];
    onMultiSelect(next);
  }

  // Single-select
  function handleSingleSelect(listing: SellerListing) {
    if (isMulti) return;
    (props as SingleProps).onSelect(listing);
    setOpen(false);
  }

  const selected = isMulti ? null : listings.find((l) => l.id === (props as SingleProps).selectedId);
  const multiSelectedIds = isMulti ? (props as MultiProps).selectedIds : [];
  const multiCount = multiSelectedIds.length;

  if (loading) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
        <p className="text-sm text-gray-400">Loading your listings…</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">No saved listings</p>
            <p className="text-xs text-gray-400">Add a listing first to import its details here</p>
          </div>
        </div>
        <Link href="/sell/quick"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4A5CE8] text-white text-xs font-bold hover:opacity-90 transition-opacity whitespace-nowrap flex-shrink-0">
          <Plus className="w-3 h-3" /> Add Listing
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isMulti ? (
            <>
              <div className="w-9 h-9 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-[#4A5CE8]" />
              </div>
              <div className="text-left">
                {multiCount === 0 ? (
                  <>
                    <p className="text-sm font-bold text-gray-700">Select listings to include</p>
                    <p className="text-xs text-gray-400">{listings.length} listing{listings.length !== 1 ? "s" : ""} available — tick to add</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#4A5CE8]">{multiCount} listing{multiCount !== 1 ? "s" : ""} selected</p>
                    <p className="text-xs text-gray-400">{listings.length - multiCount} more available — click to change</p>
                  </>
                )}
              </div>
            </>
          ) : selected ? (
            <>
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {selected.image
                  ? <img src={selected.image} alt={selected.title} className="w-full h-full object-contain p-0.5" />
                  : <Package className="w-4 h-4 text-gray-300" />}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold text-gray-900 truncate">{selected.title}</p>
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Imported from your listings · £{selected.price.toFixed(2)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-[#4A5CE8]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-700">Import from your listings</p>
                <p className="text-xs text-gray-400">{listings.length} listing{listings.length !== 1 ? "s" : ""} available — click to auto-fill</p>
              </div>
            </>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Multi-select selected chips (shown when closed) */}
      {isMulti && multiCount > 0 && !open && (
        <div className="px-3 pb-3 pt-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-1.5">
          {listings.filter(l => multiSelectedIds.includes(l.id)).map(l => (
            <span key={l.id} className="inline-flex items-center gap-1 bg-white border border-[#4A5CE8]/30 rounded-full pl-2 pr-1 py-0.5 text-xs font-medium text-[#4A5CE8]">
              {l.title.length > 20 ? l.title.slice(0, 20) + "…" : l.title}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleMulti(l); }}
                className="w-4 h-4 rounded-full hover:bg-[#4A5CE8]/10 flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Picker grid */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white border-t border-gray-100 max-h-72 overflow-y-auto">
              {listings.map((listing) => {
                const active = isMulti
                  ? multiSelectedIds.includes(listing.id)
                  : listing.id === (props as SingleProps).selectedId;
                return (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => isMulti ? toggleMulti(listing) : handleSingleSelect(listing)}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all hover:shadow-sm group ${
                      active
                        ? "border-[#4A5CE8] bg-blue-50/50"
                        : "border-gray-100 hover:border-[#4A5CE8]/40 bg-white"
                    }`}
                  >
                    <div className="w-full aspect-square rounded-lg bg-gray-50 mb-2 overflow-hidden flex items-center justify-center">
                      {listing.image
                        ? <img src={listing.image} alt={listing.title} className="w-full h-full object-contain p-1" />
                        : <Package className="w-6 h-6 text-gray-200" />}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{listing.title}</p>
                    <p className="text-xs font-bold text-[#F26B21]">£{listing.price.toFixed(2)}</p>
                    {listing.condition && (
                      <p className="text-[10px] text-gray-400 capitalize mt-0.5">{listing.condition}</p>
                    )}
                    {/* Check indicator */}
                    {isMulti ? (
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                        active ? "bg-[#4A5CE8] border-[#4A5CE8]" : "bg-white border-gray-300"
                      }`}>
                        {active && <Check className="w-3 h-3 text-white" />}
                      </div>
                    ) : active ? (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#4A5CE8] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {isMulti && (
              <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">{multiCount} selected</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-bold text-[#4A5CE8] hover:underline"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
