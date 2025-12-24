// src/components/MarketTicker.jsx

// Valorile sunt demo – le poți înlocui cu API real
const FUTURES = [
    // MATIF Wheat
    {
      id: 1,
      market: "MATIF",
      product: "Grâu",
      contract: "Mar 25",
      price: 221.25,
      change: +1.75,
    },
  
    // MATIF Corn
    {
      id: 2,
      market: "MATIF",
      product: "Porumb",
      contract: "Jun 25",
      price: 205.50,
      change: -0.50,
    },
  
    // MATIF Rapeseed (NOU)
    {
      id: 3,
      market: "MATIF",
      product: "Rapiță",
      contract: "May 25",
      price: 435.25,
      change: +3.25,
    },
  
    // CBOT Corn (NOU)
    {
      id: 4,
      market: "CBOT",
      product: "Porumb",
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
      <div className="market-card">
        <div className="market-card-header">
          <h3 className="market-title">Market overview</h3>
          <p className="market-subtitle">
            MATIF / CBOT – mișcare zilnică față de sesiunea anterioară.
          </p>
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
  