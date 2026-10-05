import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const linkClass = "text-sm font-medium text-white/70 hover:text-white transition-colors";

export function Footer() {
  const s = useSiteSettings();

  return (
    <footer className="bg-[#151a2b] text-white/80 border-t border-white/10">
      <div className="container mx-auto px-4 py-9 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-[1.35fr_1fr_1fr_1.15fr] gap-x-8 gap-y-8">
          <div className="col-span-2 md:col-span-1 md:pr-5">
            <Link href="/" className="inline-block mb-3">
              <img
                src="/bazunk-logo-header.png"
                alt="Bazunk"
                className="h-9 md:h-10 w-auto object-contain"
              />
            </Link>
            <p className="max-w-xs text-sm leading-6 text-white/65">
              Buy. Sell. Deal. Get Rewarded.<br />
              Private sellers list and sell for £0.
            </p>

            <div className="flex items-center gap-2.5 mt-4">
              {s.footer_facebook && s.footer_facebook !== "#" && (
                <a href={s.footer_facebook} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on Facebook" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
              {s.footer_twitter && s.footer_twitter !== "#" && (
                <a href={s.footer_twitter} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on Twitter" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Twitter className="w-3.5 h-3.5" />
                </a>
              )}
              {s.footer_instagram && s.footer_instagram !== "#" && (
                <a href={s.footer_instagram} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on Instagram" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {s.footer_youtube && s.footer_youtube !== "#" && (
                <a href={s.footer_youtube} target="_blank" rel="noopener noreferrer" aria-label="Bazunk on YouTube" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Youtube className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Buy</h4>
            <ul className="space-y-2.5">
              <li><Link href="/browse" className={linkClass}>Browse</Link></li>
              <li><Link href="/categories" className={linkClass}>Categories</Link></li>
              <li><Link href="/dashboard" className={linkClass}>My Watchlist</Link></li>
              <li><Link href="/rewards" className={linkClass}>Rewards</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Sell</h4>
            <ul className="space-y-2.5">
              <li><Link href="/sell" className={linkClass}>Start Selling</Link></li>
              <li><Link href="/dashboard" className={linkClass}>Seller Dashboard</Link></li>
              <li><Link href="/credits" className={linkClass}>Selling Fees</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-3 text-sm uppercase tracking-wide">Help & Bazunk</h4>
            <ul className="space-y-2.5">
              <li><Link href="/support" className={linkClass}>Help & FAQ</Link></li>
              <li><Link href="/buyer-protection" className={linkClass}>Buyer Protection</Link></li>
              <li><Link href="/dashboard" className={linkClass}>Returns & Refunds</Link></li>
              <li><Link href="/support" className={linkClass}>Contact Us</Link></li>
              <li><Link href="/video" className={linkClass}>Watch Our Video</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs md:text-sm text-white/45">
            &copy; {new Date().getFullYear()} {s.footer_copyright}. All rights reserved.
          </p>
          <div className="flex gap-5 text-xs md:text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
