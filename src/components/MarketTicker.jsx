// src/components/MarketTicker.jsx

// Demo values - can be replaced with live API data.
const FUTURES = [
    // MATIF Wheat
    {
      id: 1,
      market: "MATIF",
      product: "Wheat",
      contract: "Mar 25",
      price: 221.25,
      change: +1.75,
    },
  
    // MATIF Corn
    {
      id: 2,
      market: "MATIF",
      product: "Corn",
      contract: "Jun 25",
      price: 205.50,
      change: -0.50,
    },
  
    // MATIF Rapeseed
    {
      id: 3,
      market: "MATIF",
      product: "Rapeseed",
      contract: "May 25",
      price: 435.25,
      change: +3.25,
    },
  
    // CBOT Corn
    {
      id: 4,
      market: "CBOT",
      product: "Corn",
      contract: "Jul 25",
      price: 492.75,
      change: +0.75,
    },
  ];
  
  function getDeltaInfo(change) {
    const diff = change || 0;
  
    if (diff > 0) {
      return {
        arrow: "↗",
        sign: "up",
        label: `+${diff.toFixed(2)}`,
      };
    } else if (diff < 0) {
      return {
        arrow: "↘",
        sign: "down",
        label: diff.toFixed(2),
      };
    } else {
      return {
        arrow: "→",
        sign: "flat",
        label: "+0.00",
      };
    }
  }
  
  export default function MarketTicker() {
    return (
      <div className="market-card market-ticker">
        <div className="market-card-header">
          <h3 className="market-title">Market overview</h3>
          <p className="market-subtitle"></p>
        </div>
  
        <div className="market-grid">
          {FUTURES.map((f) => {
            const delta = getDeltaInfo(f.change);
  
            const itemClass =
              "market-item " +
              (delta.sign === "up"
                ? "market-item-up"
                : delta.sign === "down"
                ? "market-item-down"
                : "market-item-flat");
  
            const deltaClass =
              "market-delta " +
              (delta.sign === "up"
                ? "delta-up"
                : delta.sign === "down"
                ? "delta-down"
                : "delta-flat");
  
            return (
              <div key={f.id} className={itemClass}>
                <div className="market-line-1">
                  <span className="market-product">
                    {f.market} – {f.product}
                  </span>
                  <span className="market-tag">{f.contract}</span>
                </div>
  
                <div className="market-line-2">
                  <span className="market-price">{f.price.toFixed(2)}</span>
                </div>
  
                <span className={deltaClass}>
                  <span className="delta-arrow">{delta.arrow}</span>
                  {delta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
