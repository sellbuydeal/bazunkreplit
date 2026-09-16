import { useState } from "react";
import { Shield, X, CheckCircle2, Clock, RotateCcw, AlertTriangle, ChevronRight } from "lucide-react";

const COVERED = [
  { icon: CheckCircle2, color: "text-emerald-500", title: "Item not received", desc: "Full refund if your item never arrives" },
  { icon: CheckCircle2, color: "text-emerald-500", title: "Not as described",  desc: "Refund if item significantly differs from listing" },
  { icon: CheckCircle2, color: "text-emerald-500", title: "Damaged in transit", desc: "Covered if item arrives damaged" },
  { icon: CheckCircle2, color: "text-emerald-500", title: "Wrong item sent",   desc: "Refund or replacement guaranteed" },
];

const STEPS = [
  { icon: AlertTriangle, label: "Open a dispute",       desc: "In your Dashboard → Disputes within 30 days of purchase" },
  { icon: Clock,         label: "Seller has 48 hours",  desc: "To respond and propose a resolution" },
  { icon: Shield,        label: "We step in if needed", desc: "Our team reviews evidence and issues a decision within 5 days" },
  { icon: RotateCcw,     label: "Refund processed",     desc: "To your original payment method within 3–5 business days" },
];

export function BuyerProtectionBadge({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-xl font-semibold transition-all hover:opacity-80 ${
          compact
            ? "text-xs text-emerald-600 gap-1"
            : "text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2"
        }`}
      >
        <Shield className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        Buyer Protected
        {!compact && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Shield className="w-7 h-7" />
                </div>
                <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-xl font-black mt-2">Bazunk Buyer Protection</h2>
              <p className="text-emerald-100 text-sm mt-1">Every purchase is protected. Shop with complete confidence.</p>
            </div>

            <div className="p-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">What's covered</h3>
              <div className="space-y-2.5 mb-5">
                {COVERED.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 mb-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">How disputes work</h3>
                <div className="space-y-3">
                  {STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#4A5CE8] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                        <p className="text-xs text-gray-400">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Disputes must be opened within <strong>30 days</strong> of purchase. Applies to all paid orders on Bazunk.
              </p>

              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
