import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LanguageCode = "en" | "de" | "fr" | "es" | "it" | "pt" | "nl";

export const LANGUAGES: Record<LanguageCode, { code: LanguageCode; name: string; nativeName: string }> = {
  en: { code: "en", name: "English", nativeName: "English" },
  de: { code: "de", name: "German", nativeName: "Deutsch" },
  fr: { code: "fr", name: "French", nativeName: "Français" },
  es: { code: "es", name: "Spanish", nativeName: "Español" },
  it: { code: "it", name: "Italian", nativeName: "Italiano" },
  pt: { code: "pt", name: "Portuguese", nativeName: "Português" },
  nl: { code: "nl", name: "Dutch", nativeName: "Nederlands" },
};

export const COUNTRY_LANGUAGE_MAP: Record<string, LanguageCode> = {
  GB: "en", US: "en", IE: "en", AU: "en", CA: "en", NZ: "en", CH: "de",
  DE: "de", AT: "de", FR: "fr", LU: "fr", IT: "it", ES: "es", PT: "pt",
  NL: "nl", BE: "nl", FI: "en", GR: "en",
};

const translations: Record<LanguageCode, Record<string, string>> = {
  en: { country:"Country", currency:"Currency", language:"Language", browse:"Browse", categories:"Categories", live:"Live", rewards:"Rewards", search:"Search listings…", home:"Home", auctions:"Auctions", flashSales:"Flash Sales", classifieds:"Classifieds", directSale:"Direct Sale", buyerProtection:"Buyer Protection", support:"Support", messages:"Messages", dashboard:"Dashboard", signIn:"Sign In", joinFree:"Join Free", shipsFrom:"Ships from", shipsTo:"Ships to", deliveryLocation:"Delivery & location", condition:"Condition", available:"Available", listingCurrency:"Listing currency", descriptionDetails:"Description & Details", description:"Description", itemDetails:"Item Details", buyNow:"Buy It Now", makeOffer:"Make an Offer", messageSeller:"Message Seller" },
  de: { country:"Land", currency:"Währung", language:"Sprache", browse:"Stöbern", categories:"Kategorien", live:"Live", rewards:"Prämien", search:"Angebote suchen…", home:"Startseite", auctions:"Auktionen", flashSales:"Blitzangebote", classifieds:"Kleinanzeigen", directSale:"Direktverkauf", buyerProtection:"Käuferschutz", support:"Hilfe", messages:"Nachrichten", dashboard:"Übersicht", signIn:"Anmelden", joinFree:"Kostenlos registrieren", shipsFrom:"Versand aus", shipsTo:"Versand nach", deliveryLocation:"Lieferung & Standort", condition:"Zustand", available:"Verfügbar", listingCurrency:"Angebotswährung", descriptionDetails:"Beschreibung & Details", description:"Beschreibung", itemDetails:"Artikeldetails", buyNow:"Sofort kaufen", makeOffer:"Preis vorschlagen", messageSeller:"Verkäufer kontaktieren" },
  fr: { country:"Pays", currency:"Devise", language:"Langue", browse:"Parcourir", categories:"Catégories", live:"En direct", rewards:"Récompenses", search:"Rechercher des annonces…", home:"Accueil", auctions:"Enchères", flashSales:"Ventes flash", classifieds:"Petites annonces", directSale:"Vente directe", buyerProtection:"Protection acheteur", support:"Aide", messages:"Messages", dashboard:"Tableau de bord", signIn:"Se connecter", joinFree:"Inscription gratuite", shipsFrom:"Expédié depuis", shipsTo:"Expédié vers", deliveryLocation:"Livraison et localisation", condition:"État", available:"Disponible", listingCurrency:"Devise de l’annonce", descriptionDetails:"Description et détails", description:"Description", itemDetails:"Détails de l’article", buyNow:"Acheter maintenant", makeOffer:"Faire une offre", messageSeller:"Contacter le vendeur" },
  es: { country:"País", currency:"Moneda", language:"Idioma", browse:"Explorar", categories:"Categorías", live:"En directo", rewards:"Recompensas", search:"Buscar anuncios…", home:"Inicio", auctions:"Subastas", flashSales:"Ofertas flash", classifieds:"Clasificados", directSale:"Venta directa", buyerProtection:"Protección del comprador", support:"Ayuda", messages:"Mensajes", dashboard:"Panel", signIn:"Iniciar sesión", joinFree:"Registrarse gratis", shipsFrom:"Se envía desde", shipsTo:"Se envía a", deliveryLocation:"Entrega y ubicación", condition:"Estado", available:"Disponible", listingCurrency:"Moneda del anuncio", descriptionDetails:"Descripción y detalles", description:"Descripción", itemDetails:"Detalles del artículo", buyNow:"Comprar ahora", makeOffer:"Hacer una oferta", messageSeller:"Contactar al vendedor" },
  it: { country:"Paese", currency:"Valuta", language:"Lingua", browse:"Esplora", categories:"Categorie", live:"Live", rewards:"Premi", search:"Cerca annunci…", home:"Home", auctions:"Aste", flashSales:"Vendite lampo", classifieds:"Annunci", directSale:"Vendita diretta", buyerProtection:"Protezione acquirenti", support:"Assistenza", messages:"Messaggi", dashboard:"Dashboard", signIn:"Accedi", joinFree:"Registrati gratis", shipsFrom:"Spedito da", shipsTo:"Spedito a", deliveryLocation:"Consegna e località", condition:"Condizione", available:"Disponibile", listingCurrency:"Valuta dell’annuncio", descriptionDetails:"Descrizione e dettagli", description:"Descrizione", itemDetails:"Dettagli articolo", buyNow:"Compra subito", makeOffer:"Fai un’offerta", messageSeller:"Contatta il venditore" },
  pt: { country:"País", currency:"Moeda", language:"Idioma", browse:"Explorar", categories:"Categorias", live:"Ao vivo", rewards:"Recompensas", search:"Pesquisar anúncios…", home:"Início", auctions:"Leilões", flashSales:"Ofertas relâmpago", classifieds:"Classificados", directSale:"Venda direta", buyerProtection:"Proteção do comprador", support:"Ajuda", messages:"Mensagens", dashboard:"Painel", signIn:"Entrar", joinFree:"Registo grátis", shipsFrom:"Enviado de", shipsTo:"Enviado para", deliveryLocation:"Entrega e localização", condition:"Condição", available:"Disponível", listingCurrency:"Moeda do anúncio", descriptionDetails:"Descrição e detalhes", description:"Descrição", itemDetails:"Detalhes do artigo", buyNow:"Comprar agora", makeOffer:"Fazer oferta", messageSeller:"Contactar vendedor" },
  nl: { country:"Land", currency:"Valuta", language:"Taal", browse:"Bladeren", categories:"Categorieën", live:"Live", rewards:"Beloningen", search:"Advertenties zoeken…", home:"Home", auctions:"Veilingen", flashSales:"Flitsverkopen", classifieds:"Advertenties", directSale:"Directe verkoop", buyerProtection:"Kopersbescherming", support:"Help", messages:"Berichten", dashboard:"Dashboard", signIn:"Inloggen", joinFree:"Gratis aanmelden", shipsFrom:"Verzonden vanuit", shipsTo:"Verzonden naar", deliveryLocation:"Levering en locatie", condition:"Conditie", available:"Beschikbaar", listingCurrency:"Advertentievaluta", descriptionDetails:"Beschrijving en details", description:"Beschrijving", itemDetails:"Artikelgegevens", buyNow:"Nu kopen", makeOffer:"Bod doen", messageSeller:"Verkoper berichten" },
};

type LanguageContextType = {
  language: typeof LANGUAGES[LanguageCode];
  setLanguage: (code: LanguageCode) => void;
  setLanguageForCountry: (countryCode: string) => void;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);
const STORAGE_KEY = "sbd_language";
const MANUAL_KEY = "sbd_language_manual";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && saved in LANGUAGES) return saved;
      const browser = (navigator.language || "en").slice(0, 2) as LanguageCode;
      return browser in LANGUAGES ? browser : "en";
    } catch { return "en"; }
  });
  const setLanguage = (next: LanguageCode) => { setCode(next); try { localStorage.setItem(STORAGE_KEY, next); localStorage.setItem(MANUAL_KEY, "1"); } catch {} };
  const setLanguageForCountry = (countryCode: string) => {
    try { if (localStorage.getItem(MANUAL_KEY) === "1") return; } catch {}
    const next = COUNTRY_LANGUAGE_MAP[countryCode] || "en"; setCode(next); try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };
  useEffect(() => { document.documentElement.lang = code; }, [code]);
  const value = useMemo(() => ({ language: LANGUAGES[code], setLanguage, setLanguageForCountry, t: (key: string, fallback?: string) => translations[code][key] || translations.en[key] || fallback || key }), [code]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { const ctx = useContext(LanguageContext); if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider"); return ctx; }
