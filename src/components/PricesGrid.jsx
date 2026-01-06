import React from "react";
import { useAppContext } from "../context/AppContext.jsx";

export default function PricesGrid() {
  const { commodities } = useAppContext();
  const todayLabel = new Date().toLocaleDateString("ro-RO");

  const getTrendClass = (trend, lastPrice) => {
    if (trend === "up") return "market-item-up";
    if (trend === "down") return "market-item-down";
    if (trend === "flat") return "market-item-flat";
    if (lastPrice == null) return "market-item-flat";
    return "market-item-flat";
  };

  return (
    <div className="market-card prices-card">
      <div className="market-card-header">
        <h3 className="market-title">Prețuri Ameropa CPT Constanța</h3>
        <p className="market-subtitle">
          Actualizate astăzi {todayLabel} după ora 12:00.
        </p>
      </div>

      <div className="market-grid">
        {commodities.map((c) => {
          
          // ----------------------
          // USD pentru floarea soarelui
          // ----------------------
          const unit = c.id === "sunflower" ? "USD/t" : "EUR/t";

          // Pentru afișare săgeată + schimbare
          let trendText = "";
          if (c.lastPrice !== null) {
            if (c.trend === "up") trendText = `↑ +${c.priceChange}`;
            if (c.trend === "down") trendText = `↓ ${c.priceChange}`;
            if (c.trend === "flat") trendText = `→ 0`;
          }

          const trendClass = getTrendClass(c.trend, c.lastPrice);

          return (
            <div key={c.id} className={"market-item " + trendClass}>
              <div className="market-line-1">
                <span className="market-product">{c.name}</span>
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
