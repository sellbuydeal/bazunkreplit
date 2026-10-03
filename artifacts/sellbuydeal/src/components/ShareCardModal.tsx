import { useEffect, useRef, useState } from "react";
import { X, Download, Share2, Copy, Check, Loader2 } from "lucide-react";

export interface ShareListing {
  id: number;
  title: string;
  price: string | number;
  image?: string | null;
  publicId?: string | null;
}

type Format = "square" | "landscape";
const SIZES: Record<Format, { w: number; h: number; label: string }> = {
  square:    { w: 1080, h: 1080, label: "Square (Instagram, Facebook)" },
  landscape: { w: 1200, h: 630,  label: "Landscape (X, LinkedIn, WhatsApp)" },
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else line = test;
  }
  const used = lines.join(" ").split(/\s+/).length;
  const rest = words.slice(lines.length ? used : 0).join(" ");
  const last = lines.length === maxLines - 1 ? rest : line;
  let final = last;
  while (ctx.measureText(final).width > maxW && final.length > 1) final = final.slice(0, -1);
  if (final !== last) final = final.replace(/\s+\S*$/, "") + "…";
  lines.push(final);
  return lines.filter(Boolean);
}

async function drawCard(canvas: HTMLCanvasElement, listing: ShareListing, format: Format, link: string): Promise<boolean> {
  const { w, h } = SIZES[format];
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const [photo, logo] = await Promise.all([listing.image ? loadImage(listing.image) : Promise.resolve(null), loadImage("/bazunk-logo-header.png")]);

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#3B4FD8"); bg.addColorStop(0.6, "#4A5CE8"); bg.addColorStop(1, "#7C3AED");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath(); ctx.arc(w * 0.92, h * 0.08, h * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.05, h * 0.98, h * 0.25, 0, Math.PI * 2); ctx.fill();

  const pad = Math.round(w * 0.05);
  const price = typeof listing.price === "number" ? listing.price : parseFloat(String(listing.price));
  const priceText = `£${isFinite(price) ? price.toFixed(2) : "0.00"}`;

  const drawPhoto = (x: number, y: number, pw: number, ph: number, r: number) => {
    ctx.save();
    roundRect(ctx, x, y, pw, ph, r); ctx.clip();
    if (photo) {
      const s = Math.max(pw / photo.width, ph / photo.height);
      const dw = photo.width * s, dh = photo.height * s;
      ctx.drawImage(photo, x + (pw - dw) / 2, y + (ph - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = "#EEF0FB"; ctx.fillRect(x, y, pw, ph);
      ctx.fillStyle = "#A9B0E8"; ctx.font = `700 ${Math.round(ph * 0.12)}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.fillText("No photo", x + pw / 2, y + ph / 2); ctx.textAlign = "left";
    }
    ctx.restore();
  };

  const drawLogoChip = (x: number, y: number, height: number) => {
    if (!logo) return;
    const lw = (logo.width / logo.height) * height;
    ctx.fillStyle = "#fff";
    roundRect(ctx, x, y, lw + height * 0.6, height * 1.3, height * 0.3); ctx.fill();
    ctx.drawImage(logo, x + height * 0.3, y + height * 0.15, lw, height);
  };

  if (format === "square") {
    drawLogoChip(pad, pad, 54);
    // Card
    const cx = pad, cy = pad + 110, cw = w - pad * 2, ch = h - cy - pad;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#fff"; roundRect(ctx, cx, cy, cw, ch, 36); ctx.fill(); ctx.restore();
    const photoH = Math.round(ch * 0.6);
    drawPhoto(cx + 20, cy + 20, cw - 40, photoH, 24);
    ctx.fillStyle = "#1A1D2E"; ctx.font = "800 44px Inter, Arial, sans-serif";
    const lines = wrapLines(ctx, listing.title, cw - 70, 2);
    lines.forEach((ln, i) => ctx.fillText(ln, cx + 36, cy + photoH + 90 + i * 54));
    ctx.fillStyle = "#F26B21"; ctx.font = "900 72px Inter, Arial, sans-serif";
    ctx.fillText(priceText, cx + 36, cy + ch - 56);
    ctx.fillStyle = "#6B7280"; ctx.font = "600 26px Inter, Arial, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(link.replace(/^https?:\/\//, ""), cx + cw - 36, cy + ch - 62); ctx.textAlign = "left";
  } else {
    drawLogoChip(pad, pad * 0.8, 40);
    const phW = Math.round(h * 0.78), phH = h - pad * 2 - 70, px = pad, py = pad + 70;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#fff"; roundRect(ctx, px, py, phW, phH, 28); ctx.fill(); ctx.restore();
    drawPhoto(px + 12, py + 12, phW - 24, phH - 24, 20);
    const tx = px + phW + pad;
    const tw = w - tx - pad;
    ctx.fillStyle = "#fff"; ctx.font = "800 46px Inter, Arial, sans-serif";
    wrapLines(ctx, listing.title, tw, 3).forEach((ln, i) => ctx.fillText(ln, tx, py + 70 + i * 58));
    ctx.fillStyle = "#FFB020"; ctx.font = "900 84px Inter, Arial, sans-serif";
    ctx.fillText(priceText, tx, py + phH - 110);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "600 24px Inter, Arial, sans-serif";
    ctx.fillText("Listed on Bazunk", tx, py + phH - 62);
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "500 20px Inter, Arial, sans-serif";
    ctx.fillText(link.replace(/^https?:\/\//, ""), tx, py + phH - 28);
  }
  try { canvas.toDataURL("image/png"); return true; } catch { return false; }
}

export function ShareCardModal({ listing, onClose }: { listing: ShareListing; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<Format>("square");
  const [busy, setBusy] = useState(true);
  const [exportable, setExportable] = useState(true);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/listing/${listing.publicId ?? listing.id}`;

  useEffect(() => {
    let alive = true;
    setBusy(true);
    if (canvasRef.current) {
      drawCard(canvasRef.current, listing, format, link).then(ok => { if (alive) { setExportable(ok); setBusy(false); } });
    }
    return () => { alive = false; };
  }, [listing, format, link]);

  function download() {
    canvasRef.current?.toBlob(b => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `bazunk-${listing.id}-${format}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  async function share() {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    canvasRef.current?.toBlob(async b => {
      if (!b) return;
      const file = new File([b], `bazunk-${listing.id}.png`, { type: "image/png" });
      try {
        if (nav.canShare?.({ files: [file] })) await nav.share({ files: [file], title: listing.title, text: `${listing.title} on Bazunk`, url: link });
        else if (nav.share) await nav.share({ title: listing.title, text: `${listing.title} on Bazunk`, url: link });
        else await copy();
      } catch { /* cancelled */ }
    }, "image/png");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-900">Your shareable listing card</h2>
            <p className="text-xs text-gray-400 mt-0.5">Download it or share it straight to your socials.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          <div className="flex gap-2 mb-4">
            {(Object.keys(SIZES) as Format[]).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${format === f ? "bg-[#4A5CE8] text-white border-[#4A5CE8]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {SIZES[f].label}
              </button>
            ))}
          </div>
          <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
            {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
            <canvas ref={canvasRef} className="w-full h-auto block" />
          </div>
          {!exportable && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your photo is hosted somewhere that blocks saving it into the card, so downloading is unavailable. You can still screenshot this card or copy the link.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button onClick={download} disabled={!exportable || busy} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1A1D2E] text-white text-sm font-bold disabled:opacity-40"><Download className="w-4 h-4" />Download</button>
            <button onClick={share} disabled={!exportable || busy} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold disabled:opacity-40"><Share2 className="w-4 h-4" />Share</button>
            <button onClick={copy} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50">{copied ? <><Check className="w-4 h-4 text-emerald-500" />Copied</> : <><Copy className="w-4 h-4" />Copy link</>}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
