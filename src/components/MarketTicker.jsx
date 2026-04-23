import { useEffect, useState } from "react";
import { getGrainFutures } from "../services/futuresService";

function fmt(val, decimals = 2) {
  if (val == null) return "—";
  // Use real minus sign (U+2212) instead of hyphen-minus from toFixed
  return val.toFixed(decimals).replace("-", "\u2212");
}

function ChangeCell({ change, changePercent }) {
  if (change == null) return <td className="ft-td ft-change ft-neutral">—</td>;
  const cls = change > 0 ? "positive" : change < 0 ? "negative" : "ft-neutral";
  const sign = change > 0 ? "+" : "";
  return (
    <td className={`ft-td ft-change ${cls}`}>
      {sign}{fmt(change)} ({sign}{fmt(changePercent)}%)
    </td>
  );
}

function ProductTable({ product, loading }) {
  return (
    <div className="ft-product">
      <div className="ft-product-header">
        <span className="ft-product-name">{product.market} · {product.product}</span>
        <span className="ft-product-unit">{product.unit}</span>
      </div>
      <table className="ft-table">
        <thead>
          <tr>
            <th className="ft-th">Contract</th>
            <th className="ft-th ft-right">Last</th>
            <th className="ft-th ft-right">+/−</th>
            <th className="ft-th ft-right">Prev.</th>
          </tr>
        </thead>
        <tbody>
          {product.contracts.map((c) => (
            <tr key={c.label} className="ft-tr">
              <td className="ft-td ft-contract">{c.label}</td>
              <td className="ft-td ft-right ft-last">{fmt(c.price)}</td>
              <ChangeCell change={c.change} changePercent={c.changePercent} />
              <td className="ft-td ft-right ft-prev">{fmt(c.prevClose)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="ft-product">
      <div className="ft-product-header">
        <span className="ticker-skeleton" style={{ width: 120, height: 12, display: "inline-block", borderRadius: 4 }} />
      </div>
      <table className="ft-table">
        <thead>
          <tr>
            {["Contract","Last","+/−","Prev."].map((h) => (
              <th key={h} className="ft-th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1,2,3].map((i) => (
            <tr key={i} className="ft-tr">
              {[80,56,90,56].map((w, j) => (
                <td key={j} className="ft-td">
                  <span className="ticker-skeleton" style={{ width: w, height: 11, display: "inline-block", borderRadius: 3 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketTicker() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    getGrainFutures().then((data) => {
      if (!mounted) return;
      setProducts(data);
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

      <div className="ft-grid">
        {loading
          ? [1, 2].map((i) => <SkeletonTable key={i} />)
          : products.map((p) => <ProductTable key={p.product} product={p} />)
        }
      </div>
    </div>
  );
}
