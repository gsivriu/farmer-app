import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext.jsx";
import MarketTicker from "../../components/MarketTicker.jsx";
import SiloPriceTable from "../../components/SiloPriceTable.jsx";
import ExchangeRatesCard from "../../components/ExchangeRatesCard.jsx";
import { getProductLabelSafe } from "../../utils/productLabels";

export default function HomeTab() {
  const { commodities, updateCommodityPrice, stopCommodity } = useAppContext();

  const [draftPrices, setDraftPrices] = useState({});
  const [draftCurrencies, setDraftCurrencies] = useState({});
  const [priceNotice, setPriceNotice] = useState("");
  const [loadingStop, setLoadingStop] = useState({});

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
      alert("Introdu un preț înainte de confirmare.");
      return;
    }
    if (!Number.isFinite(num) || num <= 0) {
      alert("Introdu un preț valid, mai mare decât 0.");
      return;
    }

    const currency = draftCurrencies[id] || "EUR";
    const { error } = await updateCommodityPrice(id, num, currency);
    if (error) {
      alert("Eroare la actualizarea prețului: " + error.message);
      return;
    }

    setDraftPrices((prev) => ({ ...prev, [id]: String(num) }));
    setPriceNotice(`Prețul de listă pentru ${getProductLabelSafe(id)} a fost actualizat.`);
  };

  const handleStop = async (id) => {
    setLoadingStop((prev) => ({ ...prev, [id]: true }));
    const { error } = await stopCommodity(id);
    setLoadingStop((prev) => ({ ...prev, [id]: false }));
    if (error) {
      alert("Eroare la oprirea produsului: " + error.message);
      return;
    }
    setPriceNotice(`Achiziții ${getProductLabelSafe(id)} oprite.`);
  };

  return (
    <div className="home-page">
      <MarketTicker />
      <ExchangeRatesCard />

      <div className="list-price-section">
        <div className="list-price-header">
          <h2 className="list-price-title">Prețuri de listă</h2>
          {priceNotice && <p className="admin-price-notice">{priceNotice}</p>}
        </div>

        <div className="admin-grid">
          {(commodities || []).map((c) => {
            const isStopped = c.active === false;
            return (
              <div
                className={"admin-price-item" + (isStopped ? " admin-price-item--stopped" : "")}
                key={c.id}
              >
                <div className="admin-label">
                  {getProductLabelSafe(c.id, c.name)}
                  {isStopped && <span className="admin-stopped-badge">Oprit</span>}
                </div>
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
                    {isStopped ? "Reactivează" : "Confirmă"}
                  </button>
                  {!isStopped && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--stop"
                      onClick={() => handleStop(c.id)}
                      disabled={loadingStop[c.id]}
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SiloPriceTable commodities={commodities} />
    </div>
  );
}
