import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronLeft,
  ShieldCheck, Palette, Zap, ArrowRight, ExternalLink,
} from "lucide-react";

interface Check {
  ok: boolean;
  label: string;
  hint: string;
}
interface StatusResponse {
  checks: Record<string, Check>;
  setupComplete: boolean;
}

const STEPS = ["Welcome", "Branding", "System Check", "Done"];

const DEFAULTS = {
  site_name: "Bazunk",
  site_tagline: "Buy and sell anything, locally.",
  hero_title: "Buy & Sell Anything, Locally",
  hero_subtitle: "Join thousands of buyers and sellers in your area. List items in minutes, find great deals every day.",
  primary_color: "#F26B21",
  secondary_color: "#4A5CE8",
};

export function SetupWizardPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [branding, setBranding] = useState(DEFAULTS);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step === 2) fetchStatus();
  }, [step]);

  async function fetchStatus() {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/setup/status");
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoadingStatus(false);
    }
  }

  async function finish() {
    setSaving(true);
    try {
      await fetch("/api/setup/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      setDone(true);
      setStep(3);
    } finally {
      setSaving(false);
    }
  }

  const allOk = status ? Object.values(status.checks).every(c => c.ok) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1D2E] via-[#1e2240] to-[#1A1D2E] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-2">
            <img src="/bazunk-logo.png" alt="Bazunk" className="h-12 w-auto object-contain rounded-lg bg-white px-3 py-1.5" />
          </div>
          <p className="text-gray-400 text-sm">Installation Wizard</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                i === step ? "bg-[#F26B21] text-white" :
                i < step  ? "bg-white/10 text-emerald-400" :
                             "bg-white/5 text-gray-600"
              }`}>
                {i < step && <CheckCircle className="w-3.5 h-3.5" />}
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10 mx-1" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur">

          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#F26B21]/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#F26B21]" />
                </div>
                <div>
                  <h1 className="text-white font-black text-xl">Welcome to Bazunk</h1>
                  <p className="text-gray-400 text-sm">Let's get your marketplace ready in 2 minutes</p>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                This wizard will walk you through setting up your marketplace. Before you start, make sure you have:
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { icon: "🗄️", title: "PostgreSQL Database", desc: "Set the DATABASE_URL environment variable" },
                  { icon: "💳", title: "Stripe Account", desc: "Connect via the Stripe integration for payments" },
                  { icon: "🔐", title: "Admin Password", desc: "Set ADMIN_PASSWORD to secure your admin panel" },
                  { icon: "🔑", title: "Session Secret", desc: "Set SESSION_SECRET to a long random string" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 bg-white/5 rounded-xl p-4">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 rounded-xl bg-[#F26B21] hover:bg-[#e05c15] text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Start Setup <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 1 — Branding */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#4A5CE8]/20 flex items-center justify-center">
                  <Palette className="w-6 h-6 text-[#4A5CE8]" />
                </div>
                <div>
                  <h1 className="text-white font-black text-xl">Site Branding</h1>
                  <p className="text-gray-400 text-sm">Customise your marketplace identity</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: "site_name" as const, label: "Site Name", placeholder: "Bazunk" },
                  { key: "site_tagline" as const, label: "Tagline", placeholder: "Buy and sell anything, locally." },
                  { key: "hero_title" as const, label: "Homepage Hero Title", placeholder: "Buy & Sell Anything, Locally" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={branding[key]}
                      onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/40 focus:border-[#4A5CE8]/50"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Hero Subtitle</label>
                  <textarea
                    value={branding.hero_subtitle}
                    onChange={e => setBranding(p => ({ ...p, hero_subtitle: e.target.value }))}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/40 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "primary_color" as const, label: "Primary Colour" },
                    { key: "secondary_color" as const, label: "Secondary Colour" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-gray-300 mb-1.5">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={branding[key]}
                          onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={branding[key]}
                          onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl bg-[#4A5CE8] hover:bg-[#3B4FD8] text-white font-bold flex items-center justify-center gap-2 text-sm transition-colors">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — System Check */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-white font-black text-xl">System Check</h1>
                  <p className="text-gray-400 text-sm">Verifying your configuration</p>
                </div>
              </div>

              {loadingStatus ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse h-16" />
                  ))}
                </div>
              ) : status ? (
                <div className="space-y-3 mb-6">
                  {Object.entries(status.checks).map(([key, check]) => (
                    <div key={key} className={`flex items-start gap-3 rounded-xl p-4 ${
                      check.ok ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                    }`}>
                      {check.ok
                        ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        : key === "adminPassword"
                          ? <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                          : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      }
                      <div>
                        <p className={`font-semibold text-sm ${check.ok ? "text-emerald-300" : "text-red-300"}`}>
                          {check.label}
                        </p>
                        {!check.ok && <p className="text-xs text-gray-400 mt-0.5">{check.hint}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-red-400 text-sm mb-6">Could not load status. Check the API server is running.</p>
              )}

              {!allOk && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <p className="text-amber-300 text-sm font-semibold mb-1">Some checks failed</p>
                  <p className="text-gray-400 text-xs">
                    Set the missing environment variables and click "Re-check" before continuing.
                    You can still complete setup but some features won't work until these are fixed.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={fetchStatus} disabled={loadingStatus}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm transition-colors disabled:opacity-40">
                  Re-check
                </button>
                <button onClick={finish} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#F26B21] hover:bg-[#e05c15] text-white font-bold flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Complete Setup"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Done */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-white font-black text-2xl mb-2">You're all set!</h1>
              <p className="text-gray-400 text-sm mb-8">
                Your marketplace is configured and ready to go.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setLocation("/admin/dashboard")}
                  className="w-full py-3.5 rounded-xl bg-[#F26B21] hover:bg-[#e05c15] text-white font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" /> Go to Admin Panel
                </button>
                <button
                  onClick={() => setLocation("/")}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> View Live Site
                </button>
              </div>

              <div className="mt-8 p-4 bg-white/5 rounded-xl text-left">
                <p className="text-gray-300 text-xs font-semibold mb-2">⚡ Quick tips for your buyers:</p>
                <ul className="text-gray-400 text-xs space-y-1.5">
                  <li>• Change your admin password via <code className="text-gray-300">ADMIN_PASSWORD</code> env var</li>
                  <li>• Update branding anytime from <strong className="text-gray-300">Admin → Settings</strong></li>
                  <li>• Monitor revenue and users from the Admin Dashboard</li>
                  <li>• Setup wizard is accessible again at <code className="text-gray-300">/setup</code> anytime</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
