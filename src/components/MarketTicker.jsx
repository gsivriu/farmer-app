import { useEffect, useState } from "react";
import { getGrainFutures } from "../services/futuresService";

function getDeltaInfo(change) {
  const diff = change ?? 0;
  if (diff > 0) return { arrow: "↗", sign: "up",   label: `+${diff.toFixed(2)}` };
  if (diff < 0) return { arrow: "↘", sign: "down", label: diff.toFixed(2) };
  return       { arrow: "→", sign: "flat", label: "+0.00" };
}

function formatPrice(price, unit) {
  if (price == null) return "—";
  // USX/bu = US cents per bushel — display as-is (e.g. 445.75 ¢/bu)
  return price.toFixed(2);
}

export default function MarketTicker() {
  const [futures, setFutures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    getGrainFutures().then((data) => {
      if (!mounted) return;
      setFutures(data);
      setFetchedAt(new Date());
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const timeLabel = fetchedAt
    ? fetchedAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div>
      <div className="ticker-card-header">
        <span className="ticker-card-title">Futures</span>
        <span className="ticker-card-sub">
          {loading ? "Se încarcă…" : timeLabel ? `Actualizat ${timeLabel}` : "Indicativ"}
        </span>
      </div>

      <div className="market-ticker">
        {loading
          ? [1, 2, 3].map((i) => (
              <div key={i} className="market-ticker-item market-ticker-item--loading">
                <div className="ticker-label ticker-skeleton" />
                <div className="ticker-value ticker-skeleton" />
                <div className="ticker-skeleton ticker-skeleton--sm" />
              </div>
            ))
          : futures.map((f) => {
              const delta = getDeltaInfo(f.change);
              const deltaClass =
                "ticker-delta " +
                (delta.sign === "up" ? "positive" : delta.sign === "down" ? "negative" : "");

              return (
                <div key={f.symbol} className="market-ticker-item">
                  <div className="ticker-label">
                    {f.market} · {f.product} · {f.contract}
                    <span className="ticker-unit"> {f.unit}</span>
                  </div>
                  <div className="ticker-value">{formatPrice(f.price, f.unit)}</div>
                  {f.price != null ? (
                    <span className={deltaClass}>
                      {delta.arrow} {delta.label}
                      {f.changePercent != null && (
                        <span className="ticker-pct"> ({f.changePercent > 0 ? "+" : ""}{f.changePercent.toFixed(2)}%)</span>
                      )}
                    </span>
                  ) : (
                    <span className="ticker-delta">—</span>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
