import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Coins, Sprout, ShoppingBag, Flame, Rocket, Building2,
  Tag, Bell, Star, Home, Gift, ShieldCheck, PlusCircle, Check, Loader2,
  Zap, Info,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

// 100 credits = £1
const CREDITS_PER_GBP = 100;

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;      // GBP
  bonusGbp: number;   // GBP bonus
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { id: "starter",  name: "Starter",  description: "Great for trying out promotions",         price: 5,   bonusGbp: 0,    icon: Sprout,    iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
  { id: "basic",    name: "Basic",    description: "Perfect for occasional sellers",           price: 10,  bonusGbp: 0.5,  icon: ShoppingBag, iconBg: "bg-blue-50",   iconColor: "text-blue-500" },
  { id: "popular",  name: "Popular",  description: "Best value for active sellers",            price: 25,  bonusGbp: 2.5,  icon: Flame,     iconBg: "bg-orange-50", iconColor: "text-[#F26B21]", popular: true },
  { id: "pro",      name: "Pro",      description: "For power sellers who want maximum reach", price: 50,  bonusGbp: 7.5,  icon: Rocket,    iconBg: "bg-purple-50", iconColor: "text-purple-500" },
  { id: "business", name: "Business", description: "Ideal for high-volume stores",            price: 100, bonusGbp: 20,   icon: Building2, iconBg: "bg-red-50",    iconColor: "text-red-500" },
];

function gbpToCredits(gbp: number) { return Math.round(gbp * CREDITS_PER_GBP); }
function fmtCredits(n: number) { return n.toLocaleString(); }

const FEATURES = [
  { icon: Tag,  iconBg: "bg-blue-50",   iconColor: "text-blue-500",   title: "Pay Listing Fees",    description: "Use credits instead of cash for listing fees", rate: "100 credits = £1 fee" },
  { icon: Bell, iconBg: "bg-purple-50", iconColor: "text-purple-500", title: "Boost Listings",      description: "Get visibility boosts for your listings", rate: "500 credits = 3-day boost" },
  { icon: Star, iconBg: "bg-amber-50",  iconColor: "text-amber-500",  title: "Featured Badge",      description: "Stand out with a featured badge on your listings", rate: "300 credits = featured badge" },
  { icon: Home, iconBg: "bg-emerald-50",iconColor: "text-emerald-500",title: "Homepage Spotlight",  description: "Get featured on the Bazunk homepage", rate: "1,000 credits = 24hr spotlight" },
];

export function CreditsPage() {
  const { user, refreshBalance } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");

  const [selectedId, setSelectedId] = useState<string>("popular");
  const [customAmt, setCustomAmt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(0);

  const selectedPkg = PACKAGES.find((p) => p.id === selectedId) ?? null;
  const customPrice = parseFloat(customAmt) || 0;
  const isCustom = selectedId === "custom";
  const basePrice = isCustom ? customPrice : (selectedPkg?.price ?? 0);
  const bonusGbp = isCustom
    ? customPrice >= 100 ? customPrice * 0.2
      : customPrice >= 50 ? customPrice * 0.15
      : customPrice >= 25 ? customPrice * 0.1
      : customPrice >= 10 ? customPrice * 0.05
      : 0
    : (selectedPkg?.bonusGbp ?? 0);
  const totalGbp = basePrice + bonusGbp;
  const baseCredits = gbpToCredits(basePrice);
  const bonusCredits = gbpToCredits(bonusGbp);
  const totalCredits = gbpToCredits(totalGbp);
  const displayName = isCustom ? "Custom Package" : (selectedPkg?.name ?? "") + " Package";

  useEffect(() => {
    if (!sessionId || !user?.email) return;
    async function applyCredits() {
      setLoading(true);
      try {
        const res = await fetch("/api/stripe/apply-credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, email: user!.email }),
        });
        const data = await res.json();
        if (data.success) {
          const gbpAdded = data.creditsAdded ?? 0;
          setCreditsAdded(gbpToCredits(gbpAdded));
          setSuccess(true);
          await refreshBalance();
          setTimeout(() => setLocation("/dashboard"), 3000);
        } else {
          setError(data.error ?? "Payment verification failed");
        }
      } catch {
        setError("Unable to verify payment. Please contact support.");
      } finally {
        setLoading(false);
      }
    }
    applyCredits();
  }, [sessionId, user?.email]);

  async function handleBuy() {
    if (basePrice <= 0) return;
    if (!user) { setLocation("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { email: user.email, name: user.name };
      if (isCustom) {
        body.customAmount = basePrice;
      } else {
        body.packageId = selectedId;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to start checkout");
        setLoading(false);
      }
    } catch {
      setError("Unable to connect to payment server. Please try again.");
      setLoading(false);
    }
  }

  if (sessionId && loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#4A5CE8] animate-spin mx-auto mb-4" />
            <p className="font-semibold text-gray-700">Confirming your payment…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        <Link href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium mb-5 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="rounded-2xl bg-gradient-to-r from-[#3B4FD8] to-[#4A5CE8] px-7 py-8 mb-6 flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Buy Marketplace Credits</h1>
            <p className="text-blue-200 text-sm md:text-base max-w-md">
              Use credits to pay listing fees, boost visibility, and unlock promotions.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
              <Coins className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-white text-xs font-bold">100 credits = £1</span>
            </div>
          </div>
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 relative z-10">
            <Coins className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full bg-white/5" />
        </div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-emerald-700">Payment successful! 🎉</p>
                <p className="text-sm text-emerald-600">
                  {fmtCredits(creditsAdded)} credits have been added to your account. Redirecting to dashboard…
                </p>
              </div>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4"
            >
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Choose a Credit Package</h2>
              <p className="text-sm text-gray-400 mb-5">Larger packages include bonus credits. All prices in GBP.</p>

              <div className="space-y-3">
                {PACKAGES.map((pkg) => {
                  const Icon = pkg.icon;
                  const active = selectedId === pkg.id;
                  const pkgCredits = gbpToCredits(pkg.price);
                  const pkgBonus = gbpToCredits(pkg.bonusGbp);
                  return (
                    <motion.button
                      key={pkg.id}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => { setSelectedId(pkg.id); setShowCustom(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all ${
                        active && pkg.popular
                          ? "border-[#F26B21] bg-orange-50/60"
                          : active
                          ? "border-[#4A5CE8] bg-[#4A5CE8]/5"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl ${pkg.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${pkg.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-900 text-sm">{pkg.name}</span>
                          {pkg.popular && (
                            <span className="text-[10px] font-black bg-[#F26B21] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                              Best Value
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{pkg.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-gray-900 text-base">
                          {fmtCredits(pkgCredits + pkgBonus)} <span className="text-xs font-semibold text-gray-400">cr</span>
                        </p>
                        <p className="text-xs text-gray-500 font-medium">£{pkg.price.toFixed(2)}</p>
                        {pkgBonus > 0 && (
                          <p className="text-[10px] font-bold text-emerald-500">+{fmtCredits(pkgBonus)} bonus</p>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-3">
                {!showCustom ? (
                  <button
                    onClick={() => { setShowCustom(true); setSelectedId("custom"); }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#4A5CE8] font-semibold transition-colors py-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Enter a custom amount
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`border-2 rounded-xl p-4 ${selectedId === "custom" ? "border-[#4A5CE8] bg-[#4A5CE8]/5" : "border-gray-200"}`}
                  >
                    <p className="text-sm font-bold text-gray-700 mb-2">Custom Amount</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                      <input
                        type="number" min="1" value={customAmt}
                        onChange={(e) => { setCustomAmt(e.target.value); setSelectedId("custom"); }}
                        placeholder="Enter amount" autoFocus
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                      />
                    </div>
                    {customPrice > 0 && (
                      <p className="text-xs text-[#4A5CE8] font-medium mt-2">
                        = {fmtCredits(baseCredits)} credits
                        {bonusCredits > 0 && ` + ${fmtCredits(bonusCredits)} bonus`}
                      </p>
                    )}
                    <button onClick={() => { setShowCustom(false); setSelectedId("popular"); setCustomAmt(""); }}
                      className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline">
                      Cancel
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 text-lg mb-5">What Can You Do With Credits?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                      <div className={`w-9 h-9 rounded-xl ${f.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${f.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{f.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
                        <p className="text-[10px] font-bold text-[#4A5CE8] mt-1">{f.rate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900">Earn credits for free</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Get credits by completing actions — joining, listing your first item, going live, and running flash sales.
                  Earn up to <strong>500 credits per week</strong> from activity. <Link href="/dashboard" className="underline font-semibold">View challenges →</Link>
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-4">
              <h3 className="font-bold text-gray-900 text-base mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{displayName}</span>
                  <span className="font-semibold text-gray-900">
                    {basePrice > 0 ? `£${basePrice.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Base credits</span>
                  <span className="font-semibold text-gray-700">
                    {baseCredits > 0 ? fmtCredits(baseCredits) : "—"}
                  </span>
                </div>
                {bonusCredits > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-600 font-medium">Bonus Credits</span>
                    <span className="font-bold text-emerald-600">+{fmtCredits(bonusCredits)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total Credits</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-[#4A5CE8]">
                      {totalCredits > 0 ? fmtCredits(totalCredits) : "—"}
                    </span>
                    {totalCredits > 0 && (
                      <p className="text-[10px] text-gray-400">≈ £{(totalCredits / 100).toFixed(2)} value</p>
                    )}
                  </div>
                </div>
              </div>

              {bonusCredits > 0 && (
                <motion.div
                  key={bonusCredits} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-4"
                >
                  <Gift className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 font-medium">
                    You get {fmtCredits(bonusCredits)} bonus credits free with this package!
                  </p>
                </motion.div>
              )}

              <button
                onClick={handleBuy}
                disabled={basePrice <= 0 || loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#e05c15] text-white font-black text-base shadow-md hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                ) : (
                  <><Coins className="w-5 h-5" />{basePrice > 0 ? `Buy ${fmtCredits(totalCredits)} Credits — £${basePrice.toFixed(2)}` : "Buy Credits"}</>
                )}
              </button>

              <div className="flex items-start gap-2 mt-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">
                  Secure payment via Stripe. Credits added instantly after payment. 100 credits = £1.
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs text-gray-500 font-medium">Credits never expire</p>
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
