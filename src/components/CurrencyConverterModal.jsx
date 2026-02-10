import { useMemo, useState } from "react";

const CURRENCIES = ["RON", "EUR", "USD"];

export default function CurrencyConverterModal({ isOpen, onClose, rates }) {
  const [amount, setAmount] = useState("1");
  const [fromCurrency, setFromCurrency] = useState("EUR");
  const [toCurrency, setToCurrency] = useState("RON");

  const conversionRate = useMemo(() => {
    if (!rates) return 0;
    if (fromCurrency === toCurrency) return 1;
    if (fromCurrency === "EUR" && toCurrency === "RON") return rates.ronToEur;
    if (fromCurrency === "RON" && toCurrency === "EUR") return 1 / rates.ronToEur;
    if (fromCurrency === "USD" && toCurrency === "RON") return rates.ronToUsd;
    if (fromCurrency === "RON" && toCurrency === "USD") return 1 / rates.ronToUsd;
    if (fromCurrency === "EUR" && toCurrency === "USD") return rates.eurToUsd;
    if (fromCurrency === "USD" && toCurrency === "EUR") return 1 / rates.eurToUsd;
    return 0;
  }, [rates, fromCurrency, toCurrency]);

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

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount);
  const safeAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const safeRate = Number.isFinite(conversionRate) ? conversionRate : 0;
  const calculatedValue = safeAmount * safeRate;

  const formatNumber = (value, digits = 2) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0.00";
    return numeric.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  const formatInput = (value) => {
    if (!value) return "";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return value;
    const decimals = value.includes(".") ? value.split(".")[1].length : 0;
    return numeric.toLocaleString("en-US", {
      minimumFractionDigits: Math.min(decimals, 6),
      maximumFractionDigits: Math.min(decimals, 6),
    });
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleClear = () => {
    setAmount("");
  };

  return (
    <div className="converter-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="converter-modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Currency converter"
      >
        <div className="converter-modal-header">
          <h2>Currency Converter</h2>
          <button type="button" className="converter-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="converter-modal-subtitle">Quick conversion using today&apos;s rate</p>

        <div className="converter-swap-card">
          <div className="converter-card-row">
            <input
              type="text"
              inputMode="decimal"
              className="converter-currency-input"
              value={formatInput(amount)}
              onChange={(event) => {
                const raw = event.target.value.replace(/,/g, "");
                if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                  setAmount(raw);
                }
              }}
              placeholder="0"
            />
            <select
              className="converter-currency-badge"
              value={fromCurrency}
              onChange={(event) => setFromCurrency(event.target.value)}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <span className="converter-card-label">Amount sent</span>
        </div>

        <div className="converter-swap-separator">
          <button type="button" className="converter-swap-btn" onClick={handleSwap}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M7 10l5-6 5 6" />
              <path d="M17 14l-5 6-5-6" />
            </svg>
          </button>
        </div>

        <div className="converter-swap-card converter-output-card">
          <div className="converter-card-row">
            <span className="converter-currency-value">
              {amount ? formatNumber(calculatedValue) : "0.00"}
            </span>
            <select
              className="converter-currency-badge"
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value)}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <span className="converter-card-label">Estimated amount</span>
        </div>

        <div className="converter-actions">
          <button type="button" className="converter-clear-btn" onClick={handleClear}>
            Clear
          </button>
        </div>

        <div className="converter-modal-footer">
          <div className="converter-info-icon">ℹ️</div>
          <div className="converter-rate-info">
            <div>
              1 {fromCurrency} ≈ {formatNumber(safeRate, 4)} {toCurrency}
            </div>
            <div className="converter-rate-date">
              Updated: {formatDateDMY(rates?.lastUpdated) || "Today"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
