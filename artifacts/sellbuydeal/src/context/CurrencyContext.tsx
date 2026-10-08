import { createContext, useContext, useState, useEffect } from "react";

export type CurrencyCode = "GBP" | "USD" | "EUR" | "AUD" | "CAD" | "NZD" | "CHF";

export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD", CH: "CHF",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", PT: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", SK: "EUR", SI: "EUR", LT: "EUR", LV: "EUR",
  EE: "EUR", CY: "EUR", LU: "EUR", MT: "EUR",
};

export const MARKET_COUNTRIES = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" }, { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" }, { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" }, { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" }, { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" }, { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" }, { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" }, { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "AT", name: "Austria", flag: "🇦🇹" }, { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "GR", name: "Greece", flag: "🇬🇷" }, { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
] as const;

export function countryToCurrency(countryCode: string): CurrencyCode {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] ?? "USD";
}

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rate: number;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  GBP: { code: "GBP", symbol: "£",   name: "British Pound",     flag: "🇬🇧", rate: 1,      decimals: 2 },
  USD: { code: "USD", symbol: "$",   name: "US Dollar",         flag: "🇺🇸", rate: 1.27,   decimals: 2 },
  EUR: { code: "EUR", symbol: "€",   name: "Euro",              flag: "🇪🇺", rate: 1.17,   decimals: 2 },
  AUD: { code: "AUD", symbol: "A$",  name: "Australian Dollar",  flag: "🇦🇺", rate: 1.96,   decimals: 2 },
  CAD: { code: "CAD", symbol: "C$",  name: "Canadian Dollar",    flag: "🇨🇦", rate: 1.73,   decimals: 2 },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", flag: "🇳🇿", rate: 2.11,   decimals: 2 },
  CHF: { code: "CHF", symbol: "Fr",  name: "Swiss Franc",        flag: "🇨🇭", rate: 1.12,   decimals: 2 },
};

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (gbpAmount: number) => string;
  countryCode: string;
  country: { code: string; name: string; flag: string };
  setCountry: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = "sbd_currency";
const COUNTRY_KEY = "sbd_country";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [countryCode, setCountryCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(COUNTRY_KEY);
      if (saved && MARKET_COUNTRIES.some(c => c.code === saved)) return saved;
      const locale = (navigator.language || "").toUpperCase();
      const hit = MARKET_COUNTRIES.find(c => locale.endsWith(`-${c.code}`));
      return hit?.code ?? "GB";
    } catch { return "GB"; }
  });
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    try {
      const savedCountry = localStorage.getItem(COUNTRY_KEY);
      if (savedCountry && MARKET_COUNTRIES.some(c => c.code === savedCountry)) return countryToCurrency(savedCountry);
      const locale = (navigator.language || "").toUpperCase();
      const hit = MARKET_COUNTRIES.find(c => locale.endsWith(`-${c.code}`));
      return countryToCurrency(hit?.code ?? "GB");
    } catch {
      return "GBP";
    }
  });

  const currency = CURRENCIES[currencyCode];
  const country = MARKET_COUNTRIES.find(c => c.code === countryCode) ?? MARKET_COUNTRIES[0];

  function setCountry(code: string) {
    if (!MARKET_COUNTRIES.some(c => c.code === code)) return;
    setCountryCode(code);
    setCurrencyCode(countryToCurrency(code));
    try { localStorage.setItem(COUNTRY_KEY, code); } catch {}
    try { localStorage.setItem(STORAGE_KEY, countryToCurrency(code)); } catch {}
  }

  function setCurrency(code: CurrencyCode) {
    setCurrencyCode(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  }

  function formatPrice(gbpAmount: number): string {
    const converted = gbpAmount * currency.rate;
    const formatted = converted.toLocaleString("en-GB", {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
    return `${currency.symbol}${formatted}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, countryCode, country, setCountry }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
