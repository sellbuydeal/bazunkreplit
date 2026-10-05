import { useState } from 'react';
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Lock, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SECTIONS = [
  {
    "title": "1. Controller and scope",
    "body": "Bazunk LLC operates the Bazunk marketplace and is responsible for personal data used to run its platform services. Our mailing address is 2709 N Hayden Island Dr, STE 872346, Portland, Oregon, 97217, USA. Contact the Support Centre or write to this address for privacy enquiries. This notice covers shared data practices and regional rights that apply where relevant. Sellers and service providers may separately be responsible for data they use for their own purposes. This notice is information about processing, not a request for blanket consent."
  },
  {
    "title": "2. Accounts and sources",
    "body": "We receive information directly from you, from other users involved in your transactions or communications, and from providers supplying authentication, payment, verification and delivery information. Account information may include name, username, email address, profile image, seller type, contact information and preferences. Authentication is integrated with Clerk; the sign-in method you select determines which authentication information its service processes. Required account, order and verification information is needed to provide the relevant feature. If you do not provide it, that feature may be unavailable."
  },
  {
    "title": "3. Listings, stores and public information",
    "body": "We process listing titles, descriptions, images, condition, category, prices, seller profiles, public reviews, reputation, verification badges and related activity. Content published to a listing or profile is visible to others and may be indexed by search engines. Seller profile links currently include the seller email address; do not treat that address as private. Some store details, addresses and preferences are stored in your browser. Deleting browser-saved store details does not delete your marketplace orders or server records. Do not publish documents or personal information you do not want others to see."
  },
  {
    "title": "4. Transactions, fees and payouts",
    "body": "We process cart items, order identifiers, buyer and seller contact information, delivery information, offer and auction activity, prices, currencies, seller classification, fee rates, Buyer Protection charges, delivery charges, seller net proceeds, refunds and payout status. Checkout fee records preserve the price, seller type and applicable fee calculation for that transaction. This supports accurate charging, dispute review, refunds, reconciliation and accounting. Stripe processes checkout payments and connected-account payouts. We receive payment and account identifiers and payment outcomes; full card information entered in Stripe checkout is handled by Stripe."
  },
  {
    "title": "5. Credits, promotions and rewards",
    "body": "We maintain credit purchases, earned and bonus credits, balances, spending, promotion activity, referrals, milestones and game participation or reward results. We use these records to grant valid rewards, provide purchased tools and investigate abuse. Credit restrictions in the Terms explain that credits cannot pay business selling fees, Buyer Protection or marketplace purchases. Reward participation and referral information may link accounts or activity for eligibility checks. A credit ledger is separate from seller funds and payment-card information."
  },
  {
    "title": "6. Messages, support, returns and disputes",
    "body": "We process messages, support tickets, reports, return requests, dispute statements, photographs, delivery evidence, refund records and administrative review or audit records. Other transaction participants receive the information needed to respond to a claim or complete an order. Authorised staff may access relevant records to provide support, resolve disputes, moderate content and investigate abuse. Avoid including unnecessary financial, identity, health or other sensitive details in messages or evidence."
  },
  {
    "title": "7. Identity verification and sensitive information",
    "body": "Where enabled, identity verification is provided through Didit. The verification workflow may request identity documents, images or other checks described in the provider’s collection notice. Bazunk stores verification identifiers, status and webhook records, which may include information returned by the provider. A public badge may display verification status. Payment providers may separately require seller verification. Do not assume that documents or other sensitive information stay solely with a provider. If biometric identification or other sensitive processing is required, the necessary lawful basis, notices and any required consent must be addressed at that collection point."
  },
  {
    "title": "8. Live selling and external broadcasts",
    "body": "Live features process audio, video, room or session identifiers, participation and chat information when you choose to broadcast or join relevant features. LiveKit supports live communications when configured. A broadcaster may choose to relay a stream to an external service such as YouTube. Your broadcast content may then be processed under that service’s policies. Content you publish can be seen or captured by viewers. This notice does not promise that all live sessions are recorded or that every copy made by others can be deleted."
  },
  {
    "title": "9. Device data and browser storage",
    "body": "Platform and infrastructure services may process IP addresses, browser and device information, request logs, timestamps and security events. The site uses browser storage for cart, watchlist, currency, store and other feature preferences or state; authentication providers may use cookies and related technologies. Browser controls can remove stored data, but may reset preferences or disrupt sessions. Browser controls alone are not a substitute for any legally required consent controls for non-essential technologies."
  },
  {
    "title": "10. Advertising and optional technologies",
    "body": "Bazunk can display internal promotions, external links and administrator-configured advertising scripts. Third-party advertising scripts can transmit device, usage and other personal data directly to their providers. The information they process is not necessarily anonymous. The providers and choices relevant to any optional tracking must be disclosed before it is enabled where required by law. This notice does not claim that a Cookie Settings tool or automatic browser opt-out handling is currently implemented. It does not authorise tracking for which consent or another legal condition is required."
  },
  {
    "title": "11. Purposes and legal bases",
    "body": "We use relevant data to provide accounts, listings, communications, orders, payments, promotions, credits and other services you request. For UK and EU processing, contractual necessity applies where processing is objectively necessary for our contract with you. Legal obligations apply to relevant accounting, lawful reporting and regulatory requirements. Legitimate interests may support proportionate security, fraud prevention, moderation, complaint handling and service improvement after weighing your rights. Consent applies where legally required, including relevant optional marketing, tracking or sensitive processing. The appropriate basis depends on the purpose; accepting terms is not blanket data-processing consent."
  },
  {
    "title": "12. Who receives information",
    "body": "Recipients may include transaction participants, authorised staff, authentication and payment providers, identity-verification providers, email-delivery providers such as Resend, live-communication providers such as LiveKit, hosting and database providers, and other suppliers necessary for configured features. Seller-import tools can send search or product requests to the selected third-party API or source. Advertising providers receive information where their scripts are enabled. We may disclose information where required by law or reasonably necessary to establish or defend legal claims, subject to legal limits. A business transfer may involve relevant records under appropriate safeguards. Recipients using data for their own purposes have their own notices."
  },
  {
    "title": "13. International processing",
    "body": "Bazunk is a US entity and providers may process information in other countries. Applicable UK or EU transfer rules must be met for restricted transfers, using an appropriate lawful mechanism such as an applicable adequacy decision or contractual safeguards, together with required assessments. Contact Support for information about recipients, destinations and safeguards relevant to your data. Listing possible mechanisms does not confirm that every provider or transfer uses a particular mechanism."
  },
  {
    "title": "14. Retention and deletion",
    "body": "Retention depends on the purpose, account status, unresolved orders or claims, payment reconciliation, applicable accounting or reporting duties, security needs and relevant limitation periods. Active account and feature information is retained while needed to provide the service. Financial and dispute records may remain after account closure where legally necessary or justified. There is no universal seven-year legal requirement or automatic promise to erase every record within 30 days. Following a valid deletion request we assess the records, explain applicable exceptions and delete or anonymise data no longer needed, subject to legal requirements. Backups and third-party/public copies may follow separate retention cycles. Browser-stored information also remains until cleared from that browser."
  },
  {
    "title": "15. Security",
    "body": "We use technical and organisational measures appropriate to the information and risks, but no system can guarantee complete security. Access to support, payment, verification and administrative records should be limited to authorised purposes. Authentication and payment providers maintain their own controls. This notice does not certify regular independent audits, universal encryption or that no feature ever stores an entered password. Do not store sensitive credentials in public listings, messages or store settings."
  },
  {
    "title": "16. Choices and privacy requests",
    "body": "Contact the Support Centre or write to our mailing address to request access, correction, deletion or another applicable privacy right. Describe the request and account concerned without sending a password or unnecessary identity documents. We may proportionately verify your identity or an authorised representative’s authority, explain any exception and respond within applicable legal time limits. You can object to direct marketing and withdraw consent for consent-based processing without affecting the lawfulness of earlier processing. A necessary order or account message is different from optional marketing. Regional rights and complaint routes appear below."
  },
  {
    "title": "17. Automated processing and review",
    "body": "Automated systems calculate fees, rewards and feature eligibility using transaction or activity data and may assist verification or security checks. These calculations do not establish that we use solely automated decisions with legal or similarly significant effects. Where such decision-making occurs, the required notice, safeguards and any applicable right to human review must be provided. Contact Support to query a verification result, restriction, fee or reward decision; additional regional rights may apply."
  },
  {
    "title": "18. Children and updates",
    "body": "Bazunk is intended for adults aged 18 or over. Contact Support if you believe an underage account or child’s information has been submitted; we will investigate and take appropriate restriction, deletion or retention action under applicable law. We may update this notice as features or processing change and provide notice of material changes where required. Continued use is not consent to a new processing purpose or a waiver of privacy rights. Required consent will be sought separately."
  }
];
const REGIONS = {
  "uk": {
    "label": "United Kingdom",
    "summary": "UK rights apply where UK data-protection law covers the processing, regardless of which version you select.",
    "sections": [
      [
        "UK privacy rights",
        "Subject to applicable conditions and exceptions, you may request access, correction, erasure, restriction and portability, and object to processing based on legitimate interests. You have a separate right to object to direct marketing. Consent may be withdrawn at any time. Applicable safeguards and rights apply to qualifying automated decisions. We respond within the applicable statutory period, normally one month, subject to lawful extensions and current procedural rules."
      ],
      [
        "UK cookies and transfers",
        "UK rules on cookies and similar technologies apply in addition to data-protection law. Technologies requiring consent must not be treated as authorised by this notice. For restricted transfers, applicable UK adequacy regulations, the UK International Data Transfer Agreement or the UK Addendum to relevant EU contractual clauses may be relevant; the actual mechanism must be verified for each transfer."
      ],
      [
        "UK complaints and representation",
        "You may complain to the Information Commissioner’s Office at https://ico.org.uk/make-a-complaint/. Contacting Bazunk first does not prevent a complaint. If a UK representative or data protection officer is legally required, their contact details must be provided separately and kept up to date. This draft does not name an appointment that has not been verified."
      ]
    ]
  },
  "eu": {
    "label": "European Union",
    "summary": "EU GDPR rights apply where the GDPR covers the processing. National ePrivacy and other rules may also apply.",
    "sections": [
      [
        "EU privacy rights",
        "Subject to GDPR conditions and exceptions, you may request access, correction, erasure, restriction and portability and object to legitimate-interest processing. You may object to direct marketing at any time and withdraw consent without affecting earlier lawful processing. Qualifying solely automated decisions have additional safeguards, including human intervention where applicable. Requests are normally answered within one month, with permitted extensions explained."
      ],
      [
        "EU consent and international transfers",
        "Consent must be specific, informed and freely given where relied on. These shared and regional notices do not provide blanket consent. National rules govern cookies and related technologies. Restricted transfers outside the EEA require an applicable GDPR transfer mechanism and any necessary additional safeguards. Ask Support about the actual safeguards used and how to obtain relevant information or a copy."
      ],
      [
        "EU complaints and representation",
        "You may complain to a supervisory authority in the member state of your habitual residence, place of work or alleged infringement. Your rights do not depend on choosing the EU button. Where an EU representative or data protection officer is required, their identity and contact details must be provided separately. No appointment or local establishment is asserted by this draft."
      ]
    ]
  },
  "usa": {
    "label": "United States",
    "summary": "Rights vary by state and depend on the relevant law’s coverage, thresholds and exceptions.",
    "sections": [
      [
        "US categories and purposes",
        "The shared notice identifies the categories of account identifiers, transaction and financial records, public content, communications, device/activity information, verification information and live audio/video processed for marketplace, security and service purposes. Some verification or other information may be sensitive under state law. Recipients and retention criteria are described above. Actual collection, disclosures and any required historical reporting must be verified against the services used."
      ],
      [
        "US requests, appeals and authorised agents",
        "Depending on your state and applicable law, rights may include knowing/accessing or obtaining a copy of data, correcting or deleting it, information about recipients, and opting out of sale, targeted advertising or qualifying profiling. Some laws provide rights to limit specified uses of sensitive information, use an authorised agent or appeal a refused request. Contact Support to exercise an applicable right or submit an appeal. We may verify identity/authority, explain exceptions and follow the time limits required by the applicable law. We will not unlawfully discriminate for exercising privacy rights."
      ],
      [
        "US sale, sharing and opt-out signals",
        "“Sale” and “sharing” can have broader legal meanings than selling a customer list for money. Third-party advertising disclosures may fall within those definitions. Before publication, the actual sale/sharing and targeted-advertising practices must be established and the required opt-out tools provided. Where law requires it, qualifying opt-out preference signals such as Global Privacy Control must be honoured. This notice does not claim the site already automatically processes those signals."
      ],
      [
        "US complaints",
        "Contact Support about a privacy concern. You may also contact the relevant state attorney general or regulator, including the California Attorney General or California Privacy Protection Agency for applicable California rights, or the Oregon Department of Justice for applicable Oregon rights. This notice does not assert that every state privacy statute applies to every Bazunk user."
      ]
    ]
  }
} as const;
type PrivacyRegion = keyof typeof REGIONS;

export function PrivacyPage() {
  const [region, setRegion] = useState<PrivacyRegion>("uk");
  const regional = REGIONS[region];
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
          <p className="text-sm text-gray-400">Last updated: 5 October 2026</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-3xl flex-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-7">
          <p className="text-sm text-gray-500 leading-relaxed border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-3 rounded-r-xl">
            This notice explains how Bazunk processes personal information across its marketplace features. Read the shared notice and the regional information applicable to your location and our processing. Selecting a version does not change your rights. This notice is not blanket consent, and using the site does not waive privacy rights.
          </p>

          <div role="group" aria-label="Regional privacy notices" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(REGIONS) as PrivacyRegion[]).map((key) => <button key={key} type="button" aria-pressed={region === key} aria-controls={`privacy-${key}`} id={`privacy-button-${key}`} onClick={() => setRegion(key)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${region === key ? "bg-emerald-700 border-emerald-700 text-white" : "bg-gray-50 border-gray-200 text-gray-700"}`}>{REGIONS[key].label}</button>)}
          </div>
          <section id={`privacy-${region}`} aria-labelledby={`privacy-button-${region}`} className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 space-y-5">
            <div><h2 className="font-bold text-lg text-gray-900">{regional.label} privacy notice</h2><p className="text-sm text-gray-600 mt-2">{regional.summary}</p></div>
            {regional.sections.map(([title, body]) => <div key={title}><h3 className="font-bold text-sm text-gray-900 mb-2">{title}</h3><p className="text-sm text-gray-600 leading-relaxed">{body}</p></div>)}
          </section>
          <h2 className="font-bold text-xl text-gray-900">Shared privacy notice</h2>
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
