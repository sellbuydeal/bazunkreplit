import { createContext, useContext, useState, useEffect } from "react";

export type CurrencyCode = "GBP" | "USD" | "EUR" | "AUD" | "CAD" | "NZD" | "CHF";

export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "NZD", CH: "CHF",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", PT: "EUR", AT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", SK: "EUR", SI: "EUR", LT: "EUR", LV: "EUR",
  EE: "EUR", CY: "EUR", LU: "EUR", MT: "EUR",
};

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
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = "sbd_currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && saved in CURRENCIES) return saved as CurrencyCode;
      // Default to locale-matched currency, fallback to USD
      const lang = navigator.language ?? "";
      if (lang.includes("GB") || lang.includes("en-GB")) return "GBP";
      return "USD";
    } catch {
      return "USD";
    }
  });

  const currency = CURRENCIES[currencyCode];

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
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
