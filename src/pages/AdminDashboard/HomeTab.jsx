import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext.jsx";
import MarketTicker from "../../components/MarketTicker.jsx";
import SiloPriceTable from "../../components/SiloPriceTable.jsx";
import ExchangeRatesCard from "../../components/ExchangeRatesCard.jsx";
import { getProductLabelSafe } from "../../utils/productLabels";

export default function HomeTab() {
  const { commodities, updateCommodityPrice } = useAppContext();

  const [draftPrices, setDraftPrices] = useState({});
  const [draftCurrencies, setDraftCurrencies] = useState({});
  const [priceNotice, setPriceNotice] = useState("");

  useEffect(() => {
    setDraftPrices(
      Object.fromEntries((commodities || []).map((c) => [c.id, String(c.price)]))
    );
    setDraftCurrencies(
      Object.fromEntries((commodities || []).map((c) => [c.id, c.currency || "EUR"]))
    );
  }, [commodities]);

  const handleDraftChange = (id, value) => {
    setDraftPrices((prev) => ({ ...prev, [id]: value }));
  };

  const handleCurrencyChange = (id, value) => {
    setDraftCurrencies((prev) => ({ ...prev, [id]: value }));
  };

  const handleSavePrice = async (id) => {
    const raw = draftPrices[id];
    const num = Number(raw);

    if (!raw || raw.trim() === "") {
      alert("Enter a price before confirming.");
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      alert("Enter a valid price greater than 0.");
      return;
    }

    const currency = draftCurrencies[id] || "EUR";
    const { error } = await updateCommodityPrice(id, num, currency);
    if (error) {
      alert("Error updating price: " + error.message);
      return;
    }

    setDraftPrices((prev) => ({ ...prev, [id]: String(num) }));
    setPriceNotice(`New list price for ${getProductLabelSafe(id)} has been set.`);
  };

  return (
    <div className="home-page">
      <MarketTicker />
      <ExchangeRatesCard />

      <div className="list-price-section">
        <div className="list-price-header">
          <h2 className="list-price-title">List price</h2>
          {priceNotice && <p className="admin-price-notice">{priceNotice}</p>}
        </div>

        <div className="admin-grid">
          {(commodities || []).map((c) => (
            <div className="admin-price-item" key={c.id}>
              <div className="admin-label">{getProductLabelSafe(c.id, c.name)}</div>
              <div className="admin-row">
                <input
                  className="admin-input"
                  type="number"
                  step="0.01"
                  value={draftPrices?.[c.id] ?? ""}
                  onChange={(e) => handleDraftChange(c.id, e.target.value)}
                  placeholder="ex: 200"
                />
                <select
                  className="admin-currency-select"
                  value={draftCurrencies?.[c.id] ?? "EUR"}
                  onChange={(e) => handleCurrencyChange(c.id, e.target.value)}
                >
                  <option value="EUR">EUR/t</option>
                  <option value="RON">RON/t</option>
                  <option value="USD">USD/t</option>
                </select>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => handleSavePrice(c.id)}
                >
                  Confirm
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SiloPriceTable commodities={commodities} />
    </div>
  );
}
