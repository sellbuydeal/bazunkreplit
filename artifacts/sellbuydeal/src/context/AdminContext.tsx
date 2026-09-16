import { createContext, useContext, useState, useEffect } from "react";

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
      setToken(t);
      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    setToken(null);
  }

  function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  return (
    <AdminContext.Provider value={{ token, login, logout, isAdmin: !!token, authFetch }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
