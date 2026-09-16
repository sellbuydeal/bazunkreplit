export type LivePlatform = "youtube" | "twitch" | "tiktok" | "zoom" | "instagram" | "facebook" | "livekit";

export interface FeaturedItem {
  productId: number;
  discount?: number;
  stockAlert?: number;
  flashDeal?: boolean;
  featuredAt: number;
}

export interface LiveSession {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerInitials: string;
  title: string;
  platform: LivePlatform;
  streamUrl: string;
  isLive: boolean;
  scheduledAt?: string;
  productIds: number[];
  viewerCount: number;
  startedAt: string;
}

export interface PlatformMeta {
  label: string;
  bg: string;
  text: string;
  canEmbed: boolean;
  placeholder: string;
  native?: boolean;
}

export const FEATURED_KEY = "sbd_live_featured_v2";

export const PLATFORM_META: Record<LivePlatform, PlatformMeta> = {
  youtube:   { label: "YouTube",          bg: "bg-red-500",     text: "text-red-500",     canEmbed: true,  placeholder: "https://www.youtube.com/watch?v=..." },
  twitch:    { label: "Twitch",           bg: "bg-purple-600",  text: "text-purple-600",  canEmbed: true,  placeholder: "https://www.twitch.tv/yourchannel" },
  tiktok:    { label: "TikTok",           bg: "bg-gray-900",    text: "text-gray-900",    canEmbed: false, placeholder: "https://www.tiktok.com/@you/live" },
  zoom:      { label: "Zoom",             bg: "bg-blue-500",    text: "text-blue-500",    canEmbed: false, placeholder: "https://us02web.zoom.us/j/..." },
  instagram: { label: "Instagram",        bg: "bg-pink-500",    text: "text-pink-500",    canEmbed: false, placeholder: "https://www.instagram.com/yourhandle/" },
  facebook:  { label: "Facebook",         bg: "bg-blue-700",    text: "text-blue-700",    canEmbed: false, placeholder: "https://www.facebook.com/yourpage/live" },
  livekit:   { label: "LiveKit (Native)", bg: "bg-orange-500",  text: "text-orange-500",  canEmbed: false, placeholder: "", native: true },
};

export function extractEmbedSrc(platform: LivePlatform, url: string, hostname: string): string | null {
  if (platform === "youtube") {
    const patterns = [
      /[?&]v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/live\/([^?/]+)/,
      /youtube\.com\/embed\/([^?/]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1`;
    }
    return null;
  }
  if (platform === "twitch") {
    const m = url.match(/twitch\.tv\/([^/?#]+)/);
    if (m) return `https://player.twitch.tv/?channel=${m[1]}&parent=${hostname}&autoplay=true&muted=true`;
    return null;
  }
  return null;
}

export const MOCK_LIVE_SESSIONS: LiveSession[] = [];
