import { useEffect, useRef } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

type SlotKey = "home_bottom" | "browse_top" | "browse_bottom" | "auctions_mid" | "flash_sales_mid" | "categories_top" | "classifieds_mid" | "support_mid";

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
      <div className={`w-full bg-amber-50 border-b border-amber-100 py-2 px-4 ${className}`}>
        <div className="container mx-auto max-w-5xl flex items-center gap-3">
          <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase flex-shrink-0">Ad</span>
          <Megaphone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          {textTitle && <span className="font-bold text-sm text-gray-900 truncate">{textTitle}</span>}
          {textBody && <span className="text-xs text-gray-500 truncate hidden sm:block">{textBody}</span>}
          {textUrl && (
            <a
              href={textUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-shrink-0 flex items-center gap-1 text-xs font-bold text-[#F26B21] hover:underline"
            >
              {textCta} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    );
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
