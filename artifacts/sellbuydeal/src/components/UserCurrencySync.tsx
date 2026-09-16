import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { countryToCurrency } from "@/context/CurrencyContext";
import { CountrySetupModal, COUNTRY_STORAGE_KEY } from "@/components/CountrySetupModal";

export function UserCurrencySync() {
  const { user } = useAuth();
  const { setCurrency } = useCurrency();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setShowModal(false);
      return;
    }
    const stored = localStorage.getItem(COUNTRY_STORAGE_KEY(user.email));
    if (!stored) {
      setShowModal(true);
    } else if (stored !== "SKIP") {
      const currency = countryToCurrency(stored === "OTHER" ? "US" : stored);
      const savedCurrency = localStorage.getItem("sbd_currency");
      if (!savedCurrency) {
        setCurrency(currency);
      }
    }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user?.email) return null;

  return (
    <AnimatePresence>
      {showModal && (
        <CountrySetupModal
          email={user.email}
          onDone={() => setShowModal(false)}
        />
      )}
    </AnimatePresence>
  );
}
