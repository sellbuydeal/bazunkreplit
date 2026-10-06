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
import { useCurrency } from "@/context/CurrencyContext";

const PROMO_CODES: Record<string, { type: "percent" | "fixed"; value: number; label: string; source: "site" | "seller" }> = {
  SAVE10:    { type: "percent", value: 10,  label: "10% off your order",           source: "site" },
  WELCOME20: { type: "percent", value: 20,  label: "20% off for new members",      source: "site" },
  SELLER5:   { type: "fixed",   value: 5,   label: "5-unit seller discount",     source: "seller" },
  DEAL15:    { type: "percent", value: 15,  label: "15% off — Bazunk promo",  source: "site" },
  NEWUSER:   { type: "fixed",   value: 10,  label: "10-unit new user credit",          source: "site" },
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
  const { items, clearCart } = useCart();
  const { user, refreshBalance } = useAuth();
  const [, setLocation] = useLocation();
  const { formatPrice, currency } = useCurrency();

  const [step, setStep] = useState<Step>("summary");
  const [promoCode, setPromoCode] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [useCredits, setUseCredits] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  type Quote = { currency:string; subtotal:number; privateSubtotal:number; buyerProtectionFee:number; delivery:number; total:number; protectionPercent:number; fixedProtection:number; items:{id:number;price:number;title:string;sellerType:string}[] };
  const [quote,setQuote]=useState<Quote|null>(null);
  const [quoteError,setQuoteError]=useState("");
  const [quoteLoading,setQuoteLoading]=useState(true);
  const [quoteRevision,setQuoteRevision]=useState(0);
  const cartKey=JSON.stringify(items.map(item=>({id:item.product.id,quantity:item.quantity})));
  const [quotedKey,setQuotedKey]=useState("");
  useEffect(()=>{
    const controller=new AbortController();setQuoteLoading(true);setQuoteError("");setQuote(null);
    if(!items.length) { setQuoteLoading(false); return; }
    fetch("/api/stripe/quote-cart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:JSON.parse(cartKey)}),signal:controller.signal})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not calculate fees.");return data;})
      .then(data=>{setQuote(data);setQuotedKey(cartKey);})
      .catch(err=>{if(err.name!=="AbortError")setQuoteError(err.message);})
      .finally(()=>{if(!controller.signal.aborted)setQuoteLoading(false);});
    return ()=>controller.abort();
  },[cartKey,quoteRevision]);
  const subtotal=quote?.subtotal??0;
  const delivery=quote?.delivery??0;
  const buyerProtectionFee=quote?.buyerProtectionFee??0;
  const total=quote?.total??0;
  const promoDiscount=0,creditsApplied=0;
  const appliedPromo=null as {label:string;source:string}|null;
  const userCredits=user?.balance??0;

  // Detect return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    setConfirming(true);
    // Clean the URL without reloading
    window.history.replaceState({}, "", "/checkout");

    fetch("/api/stripe/confirm-cart-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the credit balance once the order is placed and the signed-in user has loaded
  useEffect(() => {
    if (placed && user?.email) refreshBalance();
  }, [placed, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const email = user?.email ?? guestEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setCheckoutError("Please enter a valid email address to continue.");
      return;
    }
    if(!quote || quoteLoading || quotedKey!==cartKey) {setCheckoutError("Wait for your fee breakdown before paying.");return;}
    setCheckoutError(null);
    setCheckoutLoading(true);
    setStep("redirecting");

    try {
      const res = await fetch("/api/stripe/checkout-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: user?.name,
          items: items.map((i) => ({
            id: i.product.id,
            title: i.product.title,
            price: i.product.price,
            quantity: i.quantity,
            currency: i.product.currency ?? "GBP",
            priceGbp: i.product.priceGbp,
          })),
          expectedTotal:total,
          creditsApplied:0,
          deliveryGbp: delivery,
        }),
      });
      const data = await res.json() as { url?: string; freeOrder?: boolean; error?: string };


      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if(res.status===409)setQuoteRevision(value=>value+1);
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
                        <span className="font-bold text-gray-900 text-sm">{formatPrice((quote?.items.find(row=>row.id===item.product.id)?.price ?? item.product.priceGbp ?? item.product.price) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
                  Personal sellers pay no selling fee. Buyer Protection is added only to personal-seller items, with one fixed fee per checkout. Business purchases include protection with no extra buyer fee.
                </div>
                {quoteLoading && <p role="status" className="mt-4 text-sm text-muted-foreground">Calculating your checkout fees…</p>}
                {quoteError && <div role="alert" className="mt-4 text-sm text-red-600">{quoteError}<button onClick={()=>setQuoteRevision(v=>v+1)} className="ml-3 underline font-bold">Retry fee calculation</button></div>}
                {!user && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email for your receipt</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                      data-testid="input-guest-email"
                    />
                  </div>
                )}

                <button
                  onClick={handleContinueToPayment}
                  disabled={checkoutLoading || quoteLoading || !quote || quotedKey!==cartKey}
                  className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#D97706] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  data-testid="button-continue-payment"
                >
                  {checkoutLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</>
                    : <><Lock className="w-4 h-4" /> Pay {formatPrice(total)} with Stripe <ChevronRight className="w-4 h-4" /></>
                  }
                </button>

                {!user && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    <Link href="/sign-in" className="text-[#4A5CE8] underline">Sign in</Link> to track your orders
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
                  <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {promoCode}</span>
                    <span className="font-semibold">−{formatPrice(promoDiscount)}</span>
                  </div>
                )}
                {useCredits && creditsApplied > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {Math.round(creditsApplied * 100).toLocaleString()} credits</span>
                    <span className="font-semibold">−{formatPrice(creditsApplied)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">Buyer Protection <Link href="/buyer-protection" className="text-[#4A5CE8] underline text-xs">Learn more</Link></span>
                  <span className="font-semibold text-gray-900">{quoteLoading ? "Calculating…" : !quote ? "Unavailable" : buyerProtectionFee>0 ? formatPrice(buyerProtectionFee) : "Included"}</span>
                </div>
                <p className="text-xs text-gray-500">{quote?.privateSubtotal ? `${quote.protectionPercent}% of personal-seller items + ${formatPrice(quote.fixedProtection)} once per checkout.` : "Protection is included on business-seller purchases."}</p>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className={`font-semibold ${delivery === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                    {delivery === 0 ? "FREE" : formatPrice(delivery)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-3 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {(promoDiscount > 0 || creditsApplied > 0) && (
                <div className="mt-3 bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  You're saving {formatPrice(promoDiscount + creditsApplied)} on this order!
                </div>
              )}

              <div className="mt-4 space-y-2">
                {[
                  { icon: Shield,  text: "Buyer Protection on eligible orders" },
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
