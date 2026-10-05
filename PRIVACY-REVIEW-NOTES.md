# Publication blockers and changes

This is a regional privacy draft, not certified compliance. Replace PrivacyPage.tsx only after the facts and required processes are confirmed. The source page deliberately flags unverified practices rather than presenting them as established. Resolve those passages into accurate disclosures before publication.

Changes: coverage of fees/snapshots, refunds/payouts, credits, rewards/referrals, messages, public profiles, imports, verification and live video; removal of unverified PayPal integration, anonymous-only analytics, universal seven-year retention, 30-day deletion, audit guarantees, and continued-use-as-consent.

Material code findings:
- Dashboard SecuritySection writes the entered new password to localStorage sbd_password and simulates success. Do not use this flow. Replace with real authentication-provider password management and remove stored values safely. This patch does not fix it.
- Public seller profile URLs contain seller email addresses.
- AdSlot executes administrator-configured external advertising scripts without a consent gate in that component. Audit actual deployed scripts. Do not make an unconditional no-sale/no-sharing claim until assessed.
- No verified Cookie Settings/consent manager or GPC handling was found in the reviewed flows.
- Verification logs save raw webhook payloads. Inspect real field categories, access and retention, without exposing identity documents or secrets.

Before publication verify actual providers, hosting countries, controller/processor roles, contracts and transfer mechanisms; define retention schedules/deletion workflows; identify analytics/advertising cookies and establish required consent/opt-outs; establish UK/EU representative and DPO requirements/contact details; assess sensitive/biometric legal conditions; verify US applicability thresholds, last-12-month disclosures, appeal/agent handling and signals. Confirm no-sale/no-sharing facts rather than deleting transparency about them. Verify rights request channels are monitored and meet current deadlines. UK guidance is being updated following the Data (Use and Access) Act; have counsel check commencement and current requirements.

Sources:
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/
- https://europa.eu/youreurope/citizens/consumers/internet-telecoms/data-protection-online-privacy/index_en.htm
- https://oag.ca.gov/privacy/ccpa
- https://www.doj.state.or.us/consumer-protection/id-theft-data-breaches/privacy/

The ZIP contains one changed source file plus readable drafts and these notes. No authentication, tracking, consent, deletion or other processing behaviour is changed by this patch. No live publication has occurred.
