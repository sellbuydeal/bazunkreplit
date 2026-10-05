import { createContext, useContext, useState, useEffect, useRef } from "react";

const ADMIN_TOKEN_KEY = "sbd_admin_token";

interface AdminContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  authFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextValue>({
  token: null,
  login: async () => false,
  logout: () => {},
  isAdmin: false,
  authFetch: async (path) => fetch(path),
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));

  const currentToken = useRef(token);
  currentToken.current = token;

  useEffect(() => {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  }, [token]);

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const { token: t } = await res.json();
      if (typeof t !== "string" || !t) return false;
      setToken(t);
      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }

  async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const requestToken = token;
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${requestToken ?? ""}`);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...options, headers });
    // Do not let an old request sign out a newly authenticated session.
    if (response.status === 401 && currentToken.current === requestToken) logout();
    return response;
  }

  useEffect(() => {
    if (!token) return;
    // The server remains authoritative; network/server failures do not sign users out.
    const check = () => { void authFetch("/api/admin/settings").catch(() => {}); };
    check();
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 60_000);
    return () => { window.removeEventListener("focus", check); window.clearInterval(timer); };
  }, [token]);

  return (
    <AdminContext.Provider value={{ token, login, logout, isAdmin: !!token, authFetch }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
