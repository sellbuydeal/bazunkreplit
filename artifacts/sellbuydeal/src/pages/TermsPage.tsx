import { motion } from "framer-motion";
import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using Bazunk ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to all terms, do not use the Platform. We reserve the right to update these terms at any time with reasonable notice provided via email or on-site notification.`,
  },
  {
    title: "2. Eligibility",
    body: `You must be at least 18 years old to create an account or conduct transactions on the Platform. By registering, you confirm that all information you provide is accurate, current, and complete.`,
  },
  {
    title: "3. Account Responsibilities",
    body: `You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorised access to your account. Bazunk is not liable for losses resulting from unauthorised use of your account.`,
  },
  {
    title: "4. Listings and Transactions",
    body: `Sellers are solely responsible for the accuracy of their listings, including descriptions, pricing, and images. Listings must not include prohibited items (weapons, counterfeit goods, stolen property, etc.). Bazunk acts as a marketplace facilitator and is not a party to any transaction between buyers and sellers.`,
  },
  {
    title: "5. Fees and Payments",
    body: `Listing is free. A final value fee of 5–8% (depending on category) applies when an item sells. Fees are deducted automatically from the sale proceeds. Credit purchases are non-refundable. All fees are displayed transparently before you confirm a transaction.`,
  },
  {
    title: "6. Buyer Protection",
    body: `We offer Buyer Protection on eligible transactions. If an item doesn't arrive or significantly differs from its description, buyers may open a dispute within 30 days of the estimated delivery date. Refunds are issued at our discretion after reviewing evidence from both parties.`,
  },
  {
    title: "7. Prohibited Conduct",
    body: `You may not use the Platform to: (a) post fraudulent, misleading, or defamatory content; (b) engage in price manipulation or shill bidding; (c) circumvent our payment system; (d) harvest user data without consent; (e) upload malware or otherwise interfere with Platform operations.`,
  },
  {
    title: "8. Intellectual Property",
    body: `All Platform content, logos, and trademarks are the property of Bazunk Ltd. You retain ownership of content you upload but grant us a non-exclusive licence to display it on the Platform. You may not reproduce or redistribute our proprietary content without written permission.`,
  },
  {
    title: "9. Limitation of Liability",
    body: `To the maximum extent permitted by law, Bazunk shall not be liable for indirect, incidental, or consequential damages arising from your use of the Platform. Our total liability to you for any claim shall not exceed the fees you paid us in the 12 months preceding the claim.`,
  },
  {
    title: "10. Governing Law",
    body: `These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
  {
    title: "11. Contact",
    body: `For questions about these Terms, please visit our Support Centre or write to: Bazunk Ltd, 123 Commerce Street, London, EC1A 1BB, United Kingdom.`,
  },
];

export function TermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#4A5CE8]" />
            </div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-gray-900">
              Terms of Service
            </motion.h1>
          </div>
          <p className="text-sm text-gray-400">Last updated: 1 January 2025 · Effective immediately</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-3xl flex-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-7">
          <p className="text-sm text-gray-500 leading-relaxed border-l-4 border-[#4A5CE8] pl-4 bg-blue-50 py-3 rounded-r-xl">
            Please read these Terms of Service carefully before using the Bazunk platform. These terms constitute a legally binding agreement between you and Bazunk Ltd.
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
          <Link href="/privacy" className="text-sm text-[#4A5CE8] hover:underline font-semibold">Privacy Policy</Link>
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
