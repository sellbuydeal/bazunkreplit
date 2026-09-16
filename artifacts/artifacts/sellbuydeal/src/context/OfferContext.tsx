import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useUser } from "@clerk/react";
import type { Product } from "@/data/products";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "counter_accepted"
  | "counter_declined";

export interface Offer {
  id: string;
  productId: number;
  productTitle: string;
  productImage: string;
  listingPrice: number;
  sellerName: string;
  sellerId: number;
  offerPrice: number;
  message?: string;
  status: OfferStatus;
  counterPrice?: number;
  counterMessage?: string;
  createdAt: string;
  respondedAt?: string;
}

interface OfferContextValue {
  offers: Offer[];
  makeOffer: (product: Product, offerPrice: number, message?: string) => Offer;
  respondToOffer: (
    id: string,
    action: "accept" | "decline" | "counter",
    counterPrice?: number,
    counterMessage?: string
  ) => void;
  respondToCounter: (id: string, accept: boolean) => void;
  pendingCount: number;
}

const OfferContext = createContext<OfferContextValue | null>(null);

function storageKey(userId: string | null | undefined) {
  return userId ? `sbd_offers_v2_${userId}` : null;
}

function loadOffers(userId: string | null | undefined): Offer[] {
  const key = storageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function OfferProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id ?? null;
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    setOffers(loadOffers(userId));
  }, [userId]);

  useEffect(() => {
    const key = storageKey(userId);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(offers));
  }, [offers, userId]);

  function makeOffer(product: Product, offerPrice: number, message?: string): Offer {
    const newOffer: Offer = {
      id: `offer_${Date.now()}`,
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      listingPrice: product.price,
      sellerName: `${product.location.split(",")[0]} Seller`,
      sellerId: ((product.id - 1) % 3) + 1,
      offerPrice,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setOffers((prev) => [newOffer, ...prev]);

    return newOffer;
  }

  function respondToOffer(
    id: string,
    action: "accept" | "decline" | "counter",
    counterPrice?: number,
    counterMessage?: string
  ) {
    setOffers((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const respondedAt = new Date().toISOString();
        if (action === "accept") return { ...o, status: "accepted", respondedAt };
        if (action === "decline") return { ...o, status: "declined", respondedAt };
        return { ...o, status: "countered", counterPrice, counterMessage, respondedAt };
      })
    );
  }

  function respondToCounter(id: string, accept: boolean) {
    setOffers((prev) =>
      prev.map((o) =>
        o.id !== id
          ? o
          : {
              ...o,
              status: accept ? "counter_accepted" : "counter_declined",
              respondedAt: new Date().toISOString(),
            }
      )
    );
  }

  const pendingCount = offers.filter(
    (o) => o.status === "pending" || o.status === "countered"
  ).length;

  return (
    <OfferContext.Provider value={{ offers, makeOffer, respondToOffer, respondToCounter, pendingCount }}>
      {children}
    </OfferContext.Provider>
  );
}

export function useOffers() {
  const ctx = useContext(OfferContext);
  if (!ctx) throw new Error("useOffers must be used within OfferProvider");
  return ctx;
}
