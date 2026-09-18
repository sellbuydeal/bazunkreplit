import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data.token) {
          localStorage.setItem("admin_token", data.token);
        }
        localStorage.setItem("isAdminAuthenticated", "true");

        // Hard browser reload forces navigation and bypasses Clerk router interference
        window.location.href = "/admin/dashboard";
      } else {
        setError(data.message || "Invalid email or password.");
      }
    } catch (err) {
      setError("Network error. Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E12] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#16181E] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#F26B21]/10 border border-[#F26B21]/20 flex items-center justify-center text-[#F26B21]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Admin Login</h1>
              <p className="text-gray-400 text-xs">Secure access required</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/40 focus:border-[#F26B21]/50 text-sm"
                />
              </div>
            </div>
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault(); // MUST BE FIRST LINE
  e.stopPropagation();

  setLoading(true);
  setError("");

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      if (data.token) {
        localStorage.setItem("admin_token", data.token);
      }
      localStorage.setItem("isAdminAuthenticated", "true");

      // Redirect directly to dashboard
      window.location.replace("/admin/dashboard");
    } else {
      setError(data.message || "Invalid email or password.");
    }
  } catch (err) {
    setError("Network error. Could not connect to authentication server.");
  } finally {
    setLoading(false);
  }
};
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/40 focus:border-[#F26B21]/50 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {show ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl bg-[#F26B21] hover:bg-[#e05c15] text-white font-bold text-sm transition-colors disabled:opacity-40"
            >
              {loading ? "Signing in…" : "Sign In to Admin"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Credentials set via{" "}
          <code className="text-gray-500">ADMIN_EMAIL</code> &amp;{" "}
          <code className="text-gray-500">ADMIN_PASSWORD</code> env vars
        </p>
      </div>
    </div>
  );
}
