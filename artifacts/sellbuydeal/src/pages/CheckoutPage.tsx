import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Tag, Coins, CheckCircle2, X,
  Lock, ShoppingBag, Truck, Shield, Gift,
  Package, AlertCircle, Sparkles, Layers, Loader2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BuyerProtectionBadge } from "@/components/BuyerProtectionBadge";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const PROMO_CODES: Record<string, { type: "percent" | "fixed"; value: number; label: string; source: "site" | "seller" }> = {
  SAVE10:    { type: "percent", value: 10,  label: "10% off your order",           source: "site" },
  WELCOME20: { type: "percent", value: 20,  label: "20% off for new members",      source: "site" },
  SELLER5:   { type: "fixed",   value: 5,   label: "£5 off — Seller discount",     source: "seller" },
  DEAL15:    { type: "percent", value: 15,  label: "15% off — Bazunk promo",  source: "site" },
  NEWUSER:   { type: "fixed",   value: 10,  label: "£10 new user credit",          source: "site" },
};

type Step = "summary" | "redirecting";

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "summary",     label: "Review"  },
    { key: "redirecting", label: "Payment" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            i < idx  ? "bg-emerald-100 text-emerald-700" :
            i === idx ? "bg-[#4A5CE8] text-white shadow-sm" :
                        "bg-gray-100 text-gray-400"
          }`}>
            {i < idx ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < idx ? "bg-emerald-300" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

const CONDITION_COLORS: Record<string, string> = {
  "new": "bg-emerald-100 text-emerald-700", "like new": "bg-teal-100 text-teal-700",
  "good": "bg-blue-100 text-blue-700", "fair": "bg-yellow-100 text-yellow-700", "poor": "bg-red-100 text-red-700",
};

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, refreshBalance } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("summary");
  const [promoCode, setPromoCode] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [useCredits, setUseCredits] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const userCredits = user?.balance ?? 0;
  const appliedPromo = promoCode ? PROMO_CODES[promoCode] : null;

  const promoDiscount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === "percent") return subtotal * (appliedPromo.value / 100);
    return Math.min(appliedPromo.value, subtotal);
  }, [appliedPromo, subtotal]);

  const delivery = subtotal >= 50 ? 0 : 3.99;
  // Credits apply to item subtotal only — a minimum of £0.50 must always be charged
  // via card to cover Stripe processing fees. Credits cannot pay marketplace or card fees.
  const MIN_CARD_CHARGE = 0.50;
  const rawCredits = useCredits ? Math.min(userCredits, Math.max(0, subtotal - promoDiscount)) : 0;
  const creditsApplied = Math.min(rawCredits, Math.max(0, subtotal - promoDiscount + delivery - MIN_CARD_CHARGE));
  const total = Math.max(MIN_CARD_CHARGE, subtotal - promoDiscount - creditsApplied + delivery);

  // Detect return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId || !user?.email) return;

    setConfirming(true);
    // Clean the URL without reloading
    window.history.replaceState({}, "", "/checkout");

    fetch("/api/stripe/confirm-cart-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, email: user.email }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; error?: string }) => {
        if (data.success) {
          clearCart();
          refreshBalance();
          setPlaced(true);
        } else {
          setCheckoutError(data.error ?? "Payment verification failed. Please contact support.");
        }
      })
      .catch(() => setCheckoutError("Could not verify payment. Please contact support."))
      .finally(() => setConfirming(false));
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPromo() {
    setPromoError("");
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (PROMO_CODES[code]) {
      setPromoCode(code);
      setPromoInput("");
    } else {
      setPromoError("Code not recognised. Try SAVE10 or SELLER5.");
    }
  }

  async function handleContinueToPayment() {
    if (!user?.email) {
      setCheckoutError("Please sign in to continue.");
      return;
    }
    setCheckoutError(null);
    setCheckoutLoading(true);
    setStep("redirecting");

    try {
      const res = await fetch("/api/stripe/checkout-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          items: items.map((i) => ({
            title: i.product.title,
            price: i.product.price,
            quantity: i.quantity,
            currency: i.product.currency ?? "GBP",
            priceGbp: i.product.priceGbp,
          })),
          total,
          creditsApplied,
          deliveryGbp: delivery,
        }),
      });
      const data = await res.json() as { url?: string; freeOrder?: boolean; error?: string };

      if (data.freeOrder) {
        clearCart();
        refreshBalance();
        setPlaced(true);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error ?? "Failed to start checkout");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      setCheckoutError(msg);
      setStep("summary");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Verifying Stripe return
  if (confirming) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <Loader2 className="w-12 h-12 text-[#4A5CE8] animate-spin mb-4" />
          <p className="text-gray-600 font-semibold">Verifying your payment…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 text-sm mb-6">Add items before checking out</p>
          <Link href="/browse" className="px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Browse Listings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-gray-500 text-sm mb-2">Thank you for your purchase. You'll receive a confirmation shortly.</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/dashboard" className="px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
                View Dashboard
              </Link>
              <Link href="/browse" className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-gray-300 transition-colors">
                Keep Shopping
              </Link>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <button onClick={() => setLocation("/browse")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to browsing
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout</h1>
        <StepIndicator step={step} />

        {checkoutError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700">{checkoutError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* ── STEP 1: Order Review ── */}
            {step === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>

                {/* Items */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#4A5CE8]" /> Your Items ({items.length})
                  </h2>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                          <img src={item.product.image} alt={item.product.title} className="w-full h-full object-contain p-1.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${CONDITION_COLORS[item.product.condition]}`}>{item.product.condition}</span>
                            <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">£{(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bundle CTA */}
                <div className="bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED] rounded-2xl p-4 mb-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">Create a Bundle & Save More</p>
                    <p className="text-white/70 text-xs">Group items from the same seller to unlock extra discounts</p>
                  </div>
                  <Link href="/bundle" className="flex-shrink-0 px-4 py-2 rounded-xl bg-white text-[#4A5CE8] font-bold text-xs hover:bg-gray-50 transition-colors flex items-center gap-1">
                    Build Bundle <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Credits */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Bazunk Credits</p>
                        {userCredits > 0
                          ? <p className="text-xs text-gray-400">You have <strong className="text-amber-600">{Math.round(userCredits * 100).toLocaleString()} credits</strong> (≈ £{userCredits.toFixed(2)})</p>
                          : <p className="text-xs text-gray-400">No credits — <Link href="/credits" className="text-[#4A5CE8] underline">buy some</Link></p>
                        }
                      </div>
                    </div>
                    {userCredits > 0 && (
                      <div
                        onClick={() => setUseCredits(!useCredits)}
                        className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useCredits ? "bg-amber-400" : "bg-gray-200"}`}
                        data-testid="toggle-credits"
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${useCredits ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Credits apply to item price only. Delivery charges, marketplace fees, and card processing fees must always be paid in full.
                  </p>
                  {useCredits && creditsApplied > 0 && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 rounded-xl text-xs text-amber-700 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                      {Math.round(creditsApplied * 100).toLocaleString()} credits (£{creditsApplied.toFixed(2)}) will be applied to your item price
                    </div>
                  )}
                </div>

                {/* Promo codes */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#4A5CE8]" /> Promo Code
                  </h2>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        <div>
                          <p className="text-sm font-bold text-emerald-800">{promoCode}</p>
                          <p className="text-xs text-emerald-600">{appliedPromo.label}</p>
                        </div>
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${appliedPromo.source === "seller" ? "bg-[#F26B21]/10 text-[#F26B21]" : "bg-[#4A5CE8]/10 text-[#4A5CE8]"}`}>
                          {appliedPromo.source === "seller" ? "Seller Code" : "Site Code"}
                        </span>
                      </div>
                      <button onClick={() => setPromoCode("")} className="text-gray-400 hover:text-red-400 transition-colors" data-testid="button-remove-promo">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                          placeholder="Enter code (try SAVE10)"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] uppercase"
                          data-testid="input-promo-code"
                        />
                        <button onClick={applyPromo} className="px-4 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity" data-testid="button-apply-promo">
                          Apply
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {promoError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(["SAVE10", "SELLER5", "WELCOME20"] as const).map((code) => (
                          <button key={code} onClick={() => { setPromoInput(code); setPromoError(""); }}
                            className="text-xs px-2.5 py-1 rounded-full border border-dashed border-[#4A5CE8]/40 text-[#4A5CE8] hover:bg-[#4A5CE8]/5 transition-colors font-medium"
                            data-testid={`button-suggested-promo-${code}`}>
                            {code}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleContinueToPayment}
                  disabled={checkoutLoading}
                  className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#D97706] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  data-testid="button-continue-payment"
                >
                  {checkoutLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</>
                    : total <= 0
                    ? <><CheckCircle2 className="w-4 h-4" /> Confirm Free Order</>
                    : <><Lock className="w-4 h-4" /> Pay £{total.toFixed(2)} with Stripe <ChevronRight className="w-4 h-4" /></>
                  }
                </button>

                {!user && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    <Link href="/sign-in" className="text-[#4A5CE8] underline">Sign in</Link> to use credits and track your orders
                  </p>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Redirecting to Stripe ── */}
            {step === "redirecting" && (
              <motion.div key="redirecting" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#4A5CE8]/10 flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-[#4A5CE8] animate-spin" />
                  </div>
                  <h2 className="font-bold text-gray-900 text-lg mb-1">Redirecting to secure checkout</h2>
                  <p className="text-sm text-gray-400 mb-6">You're being taken to Stripe's secure payment page…</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    256-bit SSL encryption · Powered by Stripe
                  </div>
                </div>
                <button onClick={() => setStep("summary")} className="w-full mt-3 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:border-gray-300 transition-colors flex items-center justify-center gap-1.5">
                  <ChevronLeft className="w-4 h-4" /> Cancel and go back
                </button>
              </motion.div>
            )}
          </div>

          {/* Right: order summary (sticky) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900">£{subtotal.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {promoCode}</span>
                    <span className="font-semibold">−£{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                {useCredits && creditsApplied > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {Math.round(creditsApplied * 100).toLocaleString()} credits</span>
                    <span className="font-semibold">−£{creditsApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className={`font-semibold ${delivery === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                    {delivery === 0 ? "FREE" : `£${delivery.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-3 border-t border-gray-100">
                  <span>Total</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>

              {(promoDiscount > 0 || creditsApplied > 0) && (
                <div className="mt-3 bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  You're saving £{(promoDiscount + creditsApplied).toFixed(2)} on this order!
                </div>
              )}

              <div className="mt-4 space-y-2">
                {[
                  { icon: Shield,  text: "30-day buyer protection" },
                  { icon: Truck,   text: "Shipping arranged by seller" },
                  { icon: Package, text: "Track orders from your Dashboard" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-400">
                    <Icon className="w-3.5 h-3.5 text-[#4A5CE8] flex-shrink-0" />
                    {text}
                  </div>
                ))}
                <div className="pt-1">
                  <BuyerProtectionBadge compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
