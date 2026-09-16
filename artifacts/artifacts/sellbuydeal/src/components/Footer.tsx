import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export function Footer() {
  const s = useSiteSettings();
  return (
    <footer className="bg-[#1A1D2E] text-white/80 py-16 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Brand Column */}
          <div className="lg:pr-8">
            <Link href="/" className="inline-block mb-6">
              <img src="/bazunk-logo.png" alt="Bazunk" className="h-10 w-auto object-contain rounded-lg bg-white px-3 py-1.5" />
            </Link>
            <p className="text-sm leading-relaxed mb-8 text-white/70">
              {s.footer_about}
            </p>
            <div className="flex items-center gap-4">
              {s.footer_facebook && s.footer_facebook !== "#" && (
                <a href={s.footer_facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {s.footer_twitter && s.footer_twitter !== "#" && (
                <a href={s.footer_twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {s.footer_instagram && s.footer_instagram !== "#" && (
                <a href={s.footer_instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {s.footer_youtube && s.footer_youtube !== "#" && (
                <a href={s.footer_youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">For Buyers</h4>
            <ul className="space-y-4">
              <li><Link href="/categories" className="hover:text-primary transition-colors text-sm">Categories</Link></li>
              <li><Link href="/auctions" className="hover:text-primary transition-colors text-sm">Live Auctions</Link></li>
              <li><Link href="/flash-sales" className="hover:text-primary transition-colors text-sm">Flash Sales</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors text-sm">My Watchlist</Link></li>
              <li><Link href="/browse" className="hover:text-primary transition-colors text-sm">Daily Deals</Link></li>
              <li><Link href="/buyer-protection" className="hover:text-primary transition-colors text-sm">Buyer Protection</Link></li>
              <li><Link href="/cashback" className="hover:text-primary transition-colors text-sm">CashBack Rewards</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">For Sellers</h4>
            <ul className="space-y-4">
              <li><Link href="/sell" className="hover:text-primary transition-colors text-sm">Start Selling</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors text-sm">Seller Dashboard</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors text-sm">Create Store</Link></li>
              <li><Link href="/credits" className="hover:text-primary transition-colors text-sm">Selling Fees</Link></li>
              <li><Link href="/support" className="hover:text-primary transition-colors text-sm">Seller Guide</Link></li>
            </ul>
          </div>

          {/* Links Column 3 */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg">Support</h4>
            <ul className="space-y-4">
              <li><Link href="/support" className="hover:text-primary transition-colors text-sm">Support Center</Link></li>
              <li><Link href="/support" className="hover:text-primary transition-colors text-sm">Help & FAQ</Link></li>
              <li><Link href="/support" className="hover:text-primary transition-colors text-sm">Contact Us</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors text-sm">Returns & Refunds</Link></li>
              <li><Link href="/video" className="hover:text-primary transition-colors text-sm">Watch Our Video</Link></li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 relative">
          <p className="text-sm text-white/50 flex items-center gap-2">
            &copy; {new Date().getFullYear()} {s.footer_copyright}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
