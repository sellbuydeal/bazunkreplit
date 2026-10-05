import { useState } from 'react';
import { motion } from "framer-motion";
import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SECTIONS = [
  {
    "title": "1. About Bazunk and these terms",
    "body": "Bazunk is operated by Bazunk LLC, 2709 N Hayden Island Dr, STE 872346, Portland, Oregon, 97217, USA. These terms govern your use of the platform and the platform services we provide. The Privacy Policy explains our handling of personal data. Feature-specific rules and prices displayed before you use a service also apply. We will give reasonable notice of material changes and state when they take effect. Changes will not retrospectively alter fees already agreed for a completed checkout. Your mandatory legal rights remain unaffected. By using Bazunk, you agree to these shared terms and the regional terms applicable to your use and transactions, to the extent a valid agreement is formed under applicable law. All regional versions are available to read; viewing or selecting a version does not change your legal residence or waive mandatory rights. Applicable regional provisions take precedence over conflicting shared provisions. Where more than one legal system applies, mandatory protections remain effective."
  },
  {
    "title": "2. Eligibility and accounts",
    "body": "You must be at least 18 to create an account or transact on Bazunk. Provide accurate information, keep your login credentials secure and tell us promptly about suspected unauthorised access. You must not impersonate others, share an account to evade restrictions or create duplicate accounts to manipulate rewards. You are responsible for activity you authorise; this does not exclude our responsibility where the law makes us liable."
  },
  {
    "title": "3. Private and business sellers",
    "body": "You must accurately identify whether you sell privately or as a business or sole trader. Your legal status depends on your actual activity, not only your account selection. Business sellers must provide required identity, contact and trading information, comply with consumer law and tax obligations, and state their delivery and return arrangements. We may request evidence and correct a misclassified account. Verification confirms only the checks described by the platform; it is not a guarantee of an item, seller or transaction."
  },
  {
    "title": "4. Listings, imports and stores",
    "body": "Sellers must have the right to sell their items and use their listing images and descriptions. Listings must accurately describe condition, defects, price, availability, variants and delivery arrangements. Imported content must be checked before publication; an import tool does not grant permission to copy protected content. Sellers remain responsible for authorised use of third-party services and their own credentials. Store tools help organise seller activity and do not guarantee sales. Some store preferences may be saved only in your browser, rather than published to your public seller profile. Illegal, counterfeit, stolen, unsafe or otherwise prohibited items must not be listed. A category being available does not mean every item within it is permitted."
  },
  {
    "title": "5. Marketplace transactions and selling features",
    "body": "Bazunk facilitates transactions between buyers and sellers. The sale contract is with the seller identified on the listing; where Bazunk LLC is itself identified as seller, we have the corresponding seller obligations. Direct Sale, accepted offers, auctions, flash sales, classifieds and live selling are subject to their displayed rules. An offer or bid may create a commitment under those rules, subject to mandatory cancellation rights. Do not place bids or offers you do not intend to honour, bid on your own items or manipulate prices. A flash-sale countdown does not reserve stock. Classified enquiries and live broadcasts do not themselves confirm an order. Complete eligible purchases through Bazunk checkout; transactions arranged or paid outside it are outside Bazunk Buyer Protection."
  },
  {
    "title": "6. Selling fees and Buyer Protection charges",
    "body": "Private sellers pay no Bazunk listing fee or selling commission and receive the item price before any applicable refund or adjustment. Buyers pay Buyer Protection on personal-seller items: by default, 5% of their combined item price plus £0.70 once per checkout in GBP. In a mixed basket, the percentage applies only to personal-seller items and the fixed fee is charged once if such items are present. Business and sole-trader sellers pay a selling fee of 8% by default, including protection and support. Disclosed category rates may differ. Business-seller items carry no additional Buyer Protection charge for the buyer. Optional promotions and other paid tools are separate. Current applicable rates, delivery charges and the final amount are shown before payment; the cart amount may exclude Buyer Protection until checkout. Fees may change for future transactions with appropriate disclosure."
  },
  {
    "title": "7. Bazunk Credits: permitted uses and restrictions",
    "body": "Bazunk Credits may be purchased or earned through eligible rewards, milestones, referrals or daily games. They may be spent only on promotions and other platform tools expressly marked as accepting credits. Credits cannot pay or offset business or sole-trader selling commission, final-value or final transaction fees, Buyer Protection charges, the purchase price of an item, delivery charges, seller payouts or other checkout amounts. These restrictions apply equally to purchased, bonus and earned credits. Credits are not cash, are not a bank deposit and cannot be withdrawn or redeemed for cash, except where a refund is legally required. Any displayed monetary equivalent describes platform spending value, not a right to cash redemption. Credit package prices, bonus amounts and eligible uses are shown before purchase. Credits do not expire under the current policy; any proposed change will be communicated in advance and handled subject to your legal rights."
  },
  {
    "title": "8. Credit purchases and promotions",
    "body": "Credit purchases and activated promotions are normally final, subject to applicable cancellation, refund and other statutory rights. A statement that credits are non-refundable does not remove rights provided by law. Where an immediate digital supply or early service start affects a cancellation right, we will obtain the express consent and acknowledgement required by law through the relevant purchase flow; accepting these general terms alone is not that consent. Contact Support about mistaken charges, failed supply or applicable cancellation rights. Approved refunds of a credit purchase may require reversal of the associated unused credits and bonus credits. Promotions provide the placement or visibility described when purchased; they do not guarantee impressions, clicks, buyers or sales."
  },
  {
    "title": "9. Rewards, milestones, referrals and games",
    "body": "Reward eligibility, credit amounts, participation limits and any deadlines are set out in the relevant feature. Participation does not guarantee a reward unless you satisfy the displayed conditions. Rewards are platform credits rather than cash prizes. Do not use bots, fabricated activity, self-referrals, duplicate accounts or collusion to obtain rewards. We may investigate and reverse rewards obtained through abuse or error, explaining material action where appropriate. We may change future reward offers with notice appropriate to the circumstances, without unfairly removing rewards already validly earned."
  },
  {
    "title": "10. Payments and seller payouts",
    "body": "Payments are processed through the payment provider shown at checkout. New marketplace checkouts are charged in GBP; other displayed currency amounts may be indicative. Your bank or payment provider may apply its own conversion or other charges. Seller net proceeds are the item price less the applicable business selling fee and any lawful refund or adjustment; delivery charges are not automatically part of seller net proceeds. Seller payouts require an eligible connected payment account and any required identity checks. Delivery confirmation, admin review and unresolved disputes, returns, refunds or payment-provider restrictions may affect release. No immediate or fixed payout date is guaranteed. An earlier payout may need adjustment or recovery following a valid refund or payment reversal, subject to applicable law and payment-provider rules."
  },
  {
    "title": "11. Buyer Protection and dispute support",
    "body": "Buyer Protection supports eligible purchases completed through Bazunk checkout, including claims about non-delivery, damage or significant differences from the listing. Report problems promptly using the dashboard and within any applicable platform claim window displayed for your order. Provide accurate information, photographs and other relevant evidence, and cooperate with reasonable requests. We review evidence from both parties and work towards a fair resolution. Eligibility and outcomes depend on the circumstances and applicable rights; protection is not insurance or a guarantee of a particular result. Review and payment processing times vary. A platform claim deadline or an administrative decision does not remove statutory rights, rights against the seller or lawful access to courts or other remedies."
  },
  {
    "title": "12. Seller Protection and support",
    "body": "Seller protection provides dispute support and evidence-based review, including for business transactions where support is included in the selling fee. Sellers must accurately describe items, retain dispatch and delivery evidence, use Bazunk checkout for protected transactions and respond to reasonable support requests. We may request further evidence before resolving a claim or releasing a payout. Protection does not guarantee reimbursement for every loss, fraud claim or chargeback and does not remove seller obligations or buyer rights."
  },
  {
    "title": "13. Delivery, returns and refunds",
    "body": "Sellers must disclose delivery arrangements, dispatch within the agreed period and supply accurate tracking when available. Buyers must provide correct delivery details. Seller return policies apply only insofar as they are consistent with the law. Purchases from business sellers may carry statutory cancellation and remedies for faulty or misdescribed goods under the applicable regional law. A sale price does not remove statutory rights. The treatment of an auction depends on its format and the applicable law. Private-seller purchases generally do not carry the same change-of-mind cancellation rights as business sales, although agreed policies, misdescription rights and eligible protection claims may still apply. For digital content, any loss of a cancellation right requires the conditions and consent required by law. Approved refunds are normally returned to the original payment method. Whether item price, delivery and protection or service charges are refundable depends on the circumstances, applicable law and the relevant service. In multi-item baskets refunds are assessed against the affected order or item; an approved item refund does not automatically refund the entire basket. Marking an order cancelled does not by itself confirm that payment has been refunded."
  },
  {
    "title": "14. Messages, reviews, live content and conduct",
    "body": "Keep communications and reviews truthful, relevant and respectful. Do not publish unlawful content, harassment, threats, personal data without a lawful basis, fake reviews or misleading claims. Live sellers are responsible for content they broadcast and must hold rights to music, images and other material they use. Do not circumvent platform payments, scrape personal data, interfere with systems or exploit security weaknesses. We may moderate content and investigate reports. Reviews and verification badges are useful signals, not guarantees of future performance."
  },
  {
    "title": "15. Intellectual property and privacy",
    "body": "Bazunk branding and platform materials belong to Bazunk LLC or their respective licensors. You retain rights in content you submit and grant us a non-exclusive licence to host, display and use it as needed to operate and promote the platform, subject to applicable law and our Privacy Policy. You must have the rights and permissions needed for that use. Do not misuse other users’ personal information. Our Privacy Policy describes how we collect, use, retain and protect personal data."
  },
  {
    "title": "16. Availability, restrictions and closing accounts",
    "body": "Features may be unavailable during maintenance, outages or changes. We do not promise uninterrupted operation. We may restrict listings, rewards or accounts where reasonably necessary to address suspected unlawful activity, fraud, breaches of these terms or security risks. We will explain significant restrictions and provide a way to contact Support where appropriate, unless doing so would be unlawful or compromise an investigation. Restrictions do not automatically erase lawful entitlements to refunds or seller funds. Closing an account or deleting browser-saved store details does not cancel existing orders, debts, disputes or legally required records."
  },
  {
    "title": "17. Responsibility and liability",
    "body": "Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited, including liability for fraud or fraudulent misrepresentation, or death or personal injury caused by negligence. Your statutory consumer rights remain unaffected. If you are a consumer, we are responsible for foreseeable loss caused by our breach of contract or failure to exercise reasonable care and skill; we do not exclude that responsibility through a blanket fees-paid cap. If you use the platform for business, subject to the preceding exceptions and applicable law, we exclude indirect or consequential loss and loss of profit, and our aggregate contractual liability for platform services is limited to the platform service fees you paid us in the 12 months before the event giving rise to the claim. That limit does not reduce amounts lawfully owed to you as seller proceeds or approved refunds."
  },
  {
    "title": "18. Complaints and governing law",
    "body": "Contact Support first so we can review a complaint and explain our position. Applicable regional clauses below govern choice of law and courts. No platform claim window, internal decision or choice-of-law clause removes mandatory consumer protections or lawful access to courts and other remedies. The legal terms of an individual sale are also subject to the applicable law governing the buyer and seller."
  },
  {
    "title": "19. Contact",
    "body": "Bazunk LLC\n2709 N Hayden Island Dr\nSTE 872346\nPortland, Oregon, 97217\nUSA\nContact us through the Bazunk Support Centre for platform, fee, credit, order or account enquiries."
  }
];

const REGIONS = {
  "uk": {
    "label": "United Kingdom",
    "summary": "For UK users and transactions to which UK consumer protections apply. Northern Ireland, Scotland and Wales may have particular rules.",
    "sections": [
      [
        "UK 1. Consumer rights and trader information",
        "Business sellers must supply legally required pre-contract information, including their identity, contact details, total price, delivery terms and cancellation information. Consumer rights relating to goods, digital content and services apply where required by the Consumer Rights Act 2015 and other applicable law. These rights are separate from Bazunk protection and cannot be removed by a seller policy, discounted price or fees."
      ],
      [
        "UK 2. Distance sales and cancellation",
        "For eligible online purchases from a business, consumers generally have 14 days after receiving goods to notify the seller of cancellation, followed by a further 14 days to return them. Exceptions may apply, including certain personalised goods, perishables and unsealed hygiene items. Applicable law governs reimbursement deadlines, permitted deductions, standard delivery refunds and return postage. Private sales generally do not have the same statutory change-of-mind right. Online auctions are not automatically exempt from cancellation rules."
      ],
      [
        "UK 3. Digital content, credits and services",
        "Any statutory cancellation right for credits, promotions, digital content or platform services depends on the nature of the supply. Where required for immediate digital supply, express consent and acknowledgement of losing the cancellation right must be obtained separately. An early service start does not automatically remove all cancellation rights. Any lawful proportionate charge for services already supplied is subject to the applicable rules. General acceptance of these terms does not supply the required separate consent."
      ],
      [
        "UK 4. Faulty goods and remedies",
        "Applicable statutory remedies for faulty, unsafe or misdescribed goods and deficient services remain available, including rejection, repair, replacement or price reduction where the law provides them. A platform dispute deadline is not a limit on statutory claims. Business sellers must not describe all sales as final or use return policies to remove mandatory rights."
      ],
      [
        "UK 5. Law and courts",
        "For UK users, these platform terms are governed by the law of England and Wales, without depriving consumers of mandatory protections applicable where they live. Consumers may bring proceedings in courts available under applicable law, including appropriate courts in Scotland or Northern Ireland. For business users, the courts of England and Wales have jurisdiction, subject to mandatory law."
      ]
    ]
  },
  "eu": {
    "label": "European Union",
    "summary": "For EU users and transactions to which EU consumer protections apply. Member-state rules may provide additional protection.",
    "sections": [
      [
        "EU 1. Applicable consumer protections",
        "EU consumer protections and the national law implementing them apply where legally required, including when a trader directs activities to a consumer’s country. Business sellers must disclose legally required identity, contact, price, delivery, withdrawal and complaint information. Sellers must accurately declare trader status. Purchasing from a genuine private individual does not generally carry the same EU consumer rights as buying from a trader."
      ],
      [
        "EU 2. Withdrawal from distance contracts",
        "Consumers generally have a 14-day withdrawal period for eligible distance purchases from traders, with the starting date depending on whether goods, services or digital content are supplied. Withdrawal exceptions are determined by applicable law. Required information, reimbursement, standard delivery charges, return costs and permitted deductions are governed by the applicable rules. Send a clear withdrawal statement to the seller or, for Bazunk-supplied services, to Bazunk Support. Where a model withdrawal form is required, the trader must supply one; using it is not compulsory."
      ],
      [
        "EU 3. Goods and digital conformity rights",
        "Goods bought from traders normally carry at least a two-year legal guarantee of conformity, with repair or replacement and, where applicable, reduction in price or termination. National law may provide longer protection; permitted rules for second-hand goods vary. Digital content and services carry applicable conformity remedies and required updates. These statutory duties fall on the relevant trader or supplier, and are not a two-year insurance promise from Bazunk for every marketplace item."
      ],
      [
        "EU 4. Credits, early supply and mandatory refunds",
        "The shared restrictions on spending credits apply. They do not remove mandatory withdrawal, refund or conformity rights. Any loss of a withdrawal right for immediately supplied digital content requires the express prior consent, acknowledgement and confirmation required by law. For services, requesting an early start may lead to a lawful proportionate charge; full loss of withdrawal rights requires the applicable conditions. These terms alone do not provide the separate consent."
      ],
      [
        "EU 5. Platform decisions and legal remedies",
        "We provide explanations and routes to challenge relevant moderation decisions where required by applicable platform law. Contact Support to report unlawful content or contest a restriction. Internal review does not prevent access to other remedies required by law. Availability of particular complaint or out-of-court processes depends on applicable rules; these terms do not claim that every such service is already implemented."
      ],
      [
        "EU 6. Law and courts",
        "The shared platform contract uses the law of England and Wales only insofar as permitted. It does not deprive EU consumers of mandatory protections of the law of their habitual residence where applicable. Consumers retain the right to bring proceedings in courts available under applicable jurisdiction rules. For business users, the courts of England and Wales have jurisdiction, subject to mandatory law. This EU version is a common regional supplement, not a replacement for every member state’s requirements."
      ]
    ]
  },
  "usa": {
    "label": "United States",
    "summary": "For US users and transactions to which US law applies. Federal, state and local requirements may differ.",
    "sections": [
      [
        "US 1. Federal and state rights",
        "Applicable federal, state and local consumer protections govern US transactions. Business sellers must make truthful descriptions, shipping claims and price disclosures, including mandatory charges and applicable taxes. State-specific warranty, refund and other rights remain effective despite conflicting platform or seller wording."
      ],
      [
        "US 2. Shipment and delayed orders",
        "Where the FTC Mail, Internet, or Telephone Order Merchandise Rule applies, sellers must have a reasonable basis for shipping within the advertised time or, if no time is stated, generally within 30 days. If timely shipment cannot be made, sellers must provide the required delay notice and cancellation or refund options, obtaining consent where required. Exceptions and detailed timing rules are governed by the Rule. Bazunk’s platform process does not substitute for seller compliance."
      ],
      [
        "US 3. Returns, warranties and protection",
        "A UK or EU-style 14-day withdrawal right is not created for US users by displaying those regional terms. Returns depend on the disclosed seller policy and applicable law, including rights relating to defects, misdescription and warranties. Bazunk Buyer Protection is additional contractual support for eligible checkout orders; it is not insurance and does not override mandatory remedies."
      ],
      [
        "US 4. Credits and promotions",
        "The shared credit restrictions apply: credits cannot pay selling commission, final fees, Buyer Protection, items or delivery. Any mandatory state or federal rules concerning purchased balances, refunds, redemption or promotional offers prevail. Calling a balance “credits” does not determine its legal classification. Any statement about non-cash redemption or final purchases is subject to rights that cannot be waived."
      ],
      [
        "US 5. Liability and disputes",
        "Nothing excludes liability or remedies that federal or state law prevents us from excluding. No compulsory arbitration requirement or class-action waiver is imposed by this version. Contact Support to attempt to resolve a complaint; doing so does not waive lawful court access or other remedies."
      ],
      [
        "US 6. Law and courts",
        "For US users, these platform terms are governed by Oregon law, excluding conflict-of-law rules only insofar as legally permitted. Mandatory federal law and protections of your state remain effective. Proceedings may be brought in a court with lawful jurisdiction; consumers are not required by these terms to surrender any mandatory local forum right. This version does not establish a single rule overriding all state requirements."
      ]
    ]
  }
} as const;
type TermsRegion = keyof typeof REGIONS;

export function TermsPage() {
  const [region, setRegion] = useState<TermsRegion>("uk");
  const regionalTerms = REGIONS[region];
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
          <p className="text-sm text-gray-400">Last updated: 5 October 2026</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-3xl flex-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-7">
          <p className="text-sm text-gray-500 leading-relaxed border-l-4 border-[#4A5CE8] pl-4 bg-blue-50 py-3 rounded-r-xl">
            By using Bazunk, you agree to the shared marketplace terms and the regional terms applicable to your location and transactions, to the extent a valid agreement is formed under applicable law. You can read all three versions below. Your selection does not change your legal residence or remove mandatory local rights.
          </p>

          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Choose a regional version</h2>
            <div role="group" aria-label="Regional terms" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(REGIONS) as TermsRegion[]).map((key) => (
                <button key={key} type="button" aria-pressed={region === key} aria-controls={`terms-${key}`} id={`terms-tab-${key}`} onClick={() => setRegion(key)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${region === key ? "bg-[#4A5CE8] text-white border-[#4A5CE8]" : "bg-gray-50 text-gray-700 border-gray-200"}`}>{REGIONS[key].label}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">The shared rules apply to every version. Regional clauses apply where legally relevant and take priority over conflicting shared wording.</p>
          </div>
          <section id={`terms-${region}`} aria-labelledby={`terms-tab-${region}`} className="rounded-2xl bg-blue-50 border border-blue-100 p-5 space-y-5">
            <div><h2 className="font-bold text-lg text-gray-900">{regionalTerms.label} terms</h2><p className="text-sm text-gray-600 mt-2">{regionalTerms.summary}</p></div>
            {regionalTerms.sections.map(([title, body]) => <div key={title}><h3 className="font-bold text-sm text-gray-900 mb-2">{title}</h3><p className="text-sm text-gray-600 leading-relaxed">{body}</p></div>)}
          </section>
          <h2 className="text-xl font-bold text-gray-900">Shared marketplace terms</h2>
          {SECTIONS.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <h2 className="text-base font-bold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{section.body}</p>
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
