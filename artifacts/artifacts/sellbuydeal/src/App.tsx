import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { CategorySection } from "@/components/CategorySection";
import { FeaturedListings } from "@/components/FeaturedListings";
import { FeaturedFeatures } from "@/components/FeaturedFeatures";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { SellPage } from "@/pages/SellPage";
import { QuickSellPage } from "@/pages/QuickSellPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { BrowsePage } from "@/pages/BrowsePage";
import { ListingPage } from "@/pages/ListingPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { BundlePage } from "@/pages/BundlePage";
import { ClassifiedsPage } from "@/pages/ClassifiedsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { SellerProfilePage } from "@/pages/SellerProfilePage";
import { CreditsPage } from "@/pages/CreditsPage";
import { PromotionsPage } from "@/pages/PromotionsPage";
import { SupportPage } from "@/pages/SupportPage";
import { TermsPage } from "@/pages/TermsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { OffersPage } from "@/pages/OffersPage";
import { LivePage, LiveHubPage } from "@/pages/LivePage";
import { LiveNowStrip } from "@/components/LiveNowStrip";
import { PerksStrip } from "@/components/PerksStrip";
import { OfferProvider } from "@/context/OfferContext";
import { LiveStreamProvider } from "@/context/LiveStreamContext";
import { AdminProvider } from "@/context/AdminContext";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { UserCurrencySync } from "@/components/UserCurrencySync";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminListingsPage } from "@/pages/admin/AdminListingsPage";
import { AdminImportsPage } from "@/pages/admin/AdminImportsPage";
import { AdminClassifiedsPage } from "@/pages/admin/AdminClassifiedsPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";
import { AdminReturnsPage } from "@/pages/admin/AdminReturnsPage";
import { AdminAuctionsPage } from "@/pages/admin/AdminAuctionsPage";
import { AuctionsPage } from "@/pages/AuctionsPage";
import { AuctionDetailPage } from "@/pages/AuctionDetailPage";
import { CreateAuctionPage } from "@/pages/CreateAuctionPage";
import { FlashSalesPage } from "@/pages/FlashSalesPage";
import { FlashSaleDetailPage } from "@/pages/FlashSaleDetailPage";
import { CreateFlashSalePage } from "@/pages/CreateFlashSalePage";
import { AdminFlashSalesPage } from "@/pages/admin/AdminFlashSalesPage";
import { AdminSupportPage } from "@/pages/admin/AdminSupportPage";
import { SetupWizardPage } from "@/pages/SetupWizardPage";
import VideoPage from "@/pages/VideoPage";
import { RewardsPage } from "@/pages/RewardsPage";
import { AdminRewardsPage } from "@/pages/admin/AdminRewardsPage";
import { AdminPromotionsPage } from "@/pages/admin/AdminPromotionsPage";
import { AdminVerificationPage } from "@/pages/admin/AdminVerificationPage";
import { LockerShippingPage } from "@/pages/LockerShippingPage";
import { ShippingLabelsPage } from "@/pages/ShippingLabelsPage";
import BuyerProtectionPage from "@/pages/BuyerProtectionPage";
import CashbackPage from "@/pages/CashbackPage";

// ─── Clerk setup ─────────────────────────────────────────────────────────────

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// REQUIRED — copy verbatim
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/bazunk-logo.png`,
  },
  variables: {
    colorPrimary: "#F26B21",
    colorForeground: "#ffffff",
    colorMutedForeground: "rgba(255,255,255,0.5)",
    colorDanger: "#ef4444",
    colorBackground: "#1A1D2E",
    colorInput: "#252840",
    colorInputForeground: "#ffffff",
    colorNeutral: "rgba(255,255,255,0.15)",
    fontFamily: '"Outfit", "Inter", sans-serif',
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-black/50 border border-white/10 bg-[#1A1D2E]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none bg-[#151829]",
    headerTitle: "text-white font-black",
    headerSubtitle: "text-white/50",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-white/70 font-medium",
    footerActionLink: "text-[#F26B21] font-semibold",
    footerActionText: "text-white/40",
    dividerText: "text-white/30",
    identityPreviewEditButton: "text-[#F26B21]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-white/80",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-white/15 bg-white/5 text-white",
    formButtonPrimary: "bg-[#F26B21] text-white font-bold",
    formFieldInput: "bg-[#252840] border-white/15 text-white",
    footerAction: "bg-[#151829]",
    dividerLine: "bg-white/10",
    alert: "bg-red-500/10 border-red-500/20",
    otpCodeFieldInput: "bg-[#252840] border-white/15 text-white",
    formFieldRow: "gap-3",
    main: "px-8 py-6",
  },
};

// ─── Clerk cache invalidator ──────────────────────────────────────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ─── Sign-in / sign-up pages ─────────────────────────────────────────────────

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D0F1C] px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D0F1C] px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnnouncementBanner />
      <Navbar />
      <PerksStrip />
      <main className="flex-1">
        <Hero />
        <CategorySection />
        <LiveNowStrip />
        <FeaturedListings />
        <FeaturedFeatures />
        <AdSlot slotKey="home_bottom" />
      </main>
      <Footer />
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Auth — REQUIRED: use /*? wildcard verbatim for OAuth callbacks */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      {/* Legacy redirects */}
      <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/register">{() => <Redirect to="/sign-up" />}</Route>
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/sell" component={SellPage} />
      <Route path="/sell/quick" component={QuickSellPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/browse" component={BrowsePage} />
      <Route path="/search" component={BrowsePage} />
      <Route path="/listing/:id" component={ListingPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/bundle" component={BundlePage} />
      <Route path="/classifieds" component={ClassifiedsPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/seller/:id" component={SellerProfilePage} />
      <Route path="/credits" component={CreditsPage} />
      <Route path="/promotions" component={PromotionsPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/faq" component={SupportPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/offers" component={OffersPage} />
      <Route path="/live" component={LiveHubPage} />
      <Route path="/live/:id" component={LivePage} />
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/products" component={AdminProductsPage} />
      <Route path="/admin/listings" component={AdminListingsPage} />
      <Route path="/admin/imports" component={AdminImportsPage} />
      <Route path="/admin/classifieds" component={AdminClassifiedsPage} />
      <Route path="/admin/payments" component={AdminPaymentsPage} />
      <Route path="/admin/disputes" component={AdminDisputesPage} />
      <Route path="/admin/returns" component={AdminReturnsPage} />
      <Route path="/admin/auctions" component={AdminAuctionsPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/auctions/create" component={CreateAuctionPage} />
      <Route path="/auctions/:id" component={AuctionDetailPage} />
      <Route path="/auctions" component={AuctionsPage} />
      <Route path="/flash-sales/create" component={CreateFlashSalePage} />
      <Route path="/flash-sales/:id" component={FlashSaleDetailPage} />
      <Route path="/flash-sales" component={FlashSalesPage} />
      <Route path="/admin/flash-sales" component={AdminFlashSalesPage} />
      <Route path="/admin/support" component={AdminSupportPage} />
      <Route path="/admin/rewards" component={AdminRewardsPage} />
      <Route path="/admin/promotions" component={AdminPromotionsPage} />
      <Route path="/admin/verification" component={AdminVerificationPage} />
      <Route path="/setup" component={SetupWizardPage} />
      <Route path="/video" component={VideoPage} />
      <Route path="/rewards" component={RewardsPage} />
      <Route path="/treasure-hunt">{() => { window.location.replace("/rewards"); return null; }}</Route>
      <Route path="/shipping/lockers" component={LockerShippingPage} />
      <Route path="/shipping/labels" component={ShippingLabelsPage} />
      <Route path="/buyer-protection" component={BuyerProtectionPage} />
      <Route path="/cashback" component={CashbackPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Inner app (inside ClerkProvider + WouterRouter) ────────────────────────

function InnerApp() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Bazunk account" } },
        signUp: { start: { title: "Create your account", subtitle: "Join the UK's peer-to-peer marketplace" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthProvider>
          <UserCurrencySync />
            <CartProvider>
              <WatchlistProvider>
                <LiveStreamProvider>
                  <OfferProvider>
                    <ScrollToTop />
                    <Router />
                    <CartDrawer />
                    <Toaster />
                  </OfferProvider>
                </LiveStreamProvider>
              </WatchlistProvider>
            </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <TooltipProvider>
      <CurrencyProvider>
        <SiteSettingsProvider>
          <AdminProvider>
            <WouterRouter base={basePath}>
              <InnerApp />
            </WouterRouter>
          </AdminProvider>
        </SiteSettingsProvider>
      </CurrencyProvider>
    </TooltipProvider>
  );
}

export default App;
