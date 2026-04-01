import { useEffect, useState } from "react";
import { getExchangeRates } from "../services/currencyService";
import CurrencyConverterModal from "./CurrencyConverterModal";

export default function ExchangeRatesCard() {
  const [rates, setRates] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDateDMY = (value) => {
    if (!value) return "-";
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [y, m, d] = str.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    const dt = new Date(str);
    if (Number.isNaN(dt.getTime())) return str;
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = String(dt.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  useEffect(() => {
    let mounted = true;
    const fetchRates = async () => {
      const data = await getExchangeRates();
      if (mounted && data) setRates(data);
    };
    fetchRates();
    return () => {
      mounted = false;
    };
  }, []);

  if (!rates) {
    return <p className="small-text">Loading exchange rates...</p>;
  }

  return (
    <div className="exchange-card">
      <div className="exchange-card-header">
        <p className="section-label">Exchange</p>
        <div className="exchange-header-actions">
          <div className="small-text exchange-updated">
            Updated: {formatDateDMY(rates.lastUpdated)}
          </div>
          <button
            type="button"
            className="exchange-calc-btn"
            onClick={() => setIsModalOpen(true)}
            aria-label="Open currency converter"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="3" width="14" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="10" y2="12" />
              <line x1="12" y1="12" x2="14" y2="12" />
              <line x1="16" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="10" y2="16" />
              <line x1="12" y1="16" x2="14" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="exchange-grid">
        <div className="exchange-row">
          <span>🇪🇺 1 EUR</span>
          <span className="exchange-value">{rates.ronToEur} RON</span>
        </div>
        <div className="exchange-row">
          <span>🇺🇸 1 USD</span>
          <span className="exchange-value">{rates.ronToUsd} RON</span>
        </div>
      </div>
      <div className="exchange-row exchange-row-muted exchange-parity-row">
        <span>EUR/USD parity</span>
        <span className="exchange-value">{rates.eurToUsd}</span>
      </div>

      <CurrencyConverterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rates={rates}
      />
    </div>
  );
}
