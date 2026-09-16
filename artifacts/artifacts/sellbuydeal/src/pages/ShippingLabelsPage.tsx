import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Package, QrCode, MapPin, Truck, RotateCcw, CheckCircle2,
  Clock, AlertCircle, ChevronLeft, Download, ExternalLink, RefreshCw,
  X, Printer,
} from "lucide-react";
import { useUser } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

type CarrierId = "inpost" | "evri" | "royal-mail";
type ShipmentStatus =
  | "pending_label"
  | "label_generated"
  | "dropped_off"
  | "in_transit"
  | "delivered"
  | "return_requested"
  | "return_label_generated"
  | "return_received";

interface Shipment {
  id: string;
  listingTitle: string;
  buyerName: string;
  buyerPostcode: string;
  carrier: CarrierId;
  status: ShipmentStatus;
  trackingNumber?: string;
  createdAt: string;
  saleAmount: number;
  direction: "outbound" | "return";
}

const CARRIER_META: Record<CarrierId, { name: string; color: string; bg: string; border: string; badge: string }> = {
  inpost:      { name: "InPost",      color: "#FFD100", bg: "bg-yellow-50",  border: "border-yellow-200", badge: "bg-[#FFD100] text-yellow-900" },
  evri:        { name: "Evri",        color: "#9B1FAE", bg: "bg-purple-50",  border: "border-purple-200", badge: "bg-[#9B1FAE] text-white" },
  "royal-mail":{ name: "Royal Mail",  color: "#CC0000", bg: "bg-red-50",     border: "border-red-200",    badge: "bg-[#CC0000] text-white" },
};

const STATUS_META: Record<ShipmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending_label:          { label: "Needs label",      color: "bg-orange-100 text-orange-700",   icon: AlertCircle },
  label_generated:        { label: "Label ready",      color: "bg-blue-100 text-blue-700",       icon: QrCode },
  dropped_off:            { label: "Dropped off",      color: "bg-indigo-100 text-indigo-700",   icon: Package },
  in_transit:             { label: "In transit",       color: "bg-purple-100 text-purple-700",   icon: Truck },
  delivered:              { label: "Delivered",        color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  return_requested:       { label: "Return requested", color: "bg-red-100 text-red-700",         icon: RotateCcw },
  return_label_generated: { label: "Return label",     color: "bg-blue-100 text-blue-700",       icon: QrCode },
  return_received:        { label: "Return received",  color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

function generateTrackingNumber(carrier: CarrierId): string {
  const prefix = carrier === "inpost" ? "IN" : carrier === "evri" ? "EV" : "RM";
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}${digits}GB`;
}

function shipmentsKey(userId: string | null | undefined) {
  return userId ? `sbd_shipments_${userId}` : null;
}

function loadShipments(userId: string | null | undefined): Shipment[] {
  const key = shipmentsKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Shipment[]) : [];
  } catch {
    return [];
  }
}

function saveShipments(data: Shipment[], userId: string | null | undefined) {
  const key = shipmentsKey(userId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(data));
}

interface LabelModalProps {
  shipment: Shipment;
  onClose: () => void;
}

function LabelModal({ shipment, onClose }: LabelModalProps) {
  const cm = CARRIER_META[shipment.carrier];
  const tracking = shipment.trackingNumber ?? generateTrackingNumber(shipment.carrier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Label header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Shipping Label</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Simulated label */}
        <div className="p-5">
          <div className="border-2 border-gray-900 rounded-2xl overflow-hidden font-mono">
            {/* Carrier banner */}
            <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: cm.color }}>
              <span className="text-sm font-black tracking-wider" style={{ color: shipment.carrier === "inpost" ? "#111" : "white" }}>
                {cm.name.toUpperCase()}
              </span>
              <span className="text-xs font-bold" style={{ color: shipment.carrier === "inpost" ? "#111" : "white" }}>
                TRACKED DELIVERY
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* QR placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border-2 border-gray-900 rounded-lg flex-shrink-0 p-1 grid grid-cols-5 gap-0.5">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${Math.random() > 0.45 ? "bg-gray-900" : "bg-white"}`} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Tracking No.</p>
                  <p className="text-sm font-black tracking-widest text-gray-900">{tracking}</p>
                </div>
              </div>

              {/* Barcode */}
              <div className="flex justify-center gap-px h-10">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div key={i} className="bg-gray-900 rounded-sm flex-1" style={{ opacity: Math.random() > 0.4 ? 1 : 0 }} />
                ))}
              </div>
              <p className="text-center text-[9px] tracking-[0.3em] text-gray-700">{tracking}</p>

              {/* Addresses */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-gray-300">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">From</p>
                  <p className="text-[11px] font-semibold text-gray-900">Seller (SBD)</p>
                  <p className="text-[10px] text-gray-500">Via Locker Network</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">To</p>
                  <p className="text-[11px] font-semibold text-gray-900">{shipment.buyerName}</p>
                  <p className="text-[10px] text-gray-500">{shipment.buyerPostcode}</p>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-gray-300 pt-2">
                <p className="text-[9px] text-gray-400">Bazunk · bazunk.co.uk · Order ID: {shipment.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A1D2E] text-white text-sm font-bold hover:opacity-90">
            <Printer className="w-4 h-4" /> Print Label
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50">
            <Download className="w-4 h-4" /> Save PDF
          </button>
        </div>

        {/* Find locker */}
        <div className="px-5 pb-5">
          <a
            href={
              shipment.carrier === "inpost"
                ? "https://inpost.co.uk/lockers"
                : shipment.carrier === "evri"
                ? "https://www.evri.com/find-a-parcelshop"
                : "https://www.royalmail.com/sending/uk/find-a-postbox-branch"
            }
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${cm.border} ${cm.bg}`}
          >
            <MapPin className="w-4 h-4" /> Find nearest {cm.name} drop-off
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>
    </div>
  );
}

type TabId = "pending" | "active" | "returns" | "history";

export function ShippingLabelsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id ?? null;
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tab, setTab] = useState<TabId>("pending");
  const [labelModal, setLabelModal] = useState<Shipment | null>(null);

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
  }, [user, setLocation]);

  useEffect(() => {
    setShipments(loadShipments(userId));
  }, [userId]);

  function generateLabel(id: string) {
    setShipments((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? { ...s, status: "label_generated" as ShipmentStatus, trackingNumber: generateTrackingNumber(s.carrier) }
          : s
      );
      saveShipments(updated, userId);
      return updated;
    });
  }

  function generateReturnLabel(id: string) {
    setShipments((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? { ...s, status: "return_label_generated" as ShipmentStatus, trackingNumber: generateTrackingNumber(s.carrier) }
          : s
      );
      saveShipments(updated, userId);
      return updated;
    });
  }

  function advanceStatus(id: string) {
    const flow: ShipmentStatus[] = ["label_generated", "dropped_off", "in_transit", "delivered"];
    setShipments((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        const i = flow.indexOf(s.status as ShipmentStatus);
        const next = i >= 0 && i < flow.length - 1 ? flow[i + 1] : s.status;
        return { ...s, status: next };
      });
      saveShipments(updated, userId);
      return updated;
    });
  }

  const pending  = shipments.filter((s) => s.status === "pending_label");
  const active   = shipments.filter((s) => ["label_generated", "dropped_off", "in_transit"].includes(s.status));
  const returns  = shipments.filter((s) => ["return_requested", "return_label_generated", "return_received"].includes(s.status));
  const history  = shipments.filter((s) => s.status === "delivered" || s.status === "return_received");

  const tabData: Record<TabId, { label: string; items: Shipment[]; emptyMsg: string }> = {
    pending: { label: `Needs Label (${pending.length})`,  items: pending,  emptyMsg: "No shipments waiting for a label." },
    active:  { label: `In Progress (${active.length})`,   items: active,   emptyMsg: "No active shipments." },
    returns: { label: `Returns (${returns.length})`,       items: returns,  emptyMsg: "No return requests." },
    history: { label: `History (${history.length})`,       items: history,  emptyMsg: "No completed shipments yet." },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-8">
        <Link href="/shipping/lockers" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4A5CE8] mb-6 w-fit">
          <ChevronLeft className="w-4 h-4" /> Locker Shipping
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Shipments</h1>
            <p className="text-sm text-gray-400">Manage labels, tracking, and returns</p>
          </div>
          <button
            onClick={() => setShipments(loadShipments(userId))}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-6 overflow-x-auto">
          {(Object.keys(tabData) as TabId[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                tab === t ? "bg-white shadow-sm text-[#1A1D2E]" : "text-gray-500 hover:text-gray-700"
              }`}>
              {tabData[t].label}
            </button>
          ))}
        </div>

        {/* Shipment list */}
        <div className="space-y-3">
          {tabData[tab].items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{tabData[tab].emptyMsg}</p>
              {tab === "pending" && (
                <Link href="/sell/quick" className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90">
                  List an item
                </Link>
              )}
            </div>
          ) : (
            tabData[tab].items.map((shipment) => {
              const cm = CARRIER_META[shipment.carrier];
              const sm = STATUS_META[shipment.status];
              const StatusIcon = sm.icon;
              return (
                <div key={shipment.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border ${cm.border} ${cm.bg}`}>
                      <Truck className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{shipment.listingTitle}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cm.badge}`}>{cm.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sm.color} flex items-center gap-1`}>
                          <StatusIcon className="w-2.5 h-2.5" /> {sm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>→ {shipment.buyerName} · {shipment.buyerPostcode}</span>
                        <span>£{shipment.saleAmount.toFixed(2)}</span>
                      </div>
                      {shipment.trackingNumber && (
                        <p className="text-xs font-mono text-[#4A5CE8] mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />{shipment.trackingNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {shipment.status === "pending_label" && (
                        <button
                          onClick={() => generateLabel(shipment.id)}
                          className="px-3 py-2 rounded-xl bg-[#F26B21] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5" /> Get Label
                        </button>
                      )}
                      {(shipment.status === "label_generated" || shipment.status === "dropped_off" || shipment.status === "in_transit") && (
                        <>
                          <button
                            onClick={() => setLabelModal(shipment)}
                            className="px-3 py-2 rounded-xl bg-[#1A1D2E] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5">
                            <Printer className="w-3.5 h-3.5" /> Label
                          </button>
                          {shipment.status !== "in_transit" && (
                            <button
                              onClick={() => advanceStatus(shipment.id)}
                              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5">
                              <RefreshCw className="w-3 h-3" /> Advance
                            </button>
                          )}
                        </>
                      )}
                      {shipment.status === "return_requested" && (
                        <button
                          onClick={() => generateReturnLabel(shipment.id)}
                          className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Return Label
                        </button>
                      )}
                      {shipment.status === "return_label_generated" && (
                        <button
                          onClick={() => setLabelModal(shipment)}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5" /> View Label
                        </button>
                      )}
                      {(shipment.status === "delivered" || shipment.status === "return_received") && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Locker finder promo */}
        <div className="mt-8 bg-[#1A1D2E] rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-white text-sm">Find your nearest locker</p>
            <p className="text-gray-400 text-xs mt-0.5">20,000+ InPost, Evri & Royal Mail points across the UK</p>
          </div>
          <a href="/shipping/lockers#find-locker"
            className="px-4 py-2 rounded-xl bg-[#F26B21] text-white text-xs font-bold whitespace-nowrap hover:opacity-90">
            Find a Locker
          </a>
        </div>
      </main>
      <Footer />
      {labelModal && <LabelModal shipment={labelModal} onClose={() => setLabelModal(null)} />}
    </div>
  );
}
