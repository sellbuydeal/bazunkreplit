import { useCallback, useEffect, useState } from "react";
import { KeyRound, CheckCircle2, AlertCircle, Loader2, ChevronDown, ExternalLink, Zap } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

interface KeyStatus {
  configured: boolean;
  source: "env" | "admin" | "none";
  hint: string | null;
}
interface TestResult {
  api: string;
  ok: boolean;
  status: number | null;
  message: string;
}

/**
 * Admin → Importers: paste the RapidAPI key and check each importer API is connected.
 * The key is stored on the server only; it is never sent back to the browser
 * (only the last 4 characters are shown).
 */
export function RapidApiPanel() {
  const { authFetch } = useAdmin();
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/api/admin/rapidapi");
      if (r.ok) {
        const d = (await r.json()) as KeyStatus;
        setStatus(d);
        if (!d.configured) setOpen(true);
      }
    } catch { /* leave status null */ }
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await authFetch("/api/admin/rapidapi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput }),
      });
      const d = (await r.json()) as KeyStatus & { error?: string };
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? "Could not save the key" }); return; }
      setStatus(d); setKeyInput("");
      setMsg({ ok: true, text: "Key saved. Running a connection test…" });
      await runTest();
    } catch {
      setMsg({ ok: false, text: "Network error — try again" });
    } finally { setSaving(false); }
  }

  async function runTest() {
    setTesting(true); setResults(null);
    try {
      const r = await authFetch("/api/admin/rapidapi/test", { method: "POST" });
      const d = (await r.json()) as { results?: TestResult[]; error?: string };
      if (!r.ok) { setMsg({ ok: false, text: d.error ?? "Test failed" }); return; }
      setResults(d.results ?? []);
      setMsg(null);
    } catch {
      setMsg({ ok: false, text: "Network error — try again" });
    } finally { setTesting(false); }
  }

  async function removeSaved() {
    if (!confirm("Remove the key saved in the admin panel?")) return;
    const r = await authFetch("/api/admin/rapidapi", { method: "DELETE" });
    if (r.ok) { setStatus((await r.json()) as KeyStatus); setResults(null); setMsg(null); }
  }

  const configured = !!status?.configured;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${configured ? "bg-green-50" : "bg-red-50"}`}>
          <KeyRound className={`w-4 h-4 ${configured ? "text-green-600" : "text-red-500"}`} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-gray-900">RapidAPI connection</span>
          <span className="block text-xs text-gray-500">
            {status === null
              ? "Checking…"
              : configured
                ? `Key set (${status.hint}) · from ${status.source === "env" ? "server environment" : "this admin panel"}`
                : "No key yet — Amazon, eBay and AliExpress importers can't work until you add one"}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-100">
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside pt-3">
            <li>
              Sign in at{" "}
              <a href="https://rapidapi.com" target="_blank" rel="noreferrer" className="text-[#4A5CE8] font-semibold inline-flex items-center gap-0.5">
                rapidapi.com <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and copy your <b>X-RapidAPI-Key</b> (shown on any API's page).
            </li>
            <li>
              Open each API below and click <b>Subscribe</b> (the free plan works): <i>Real-Time Amazon Data</i>,{" "}
              <i>Real-Time eBay Data</i> and <i>AliExpress DataHub</i>.
            </li>
            <li>Paste the key here and press Save &amp; test.</li>
          </ol>

          <div className="flex gap-2 flex-wrap">
            <input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder={configured ? "Paste a new key to replace the current one" : "Paste your RapidAPI key"}
              className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#4A5CE8]"
              data-testid="input-rapidapi-key"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || keyInput.trim().length < 20}
              className="px-5 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Save &amp; test
            </button>
            {configured && (
              <button
                type="button"
                onClick={runTest}
                disabled={testing}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500" />} Test connection
              </button>
            )}
            {status?.source === "admin" && (
              <button type="button" onClick={removeSaved} className="px-3 py-2.5 text-xs font-semibold text-red-500 hover:underline">
                Remove saved key
              </button>
            )}
          </div>

          {msg && (
            <p className={`text-sm flex items-start gap-2 ${msg.ok ? "text-green-600" : "text-red-600"}`}>
              {msg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {msg.text}
            </p>
          )}

          {testing && !results && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking each API…</p>}

          {results && (
            <ul className="space-y-2">
              {results.map(r => (
                <li
                  key={r.api}
                  className={`flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm border ${r.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
                >
                  {r.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span><b>{r.api}</b> — {r.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
