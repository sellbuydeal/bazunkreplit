import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useUser, useClerk } from "@clerk/react";

export interface User {
  name: string;
  email: string;
  username: string;
  balance: number;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  spendCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  spendCredits: () => false,
  addCredits: () => {},
  refreshBalance: async () => {},
});

async function syncUserWithServer(email: string, name?: string): Promise<number | null> {
  try {
    const res = await fetch("/api/stripe/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.balance === "number" ? data.balance : null;
  } catch {
    return null;
  }
}

async function fetchBalanceFromServer(email: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/stripe/balance/${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.balance === "number" ? data.balance : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [balance, setBalance] = useState(0);

  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const clerkId = clerkUser?.id ?? null;

  useEffect(() => {
    if (!clerkId || !email) {
      setBalance(0);
      return;
    }
    const name = clerkUser?.fullName ?? undefined;
    syncUserWithServer(email, name).then((b) => {
      if (b !== null) setBalance(b);
    });
  }, [clerkId, email]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshBalance = useCallback(async () => {
    if (!email) return;
    const b = await fetchBalanceFromServer(email);
    if (b !== null) setBalance(b);
  }, [email]);

  const user: User | null = useMemo(() => {
    if (!isLoaded || !clerkUser) return null;
    const name =
      clerkUser.fullName ??
      clerkUser.username ??
      email.split("@")[0] ??
      "User";
    return {
      name,
      email,
      username: clerkUser.username ?? email.split("@")[0] ?? "user",
      balance,
    };
  }, [isLoaded, clerkUser, email, balance]);

  // login/register kept for API compatibility — Clerk handles these flows via /sign-in and /sign-up
  async function login(_email: string, _password: string): Promise<boolean> {
    return false;
  }
  async function register(_name: string, _email: string, _password: string): Promise<boolean> {
    return false;
  }

  function logout() {
    signOut();
  }

  function spendCredits(amount: number): boolean {
    if (balance < amount) return false;
    setBalance((b) => Math.max(0, b - amount));
    return true;
  }

  function addCredits(amount: number): void {
    setBalance((b) => b + amount);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, spendCredits, addCredits, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
