import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── API base patch ──────────────────────────────────────────────────────────
// Render's static-site rewrite proxy (used to forward /api/* to the API
// service) does not reliably return response bodies for external-URL
// wildcard rewrites — every request comes back 200 with an empty body.
// Rather than depend on that proxy, every relative "/api/..." fetch call in
// this app is redirected here, at the network layer, straight to the real
// API service. Set VITE_API_URL on the frontend's Render service (Environment
// tab) to enable this; if it's unset, fetch behaves exactly as before, so
// local dev (where Vite's own /api proxy, if any, still works) is unaffected.
const API_BASE = import.meta.env.VITE_API_URL as string | undefined;

if (API_BASE) {
  const base = API_BASE.replace(/\/$/, "");
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(base + input, init);
    }
    if (input instanceof URL && input.pathname.startsWith("/api/")) {
      return originalFetch(base + input.pathname + input.search, init);
    }
    if (input instanceof Request && input.url.includes("/api/")) {
      const url = new URL(input.url);
      if (url.pathname.startsWith("/api/")) {
        return originalFetch(base + url.pathname + url.search, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          credentials: input.credentials,
          ...init,
        });
      }
    }
    return originalFetch(input, init);
  };
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(<App />);
