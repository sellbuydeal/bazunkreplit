import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Save, RefreshCw, Check, KeyRound, Eye, EyeOff, Megaphone,
  Paintbrush, Layout, Globe, ShieldAlert, ChevronRight, Percent,
  Info,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface Settings {
  site_name: string;
  site_tagline: string;
  primary_color: string;
  secondary_color: string;
  maintenance_mode: string;
  // Hero
  hero_title: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  // Announcement
  announcement_enabled: string;
  announcement_text: string;
  announcement_color: string;
  // Sections
  features_title: string;
  features_subtitle: string;
  categories_title: string;
  categories_subtitle: string;
  // Footer
  footer_about: string;
  footer_facebook: string;
  footer_twitter: string;
  footer_instagram: string;
  footer_youtube: string;
  footer_copyright: string;
  // Contact & SEO
  contact_email: string;
  contact_phone: string;
  seo_title: string;
  seo_description: string;
  _admin_email?: string;
}

const DEFAULTS: Settings = {
  site_name: "Bazunk",
  site_tagline: "Buy and sell anything, locally.",
  primary_color: "#F26B21",
  secondary_color: "#4A5CE8",
  maintenance_mode: "false",
  hero_title: "Buy, Make an Offer & List for Free!",
  hero_subtitle: "The smarter way to buy and sell — fixed prices, open offers, and free listings. Find great deals or start earning today.",
  hero_cta_primary: "Start Shopping",
  hero_cta_secondary: "Become a Seller",
  announcement_enabled: "false",
  announcement_text: "🎉 Welcome to Bazunk — buy and sell anything locally!",
  announcement_color: "#F26B21",
  features_title: "Why Bazunk?",
  features_subtitle: "A marketplace built around trust — secure payments, real reviews, and support when you need it",
  categories_title: "Shop by Category",
  categories_subtitle: "Find exactly what you're looking for in our organised categories",
  footer_about: "Buy, Sell, and Save More — The Feature-Packed Marketplace with Low Fees, Big Deals, and Endless Possibilities.",
  footer_facebook: "",
  footer_twitter: "",
  footer_instagram: "",
  footer_youtube: "",
  footer_copyright: "Bazunk Marketplace",
  contact_email: "support@bazunk.com",
  contact_phone: "",
  seo_title: "Bazunk - Buy & Sell Anything Locally",
  seo_description: "The smarter way to buy and sell locally. Free listings, secure checkout, real reviews.",
};

type Tab = "branding" | "homepage" | "footer" | "access" | "advertising" | "fees";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "branding", label: "Branding & SEO", icon: Paintbrush },
  { id: "homepage", label: "Homepage", icon: Layout },
  { id: "footer", label: "Footer & Contact", icon: Globe },
  { id: "advertising", label: "Advertising", icon: Megaphone },
  { id: "fees", label: "Fees", icon: Percent },
  { id: "access", label: "Access", icon: ShieldAlert },
];

const FEE_CATEGORIES: { name: string; slug: string; defaultRate: string }[] = [
  { name: "Electronics", slug: "electronics", defaultRate: "5" },
  { name: "Phones & Tablets", slug: "cell-phones", defaultRate: "5" },
  { name: "Fashion, Clothing & Jewellery", slug: "clothing-shoes-jewelry", defaultRate: "5" },
  { name: "Automotive", slug: "automotive", defaultRate: "5" },
  { name: "Home & Garden", slug: "home-garden", defaultRate: "5" },
  { name: "Sports & Outdoors", slug: "sports-outdoors", defaultRate: "5" },
  { name: "Toys & Games", slug: "toys-games", defaultRate: "5" },
  { name: "Books", slug: "books", defaultRate: "5" },
  { name: "CDs, Vinyl & Music", slug: "cds-vinyl", defaultRate: "5" },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", defaultRate: "5" },
  { name: "Baby Products", slug: "baby-products", defaultRate: "5" },
  { name: "Health & Household", slug: "health-household", defaultRate: "5" },
  { name: "Arts, Crafts & Sewing", slug: "arts-crafts-sewing", defaultRate: "5" },
  { name: "Appliances", slug: "appliances", defaultRate: "5" },
  { name: "Eco-Friendly", slug: "eco-friendly", defaultRate: "5" },
];

const AD_SLOTS = [
  { key: "home_bottom",   label: "Home Page — Bottom Banner",   desc: "Leaderboard (728×90) between the features section and footer" },
  { key: "browse_top",    label: "Browse Page — Top Strip",     desc: "Compact text strip below the search bar (text ads only)" },
  { key: "browse_bottom", label: "Browse Page — Bottom Banner", desc: "Leaderboard (728×90) below listings, above footer" },
  { key: "auctions_mid",   label: "Auctions — Mid Banner",        desc: "Leaderboard (728×90) between the hero and auction filters" },
  { key: "flash_sales_mid",label: "Flash Sales — Mid Banner",    desc: "Leaderboard (728×90) between the hero and sale type filters" },
  { key: "categories_top", label: "Categories — Top Banner",     desc: "Leaderboard (728×90) below the category header, above the grid" },
  { key: "classifieds_mid",label: "Classifieds — Mid Banner",    desc: "Leaderboard (728×90) between the hero and search filters" },
  { key: "support_mid",    label: "Support — Mid Banner",        desc: "Leaderboard (728×90) between the hero and FAQ tabs" },
] as const;

export function AdminSettingsPage() {
  const { isAdmin, authFetch, logout } = useAdmin();
  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("branding");

  const [newEmail, setNewEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const defaultFeeRates = Object.fromEntries(
    FEE_CATEGORIES.map(c => [`fee_rate_${c.slug}`, c.defaultRate])
  );
  const [feeRates, setFeeRates] = useState<Record<string, string>>({ ...defaultFeeRates, fee_rate_default: "5", fee_listing_free: "true" });
  const [feesSaving, setFeesSaving] = useState(false);
  const [feesSaved, setFeesSaved] = useState(false);
  const [feesError, setFeesError] = useState<string | null>(null);

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/settings");
      if (res.ok) {
        const d = await res.json();
        setSettings({ ...DEFAULTS, ...d });
        const loaded: Record<string, string> = { ...defaultFeeRates, fee_rate_default: "5", fee_listing_free: "true" };
        Object.entries(d as Record<string, string>).forEach(([k, v]) => {
          if (k.startsWith("fee_")) loaded[k] = v;
        });
        setFeeRates(loaded);
      }
    } finally { setLoading(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  async function saveFeeRates(e: React.FormEvent) {
    e.preventDefault();
    setFeesSaving(true);
    setFeesError(null);
    try {
      const res = await authFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(feeRates) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFeesError((body as any).error ?? `Save failed (${res.status})`);
        return;
      }
      await load();
      setFeesSaved(true);
      setTimeout(() => setFeesSaved(false), 2500);
    } catch {
      setFeesError("Network error — please try again.");
    } finally { setFeesSaving(false); }
  }

  function setFeeRate(key: string, value: string) {
    setFeeRates(prev => ({ ...prev, [key]: value }));
  }

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    setCredMsg(null);
    if (newPw && newPw !== confirmPw) {
      setCredMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (!newEmail && !newPw) {
      setCredMsg({ type: "err", text: "Enter a new email or new password (or both)." });
      return;
    }
    setCredSaving(true);
    try {
      const res = await authFetch("/api/admin/credentials", {
        method: "PATCH",
        body: JSON.stringify({ email: newEmail || undefined, currentPassword: currentPw, newPassword: newPw || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setCredMsg({ type: "err", text: data.error ?? "Failed to update credentials." }); return; }
      setCredMsg({ type: "ok", text: "Credentials updated! You will be logged out now." });
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setNewEmail("");
      setTimeout(() => { logout(); setLocation("/admin"); }, 2000);
    } finally { setCredSaving(false); }
  }

  function set(key: keyof Settings, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function Field({ k, label, type = "text", placeholder }: { k: keyof Settings; label: string; type?: "text" | "color" | "textarea" | "url"; placeholder?: string }) {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
        {type === "textarea" ? (
          <textarea value={settings[k] as string} onChange={e => set(k, e.target.value)}
            rows={3} placeholder={placeholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none" />
        ) : type === "color" ? (
          <div className="flex items-center gap-3">
            <input type="color" value={settings[k] as string} onChange={e => set(k, e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0" />
            <input type="text" value={settings[k] as string} onChange={e => set(k, e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
          </div>
        ) : (
          <input type={type === "url" ? "url" : "text"} value={settings[k] as string} onChange={e => set(k, e.target.value)}
            placeholder={placeholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
        )}
      </div>
    );
  }

  function Toggle({ k, label, desc, danger }: { k: keyof Settings; label: string; desc?: string; danger?: boolean }) {
    const on = settings[k] === "true";
    return (
      <label className="flex items-center gap-3 cursor-pointer" onClick={() => set(k, on ? "false" : "true")}>
        <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? (danger ? "bg-red-500" : "bg-emerald-500") : "bg-gray-200"}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{label}</p>
          {desc && <p className="text-xs text-gray-400">{desc}</p>}
        </div>
      </label>
    );
  }

  function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-base">{title}</h2>
        {children}
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900">Site Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Changes apply to the live site immediately after saving</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5 hidden sm:block" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-72" />
      ) : (
        <form onSubmit={save} className="space-y-4">

          {/* ── BRANDING & SEO ── */}
          {tab === "branding" && (
            <>
              <SectionCard title="Site Identity">
                <Field k="site_name" label="Site Name" placeholder="Bazunk" />
                <Field k="site_tagline" label="Tagline" placeholder="Buy and sell anything, locally." />
              </SectionCard>

              <SectionCard title="Brand Colours">
                <div className="grid grid-cols-2 gap-4">
                  <Field k="primary_color" label="Primary (orange)" type="color" />
                  <Field k="secondary_color" label="Secondary (blue)" type="color" />
                </div>
                <div className="flex gap-3 mt-1">
                  <div className="flex-1 h-10 rounded-xl" style={{ background: settings.primary_color }} />
                  <div className="flex-1 h-10 rounded-xl" style={{ background: settings.secondary_color }} />
                </div>
                <p className="text-xs text-gray-400">These colours are used throughout the site for buttons, highlights, and accents.</p>
              </SectionCard>

              <SectionCard title="SEO (Search Engines)">
                <Field k="seo_title" label="Browser / SEO Title" placeholder="Bazunk - Buy & Sell Anything Locally" />
                <Field k="seo_description" label="Meta Description" type="textarea" placeholder="The smarter way to buy and sell locally..." />
                <p className="text-xs text-gray-400">The SEO title appears on browser tabs and in Google search results. Keep the description under 160 characters.</p>
              </SectionCard>
            </>
          )}

          {/* ── HOMEPAGE ── */}
          {tab === "homepage" && (
            <>
              <SectionCard title="Hero Banner">
                <Field k="hero_title" label="Main Headline" placeholder="Buy, Make an Offer & List for Free!" />
                <Field k="hero_subtitle" label="Subheading" type="textarea" placeholder="The smarter way to buy and sell…" />
                <div className="grid grid-cols-2 gap-4">
                  <Field k="hero_cta_primary" label="Primary Button Text" placeholder="Start Shopping" />
                  <Field k="hero_cta_secondary" label="Secondary Button Text" placeholder="Become a Seller" />
                </div>
              </SectionCard>

              <SectionCard title="Announcement Banner">
                <Toggle k="announcement_enabled" label="Show Announcement Banner"
                  desc="Displays a dismissible banner at the very top of every page" />
                <Field k="announcement_text" label="Banner Message" placeholder="🎉 Welcome to Bazunk — buy and sell anything locally!" />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner Colour</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings.announcement_color}
                      onChange={e => set("announcement_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer flex-shrink-0" />
                    <input type="text" value={settings.announcement_color}
                      onChange={e => set("announcement_color", e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                    <div className="h-10 w-32 rounded-xl flex items-center justify-center text-xs font-medium text-white truncate px-3"
                      style={{ backgroundColor: settings.announcement_color }}>
                      Preview
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title='Features Section ("Why...?" heading)'>
                <Field k="features_title" label="Section Heading" placeholder="Why Bazunk?" />
                <Field k="features_subtitle" label="Section Subheading" type="textarea" placeholder="A marketplace built around trust…" />
              </SectionCard>

              <SectionCard title="Categories Section">
                <Field k="categories_title" label="Section Heading" placeholder="Shop by Category" />
                <Field k="categories_subtitle" label="Section Subheading" type="textarea" placeholder="Find exactly what you're looking for…" />
              </SectionCard>
            </>
          )}

          {/* ── FOOTER & CONTACT ── */}
          {tab === "footer" && (
            <>
              <SectionCard title="Footer Brand Text">
                <Field k="footer_about" label="About / Tagline" type="textarea"
                  placeholder="Buy, Sell, and Save More — The Feature-Packed Marketplace with Low Fees, Big Deals, and Endless Possibilities." />
                <Field k="footer_copyright" label="Copyright Name" placeholder="Bazunk Marketplace" />
                <p className="text-xs text-gray-400">Copyright line shows as: © 2025 <em>{settings.footer_copyright || "Bazunk Marketplace"}</em>. All rights reserved.</p>
              </SectionCard>

              <SectionCard title="Social Media Links">
                <p className="text-xs text-gray-400 -mt-1">Enter full URLs (e.g. https://facebook.com/yourpage). Leave blank to hide the icon.</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm font-semibold text-gray-600 flex-shrink-0">Facebook</span>
                    <input type="url" value={settings.footer_facebook} onChange={e => set("footer_facebook", e.target.value)}
                      placeholder="https://facebook.com/yourpage"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm font-semibold text-gray-600 flex-shrink-0">Twitter / X</span>
                    <input type="url" value={settings.footer_twitter} onChange={e => set("footer_twitter", e.target.value)}
                      placeholder="https://twitter.com/yourhandle"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm font-semibold text-gray-600 flex-shrink-0">Instagram</span>
                    <input type="url" value={settings.footer_instagram} onChange={e => set("footer_instagram", e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 text-sm font-semibold text-gray-600 flex-shrink-0">YouTube</span>
                    <input type="url" value={settings.footer_youtube} onChange={e => set("footer_youtube", e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Contact Information">
                <p className="text-xs text-gray-400 -mt-1">Shown on the support / contact page.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field k="contact_email" label="Support Email" placeholder="support@bazunk.com" />
                  <Field k="contact_phone" label="Phone Number" placeholder="+44 …" />
                </div>
              </SectionCard>
            </>
          )}

          {/* ── ADVERTISING ── */}
          {tab === "advertising" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-sm text-blue-700 flex items-start gap-2">
                <Megaphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold">Ad placements</p>
                  <p className="text-xs text-blue-500 mt-0.5">Toggle each slot on to make it visible. Choose <strong>AdSense</strong> to paste Google AdSense code, or <strong>Text Ad</strong> for a built-in styled banner (no third-party script needed).</p>
                </div>
              </div>

              {AD_SLOTS.map((slot) => {
                const s = settings as unknown as Record<string, string>;
                const enabled = s[`ad_${slot.key}_enabled`] === "true";
                const type = s[`ad_${slot.key}_type`] || "text";
                const setKey = (suffix: string, value: string) =>
                  setSettings((prev) => ({ ...prev, [`ad_${slot.key}_${suffix}`]: value } as Settings));

                return (
                  <div key={slot.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{slot.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{slot.desc}</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => setKey("enabled", enabled ? "false" : "true")}>
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-200"}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{enabled ? "On" : "Off"}</span>
                      </label>
                    </div>

                    {enabled && (
                      <>
                        {/* Type selector */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Type</label>
                          <div className="flex gap-2">
                            {([
                              { value: "text",    label: "Text Ad" },
                              { value: "adsense", label: "Google AdSense" },
                              { value: "custom",  label: "Custom HTML" },
                            ] as const).map(({ value: t, label }) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setKey("type", t)}
                                className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                                  type === t
                                    ? "bg-[#4A5CE8] text-white border-[#4A5CE8]"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[#4A5CE8]"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {type === "adsense" ? (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">AdSense Code</label>
                            <textarea
                              rows={5}
                              value={s[`ad_${slot.key}_code`] || ""}
                              onChange={(e) => setKey("code", e.target.value)}
                              placeholder={"<script async src=\"https://pagead2.googlesyndication.com/...\">\n</script>\n<ins class=\"adsbygoogle\" ...></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>"}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">Paste the full AdSense ad unit code from your Google AdSense account.</p>
                          </div>
                        ) : type === "custom" ? (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Custom HTML</label>
                            <textarea
                              rows={6}
                              value={s[`ad_${slot.key}_custom_html`] || ""}
                              onChange={(e) => setKey("custom_html", e.target.value)}
                              placeholder={"<!-- Any HTML — image banners, iframes, third-party ad scripts -->\n<a href=\"https://example.com\" target=\"_blank\">\n  <img src=\"https://example.com/banner.jpg\" width=\"728\" height=\"90\" alt=\"Ad\" />\n</a>"}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">Paste any HTML — image tags, iframes, third-party ad network scripts, or your own custom markup.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Headline</label>
                              <input
                                type="text"
                                value={s[`ad_${slot.key}_text_title`] || ""}
                                onChange={(e) => setKey("text_title", e.target.value)}
                                placeholder="Special offer — 20% off today"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Body Text</label>
                              <input
                                type="text"
                                value={s[`ad_${slot.key}_text_body`] || ""}
                                onChange={(e) => setKey("text_body", e.target.value)}
                                placeholder="Shop now and save on thousands of items"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Destination URL</label>
                                <input
                                  type="url"
                                  value={s[`ad_${slot.key}_text_url`] || ""}
                                  onChange={(e) => setKey("text_url", e.target.value)}
                                  placeholder="https://example.com"
                                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Button Label</label>
                                <input
                                  type="text"
                                  value={s[`ad_${slot.key}_text_cta`] || ""}
                                  onChange={(e) => setKey("text_cta", e.target.value)}
                                  placeholder="Learn More"
                                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── FEES ── */}
          {tab === "fees" && (
            <form onSubmit={saveFeeRates} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-sm text-blue-700 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold">Platform (Final Value) Fees</p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    Fees are charged on the final sale price when a transaction completes. Listings are <strong>free to post</strong>.
                    The fee is deducted from the seller's payout automatically. Any category without a specific rate uses the default rate.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Default Rate (all unlisted categories)</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Applied when a listing's category has no specific rate set below</p>
                </div>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-3 max-w-xs">
                    <input
                      type="number" min="0" max="30" step="0.5"
                      value={feeRates["fee_rate_default"] ?? "5"}
                      onChange={e => setFeeRate("fee_rate_default", e.target.value)}
                      className="w-28 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    />
                    <span className="text-sm font-semibold text-gray-500">% of final sale price</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Per-Category Rates</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Override the default rate for specific categories. These rates are shown to sellers in their dashboard.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-48">Fee Rate</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">Example (£100 sale)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEE_CATEGORIES.map((cat, i) => {
                        const rate = parseFloat(feeRates[`fee_rate_${cat.slug}`] ?? cat.defaultRate) || 0;
                        return (
                          <tr key={cat.slug} className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                            <td className="px-6 py-3 font-medium text-gray-800">{cat.name}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min="0" max="30" step="0.5"
                                  value={feeRates[`fee_rate_${cat.slug}`] ?? cat.defaultRate}
                                  onChange={e => setFeeRate(`fee_rate_${cat.slug}`, e.target.value)}
                                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                                />
                                <span className="text-gray-400 text-sm">%</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-gray-500 text-xs font-mono">
                              £{rate.toFixed(2)} fee · £{(100 - rate).toFixed(2)} to seller
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={feesSaving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4A5CE8] hover:bg-[#3B4FD8] text-white font-bold text-sm transition-colors disabled:opacity-50">
                    {feesSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {feesSaving ? "Saving…" : feesSaved ? "Saved!" : "Save Fee Rates"}
                  </button>
                  {feesSaved && (
                    <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" /> Rates updated — visible to sellers now
                    </span>
                  )}
                </div>
                {feesError && (
                  <p className="text-sm text-red-600 font-medium">{feesError}</p>
                )}
              </div>
            </form>
          )}

          {/* ── ACCESS ── */}
          {tab === "access" && (
            <>
              <SectionCard title="Maintenance Mode">
                <Toggle k="maintenance_mode" label="Maintenance Mode" danger
                  desc="When enabled, visitors see a maintenance page instead of the site. Admins can still log in." />
                {settings.maintenance_mode === "true" && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mt-1">
                    <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-medium">Your site is currently in maintenance mode and is not accessible to visitors.</p>
                  </div>
                )}
              </SectionCard>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="w-4 h-4 text-gray-500" />
                  <h2 className="font-bold text-gray-900">Admin Login Credentials</h2>
                </div>
                <p className="text-xs text-gray-400 mb-5">
                  Current login: <span className="font-mono text-gray-600">{settings._admin_email ?? "—"}</span>
                  &nbsp;· After changing, you will be automatically logged out.
                </p>
                <form onSubmit={saveCredentials} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Email Address <span className="font-normal text-gray-400">(leave blank to keep current)</span></label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      placeholder={settings._admin_email ?? "admin@example.com"} autoComplete="off"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password <span className="font-normal text-gray-400">(leave blank to keep current)</span></label>
                      <div className="relative">
                        <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                          placeholder="New password" autoComplete="new-password"
                          className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                      <input type={showPw ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                        placeholder="Confirm password" autoComplete="new-password"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Password <span className="text-red-500">*</span></label>
                    <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                      placeholder="Required to confirm changes" required autoComplete="current-password"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30" />
                  </div>
                  {credMsg && (
                    <p className={`text-sm px-3 py-2 rounded-lg ${credMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                      {credMsg.text}
                    </p>
                  )}
                  <button type="submit" disabled={credSaving || !currentPw}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-bold text-sm transition-colors disabled:opacity-40">
                    <KeyRound className="w-4 h-4" />
                    {credSaving ? "Saving…" : "Update Credentials"}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Save button — not shown on access/fees tabs (each has its own form) */}
          {tab !== "access" && tab !== "fees" && (
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4A5CE8] hover:bg-[#3B4FD8] text-white font-bold text-sm transition-colors disabled:opacity-50">
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
              </button>
              {saved && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> Live on site now
                </span>
              )}
            </div>
          )}
        </form>
      )}
    </AdminLayout>
  );
}
