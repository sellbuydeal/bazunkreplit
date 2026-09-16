import { useState } from "react";
import { X } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export function AnnouncementBanner() {
  const { announcement_enabled, announcement_text, announcement_color } = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  if (announcement_enabled !== "true" || dismissed) return null;

  return (
    <div
      className="relative flex items-center justify-center px-10 py-2.5 text-white text-sm font-medium text-center"
      style={{ backgroundColor: announcement_color }}
    >
      <span>{announcement_text}</span>
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
