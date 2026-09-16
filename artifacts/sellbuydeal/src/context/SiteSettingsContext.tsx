import { createContext, useContext, useEffect, useState } from "react";

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  primary_color: string;
  secondary_color: string;
  maintenance_mode: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  announcement_enabled: string;
  announcement_text: string;
  announcement_color: string;
  features_title: string;
  features_subtitle: string;
  categories_title: string;
  categories_subtitle: string;
  footer_about: string;
  footer_facebook: string;
  footer_twitter: string;
  footer_instagram: string;
  footer_youtube: string;
  footer_copyright: string;
  contact_email: string;
  contact_phone: string;
  seo_title: string;
  seo_description: string;
}

export interface SiteSettingsContextValue {
  settings: SiteSettings;
  rawSettings: Record<string, string>;
}

const DEFAULTS: SiteSettings = {
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
  footer_facebook: "#",
  footer_twitter: "#",
  footer_instagram: "#",
  footer_youtube: "#",
  footer_copyright: "Bazunk Marketplace",
  contact_email: "support@bazunk.com",
  contact_phone: "",
  seo_title: "Bazunk - Buy & Sell Anything Locally",
  seo_description: "The smarter way to buy and sell locally. Free listings, secure checkout, real reviews.",
};

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULTS,
  rawSettings: {},
});

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [rawSettings, setRawSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, string>) => {
        setSettings({ ...DEFAULTS, ...data });
        setRawSettings(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", settings.primary_color);
    root.style.setProperty("--brand-secondary", settings.secondary_color);
    if (settings.seo_title) document.title = settings.seo_title;
  }, [settings.primary_color, settings.secondary_color, settings.seo_title]);

  return (
    <SiteSettingsContext.Provider value={{ settings, rawSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext).settings;
}

export function useRawSettings() {
  return useContext(SiteSettingsContext).rawSettings;
}
