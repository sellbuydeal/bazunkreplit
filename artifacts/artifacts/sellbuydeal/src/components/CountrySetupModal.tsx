import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, CheckCircle2, X } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { countryToCurrency } from "@/context/CurrencyContext";

export const COUNTRY_STORAGE_KEY = (email: string) => `sbd_country_v1_${email}`;

const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "US", name: "United States",      flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom",     flag: "🇬🇧" },
  { code: "AU", name: "Australia",          flag: "🇦🇺" },
  { code: "CA", name: "Canada",             flag: "🇨🇦" },
  { code: "IE", name: "Ireland",            flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand",        flag: "🇳🇿" },
  { code: "DE", name: "Germany",            flag: "🇩🇪" },
  { code: "FR", name: "France",             flag: "🇫🇷" },
  { code: "IT", name: "Italy",              flag: "🇮🇹" },
  { code: "ES", name: "Spain",              flag: "🇪🇸" },
  { code: "NL", name: "Netherlands",        flag: "🇳🇱" },
  { code: "BE", name: "Belgium",            flag: "🇧🇪" },
  { code: "PT", name: "Portugal",           flag: "🇵🇹" },
  { code: "AT", name: "Austria",            flag: "🇦🇹" },
  { code: "CH", name: "Switzerland",        flag: "🇨🇭" },
  { code: "SE", name: "Sweden",             flag: "🇸🇪" },
  { code: "NO", name: "Norway",             flag: "🇳🇴" },
  { code: "DK", name: "Denmark",            flag: "🇩🇰" },
  { code: "FI", name: "Finland",            flag: "🇫🇮" },
  { code: "JP", name: "Japan",              flag: "🇯🇵" },
  { code: "IN", name: "India",              flag: "🇮🇳" },
  { code: "SG", name: "Singapore",          flag: "🇸🇬" },
  { code: "AE", name: "UAE",                flag: "🇦🇪" },
  { code: "ZA", name: "South Africa",       flag: "🇿🇦" },
  { code: "BR", name: "Brazil",             flag: "🇧🇷" },
  { code: "MX", name: "Mexico",             flag: "🇲🇽" },
  { code: "OTHER", name: "Other",           flag: "🌍" },
];

interface CountrySetupModalProps {
  email: string;
  onDone: () => void;
}

export function CountrySetupModal({ email, onDone }: CountrySetupModalProps) {
  const { setCurrency } = useCurrency();
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCountry = COUNTRIES.find((c) => c.code === selected);

  function handleSave() {
    if (!selected) return;
    try {
      localStorage.setItem(COUNTRY_STORAGE_KEY(email), selected);
    } catch {}
    const currency = countryToCurrency(selected);
    setCurrency(currency);
    try {
      localStorage.setItem("sbd_currency", currency);
    } catch {}
    onDone();
  }

  function handleSkip() {
    try {
      localStorage.setItem(COUNTRY_STORAGE_KEY(email), "SKIP");
    } catch {}
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#F26B21] to-[#D97706] px-6 pt-6 pb-5 text-white">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-black">Where are you based?</h2>
          <p className="text-sm text-orange-100 mt-1">
            This sets your default listing currency and how fees are calculated.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Country dropdown */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Your country <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm text-left hover:border-[#F26B21] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30"
            >
              {selectedCountry ? (
                <>
                  <span className="text-xl leading-none">{selectedCountry.flag}</span>
                  <span className="flex-1 font-medium text-gray-800">{selectedCountry.name}</span>
                </>
              ) : (
                <span className="flex-1 text-gray-400">Select your country…</span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-xl border border-gray-100 shadow-xl z-10 overflow-hidden"
                >
                  <div className="p-2 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search countries…"
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 border border-gray-200"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {filtered.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setSelected(c.code); setOpen(false); setSearch(""); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                          selected === c.code
                            ? "bg-[#F26B21]/8 text-[#F26B21] font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-base w-6 text-center leading-none">{c.flag}</span>
                        <span className="flex-1">{c.name}</span>
                        {selected === c.code && <CheckCircle2 className="w-3.5 h-3.5 text-[#F26B21] flex-shrink-0" />}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No countries found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Currency preview */}
          {selectedCountry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Your listings and fees will use{" "}
                <strong>{countryToCurrency(selected === "OTHER" ? "US" : selected)}</strong>{" "}
                — you can still change currency anytime from the top bar.
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!selected}
              className="w-full py-3 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#D97706] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Save & Continue
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip for now (you can set this in your profile later)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
