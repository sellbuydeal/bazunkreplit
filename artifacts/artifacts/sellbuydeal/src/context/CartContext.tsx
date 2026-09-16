import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Product } from "@/data/products";
import { useUser } from "@clerk/react";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id ?? null;
  const storageKey = userId ? `sbd_cart_${userId}` : null;

  const [items, setItems] = useState<CartItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      setLoadedKey(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!loadedKey) return;
    localStorage.setItem(loadedKey, JSON.stringify(items));
  }, [items, loadedKey]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addToCart = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== id));
  }, []);

  const updateQuantity = useCallback((id: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, openCart, closeCart, addToCart, removeFromCart, updateQuantity, clearCart, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
