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
      <div>
        <div className="market-ticker">
          {FUTURES.map((f) => {
            const delta = getDeltaInfo(f.change);
            const deltaClass =
              "ticker-delta " +
              (delta.sign === "up"
                ? "positive"
                : delta.sign === "down"
                ? "negative"
                : "");

            return (
              <div key={f.id} className="market-ticker-item">
                <div className="ticker-label">
                  {f.market} · {f.product} · {f.contract}
                </div>
                <div className="ticker-value">{f.price.toFixed(2)}</div>
                <span className={deltaClass}>{delta.label}</span>
              </div>
            );
          })}
        </div>
        <p className="ticker-note">Indicative values only</p>
      </div>
    );
  }
  
