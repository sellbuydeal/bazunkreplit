import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "wouter";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export function AnnouncementBanner() {
  const { announcement_enabled, announcement_text, announcement_color } = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);
  const legacyFeeMessage = "No listing fees. No final-value fees. No seller commission. Plus, earn free Bazunk Credits to promote your listings.";
  const isFeeMessage = announcement_text.trim() === legacyFeeMessage;
  const bannerText = isFeeMessage
    ? "Private sellers: no listing fees or selling commission. Business sellers: 8% selling fee by default, including protection and support; category rates may differ. Earn free Bazunk Credits to promote your listings."
    : announcement_text;

  if (announcement_enabled !== "true" || dismissed) return null;

  return (
    <div
      className="relative flex items-center justify-center px-10 py-2.5 text-white text-sm font-medium text-center"
      style={{ backgroundColor: announcement_color }}
    >
      <span>{bannerText}{isFeeMessage && <> <Link href="/buyer-protection#fees" className="underline font-bold">View fees</Link></>}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
