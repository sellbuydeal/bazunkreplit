import { motion } from "framer-motion";
import { Link } from "wouter";
import { Lock, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SECTIONS = [
  {
    title: "1. Who We Are",
    body: `Bazunk Ltd ("we", "us", "our") is a marketplace platform registered in England and Wales. This Privacy Policy explains how we collect, use, and protect your personal data when you use our services at bazunk.com.`,
  },
  {
    title: "2. Data We Collect",
    body: `We collect data you provide directly (name, email address, billing information, listings, messages) and data collected automatically (IP address, device type, browser, pages visited, time on site). We also receive data from payment processors when you complete a transaction.`,
  },
  {
    title: "3. How We Use Your Data",
    body: `We use your data to: (a) operate your account and process transactions; (b) send transactional emails (order confirmations, shipping updates); (c) personalise your experience and recommend listings; (d) improve the Platform through analytics; (e) comply with legal obligations; (f) detect and prevent fraud.`,
  },
  {
    title: "4. Legal Basis for Processing",
    body: `We process your data on the following legal bases under UK GDPR: contractual necessity (to fulfil orders), legitimate interests (fraud prevention, improving the Platform), legal obligation (tax records, law enforcement requests), and your consent (marketing emails, which you may withdraw at any time).`,
  },
  {
    title: "5. Sharing Your Data",
    body: `We share your data with: payment processors (Stripe, PayPal) to complete transactions; shipping carriers when you provide a tracking number; fraud detection services; analytics providers (anonymised/aggregated only). We do not sell your personal data to third parties.`,
  },
  {
    title: "6. Cookies",
    body: `We use essential cookies (required for login and cart functionality), analytical cookies (to understand how you use the Platform), and preference cookies (to remember your settings). You can control non-essential cookies via our Cookie Settings. Refusing analytical cookies will not affect your ability to use the Platform.`,
  },
  {
    title: "7. Data Retention",
    body: `We retain account data for as long as your account is active, plus 7 years for financial records (legal requirement). If you close your account, personal data is deleted within 30 days, except where retention is legally required.`,
  },
  {
    title: "8. Your Rights",
    body: `Under UK GDPR, you have the right to: access your personal data; correct inaccurate data; request deletion ("right to be forgotten"); restrict or object to processing; data portability; withdraw consent at any time. To exercise these rights, contact us via the Support Centre.`,
  },
  {
    title: "9. International Transfers",
    body: `Some of our service providers operate outside the UK/EEA. Where we transfer data internationally, we ensure adequate safeguards are in place (Standard Contractual Clauses or adequacy decisions) in accordance with UK GDPR.`,
  },
  {
    title: "10. Security",
    body: `We implement industry-standard security measures including TLS encryption for all data in transit, hashed passwords (never stored in plain text), regular security audits, and access controls limiting who can view your data internally.`,
  },
  {
    title: "11. Children's Privacy",
    body: `The Platform is not directed at children under 18. We do not knowingly collect data from minors. If you believe a child has provided us personal data, please contact our support team and we will delete it promptly.`,
  },
  {
    title: "12. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent notice on the Platform at least 14 days before they take effect. Continued use of the Platform after changes constitutes acceptance.`,
  },
  {
    title: "13. Contact & Complaints",
    body: `For privacy questions or to exercise your rights, visit our Support Centre. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk if you believe we have mishandled your data.`,
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-white border-b py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-gray-900">
              Privacy Policy
            </motion.h1>
          </div>
          <p className="text-sm text-gray-400">Last updated: 1 January 2025 · UK GDPR compliant</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-3xl flex-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-7">
          <p className="text-sm text-gray-500 leading-relaxed border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-3 rounded-r-xl">
            Your privacy matters to us. This policy explains clearly what data we collect, why we collect it, and how you can control it. We will never sell your personal data.
          </p>

          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <h2 className="text-base font-bold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{section.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/terms" className="text-sm text-[#4A5CE8] hover:underline font-semibold">Terms of Service</Link>
          <span className="text-gray-300">·</span>
          <Link href="/support" className="text-sm text-[#4A5CE8] hover:underline font-semibold">Support Centre</Link>
          <span className="text-gray-300">·</span>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Back to Home</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
