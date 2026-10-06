import { Link } from "wouter";
import { motion } from "framer-motion";

export function NewBuyerPromo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      className="mt-6 lg:mt-7"
    >
      <Link href="/welcome-new-buyers">
        <a
          className="block group rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
          aria-label="New buyer offer — learn more"
        >
          <img
            src="/new-buyer-home-banner.png"
            alt="New buyers: £5, $5 or €5 credit, first buyer protection fee covered by Bazunk, plus Buyer Protection"
            width={976}
            height={528}
            loading="lazy"
            className="block w-full h-auto transition-transform duration-300 group-hover:scale-[1.01]"
          />
        </a>
      </Link>
    </motion.div>
  );
}
