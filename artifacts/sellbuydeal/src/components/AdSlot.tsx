import { useEffect, useRef } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

type SlotKey = "home_bottom" | "browse_top" | "browse_bottom" | "auctions_mid" | "flash_sales_mid" | "categories_top" | "classifieds_mid" | "support_mid" | "live_left" | "live_bottom";

interface AdSlotProps {
  slotKey: SlotKey;
  className?: string;
}

function AdSenseBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !code.trim()) return;
    const container = ref.current;
    container.innerHTML = code;
    container.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }, [code]);

  return <div ref={ref} className="overflow-hidden w-full" />;
}

export function AdSlot({ slotKey, className = "" }: AdSlotProps) {
  const raw = useSiteSettings() as unknown as Record<string, string>;

  const enabled = raw[`ad_${slotKey}_enabled`] === "true";
  if (!enabled) return null;

  const type = raw[`ad_${slotKey}_type`] || "text";
  const code = raw[`ad_${slotKey}_code`] || "";
  const customHtml = raw[`ad_${slotKey}_custom_html`] || "";
  const textTitle = raw[`ad_${slotKey}_text_title`] || "";
  const textBody = raw[`ad_${slotKey}_text_body`] || "";
  const textUrl = raw[`ad_${slotKey}_text_url`] || "";
  const textCta = raw[`ad_${slotKey}_text_cta`] || "Learn More";

  if (type === "custom") {
    if (!customHtml.trim()) return null;
    return (
      <div className={`w-full bg-gray-50 border-y border-gray-100 py-2 flex flex-col items-center ${className}`}>
        <span className="text-[9px] text-gray-300 font-semibold tracking-widest uppercase mb-1 self-end mr-4">Advertisement</span>
        <div className="w-full max-w-[728px] min-h-[90px] mx-auto overflow-hidden">
          <AdSenseBlock code={customHtml} />
        </div>
      </div>
    );
  }

  if (type === "adsense") {
    if (!code.trim()) return null;
    return (
      <div className={`w-full bg-gray-50 border-y border-gray-100 py-2 flex flex-col items-center ${className}`}>
        <span className="text-[9px] text-gray-300 font-semibold tracking-widest uppercase mb-1 self-end mr-4">Advertisement</span>
        <div className="w-full max-w-[728px] min-h-[90px] mx-auto">
          <AdSenseBlock code={code} />
        </div>
      </div>
    );
  }

  if (slotKey === "browse_top") {
    if (!textTitle && !textBody) return null;
    return (
      <div className={`w-full py-4 px-4 ${className}`}>
        <div className="container mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4A4FF3] via-[#8B4FE8] to-[#EC3CB8] px-4 sm:px-6 py-4 sm:py-5 shadow-lg shadow-purple-950/15">
            <div className="pointer-events-none absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-white/10" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <span className="rounded-md bg-yellow-300 px-2 py-1 text-[10px] font-black tracking-wide text-slate-900 flex-shrink-0">AD</span>
                <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 flex-shrink-0">
                  <Megaphone className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </span>
                <div className="min-w-0 text-white">
                  {textTitle && <p className="text-lg sm:text-xl font-black leading-tight">{textTitle}</p>}
                  {textBody && <p className="mt-1 text-sm font-semibold text-white/90">{textBody}</p>}
                </div>
              </div>
              {textUrl && (
                <a href={textUrl} target={textUrl.startsWith("/") ? undefined : "_blank"} rel={textUrl.startsWith("/") ? undefined : "noopener noreferrer"}
                  className="inline-flex min-h-12 flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#101C38] px-5 sm:px-7 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#17264a]">
                  {textCta} <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slotKey === "live_left") {
    if (type === "text") {
      if (!textTitle && !textBody) return null;
      return (
        <div className={`w-full h-full min-h-[280px] bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col ${className}`}>
          <span className="text-[9px] text-gray-500 font-semibold tracking-widest uppercase mb-4">Advertisement</span>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <Megaphone className="w-8 h-8 text-[#4A5CE8]" />
            {textTitle && <p className="font-bold text-white text-sm">{textTitle}</p>}
            {textBody && <p className="text-xs text-gray-400">{textBody}</p>}
            {textUrl && (
              <a href={textUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 bg-[#F26B21] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-xl">
                {textCta} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      );
    }
  }

  if (!textTitle && !textBody) return null;
  return (
    <div className={`w-full bg-white border-y border-gray-100 py-5 ${className}`}>
      <div className="container mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-bold text-gray-300 tracking-widest uppercase">Advertisement</span>
        </div>
        <div className="max-w-[728px] mx-auto bg-gradient-to-r from-[#4A5CE8]/5 to-[#F26B21]/5 border border-gray-200 rounded-2xl px-6 py-4 flex items-center gap-5">
          <Megaphone className="w-8 h-8 text-[#4A5CE8] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {textTitle && <p className="font-bold text-gray-900 text-sm">{textTitle}</p>}
            {textBody && <p className="text-xs text-gray-500 mt-0.5">{textBody}</p>}
          </div>
          {textUrl && (
            <a
              href={textUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 bg-[#F26B21] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-xl transition-opacity"
            >
              {textCta} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
