import React from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getProductLabelSafe } from "../utils/productLabels";

export default function PricesGrid() {
  const { commodities = [] } = useAppContext() || {};
  const todayLabel = new Date().toLocaleDateString("en-GB");

  const getTrendClass = (trend, lastPrice) => {
    if (trend === "up") return "market-item-up";
    if (trend === "down") return "market-item-down";
    if (trend === "flat") return "market-item-flat";
    if (lastPrice == null) return "market-item-flat";
    return "market-item-flat";
  };

  return (
    <div className="prices-open">
      <div className="prices-header">
        <p className="section-label">Ameropa CPT Constanta prices</p>
        <p className="prices-subtitle">Updated today {todayLabel} after 12:00.</p>
      </div>

      <div className="market-grid">
        {commodities.map((c) => {
          
          // Sunflower is quoted in USD.
          const unit = c.id === "sunflower" ? "USD/t" : "EUR/t";

          // Display trend arrow and price delta.
          let trendText = "";
          if (c.lastPrice !== null) {
            if (c.trend === "up") trendText = `↑ +${c.priceChange}`;
            if (c.trend === "down") trendText = `↓ ${c.priceChange}`;
            if (c.trend === "flat") trendText = `→ 0`;
          }

          const trendClass = getTrendClass(c.trend, c.lastPrice);
          const displayName = getProductLabelSafe(c.id, c.name);

          return (
            <div key={c.id} className={"market-item " + trendClass}>
              <div className="market-line-1">
                <span className="market-product">{displayName}</span>
                <span className="market-price-cell">
                  {Number(c.price).toFixed(2)} {unit}
                  <span
                    className={
                      "market-diff " +
                      trendClass +
                      (trendText ? "" : " market-diff-placeholder")
                    }
                    aria-hidden={!trendText}
                  >
                    {trendText || "↑ +0"}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
