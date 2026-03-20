import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext.jsx";
import MarketTicker from "../../components/MarketTicker.jsx";
import SiloPriceTable from "../../components/SiloPriceTable.jsx";
import ExchangeRatesCard from "../../components/ExchangeRatesCard.jsx";
import { getProductLabelSafe } from "../../utils/productLabels";

export default function HomeTab() {
  const { commodities, updateCommodityPrice } = useAppContext();

  const [draftPrices, setDraftPrices] = useState({});
  const [priceNotice, setPriceNotice] = useState("");

  useEffect(() => {
    setDraftPrices(
      Object.fromEntries((commodities || []).map((c) => [c.id, String(c.price)]))
    );
  }, [commodities]);

  const handleDraftChange = (id, value) => {
    setDraftPrices((prev) => ({ ...prev, [id]: value }));
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

    const { error } = await updateCommodityPrice(id, num);
    if (error) {
      alert("Error updating price: " + error.message);
      return;
    }

    setDraftPrices((prev) => ({ ...prev, [id]: String(num) }));
    setPriceNotice(`New list price for ${getProductLabelSafe(id)} has been set.`);
  };

  return (
    <div className="card admin-card dashboard-card">
      <MarketTicker />
      <div className="section-divider" />
      <ExchangeRatesCard />
      <div className="section-divider exchange-divider" />

      <div className="card-header admin-price-header">
        <h2 className="market-title">List price</h2>
        {priceNotice && <p className="admin-price-notice">{priceNotice}</p>}
      </div>

      <div className="admin-grid">
        {(commodities || []).map((c) => (
          <div className="admin-price-item" key={c.id}>
            <div className="admin-label">{getProductLabelSafe(c.id, c.name)}</div>
            <div className="admin-row">
              <input
                className="input admin-input"
                type="number"
                step="0.01"
                value={draftPrices?.[c.id] ?? ""}
                onChange={(e) => handleDraftChange(c.id, e.target.value)}
                placeholder="ex: 200"
              />
              <span className="admin-unit">
                {c.id === "sunflower" ? "USD/t" : "EUR/t"}
              </span>
              <button
                type="button"
                className="btn primary-btn admin-btn"
                onClick={() => handleSavePrice(c.id)}
              >
                Confirm
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="section-divider" />
      <SiloPriceTable commodities={commodities} />
    </div>
  );
}
