import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Product } from "@/data/products";
import { useUser } from "@clerk/react";

export interface WatchlistItem {
  product: Product;
  addedAt: string;
  priceAtAdd: number;
  alertEnabled: boolean;
}

interface WatchlistContextValue {
  items: WatchlistItem[];
  addToWatchlist: (product: Product) => void;
  removeFromWatchlist: (id: number) => void;
  toggleAlert: (id: number) => void;
  isWatched: (id: number) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

const PRICE_DROPS: Record<number, number> = {
  2: 849.00,
  5: 459.00,
  7: 649.00,
};

export function getCurrentPrice(product: Product): number {
  return PRICE_DROPS[product.id] ?? product.price;
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id ?? null;
  const storageKey = userId ? `sbd_watchlist_${userId}` : null;

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      setLoadedKey(null);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      setItems(stored ? JSON.parse(stored) : []);
    } catch {
      setItems([]);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!loadedKey) return;
    localStorage.setItem(loadedKey, JSON.stringify(items));
  }, [items, loadedKey]);

  function addToWatchlist(product: Product) {
    setItems((prev) => {
      if (prev.some((i) => i.product.id === product.id)) return prev;
      return [
        ...prev,
        {
          product,
          addedAt: new Date().toISOString(),
          priceAtAdd: product.price,
          alertEnabled: true,
        },
      ];
    });
  }

  function removeFromWatchlist(id: number) {
    setItems((prev) => prev.filter((i) => i.product.id !== id));
  }

  function toggleAlert(id: number) {
    setItems((prev) =>
      prev.map((i) => i.product.id === id ? { ...i, alertEnabled: !i.alertEnabled } : i)
    );
  }

  function isWatched(id: number) {
    return items.some((i) => i.product.id === id);
  }

  return (
    <WatchlistContext.Provider value={{ items, addToWatchlist, removeFromWatchlist, toggleAlert, isWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside WatchlistProvider");
  return ctx;
}
