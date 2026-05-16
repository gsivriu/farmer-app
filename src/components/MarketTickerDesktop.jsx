import { useEffect, useState } from "react";
import { getGrainFutures } from "../services/futuresService";

const T = {
  surface: "#FFFFFF",
  surface2: "#F2F1EF",
  border: "#E5E3DF",
  borderS: "#EFEDE9",
  ink: "#0F0F0E",
  ink2: "#6B6860",
  ink3: "#A8A49E",
  ok: "#16A34A",
  err: "#DC2626",
  errSoft: "#FEF2F2",
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
};

function injectCss() {
  if (typeof document === "undefined" || document.getElementById("am-mt-base")) return;
  const s = document.createElement("style");
  s.id = "am-mt-base";
  s.textContent = `
    .am-mt { font-variant-numeric: tabular-nums; }
    .am-mt * { box-sizing: border-box; }
    .am-mt .am-mt-mono { font-family: ${T.mono}; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
    .am-mt .am-mt-section-head {
      display: flex; align-items: baseline; justify-content: space-between;
      padding: 14px 18px 10px;
    }
    .am-mt .am-mt-section-label {
      font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
      font-weight: 600; color: ${T.ink2};
    }
    .am-mt .am-mt-section-meta {
      font-size: 11.5px; color: ${T.ink3};
    }
    .am-mt .am-mt-block + .am-mt-block { border-top: 1px solid ${T.border}; }
    .am-mt .am-mt-product-head {
      padding: 14px 18px 8px;
      display: flex; align-items: baseline; gap: 10px;
    }
    .am-mt .am-mt-product-market {
      font-size: 13px; font-weight: 600; color: ${T.ink}; letter-spacing: -0.1px;
    }
    .am-mt .am-mt-product-sep { color: ${T.ink3}; font-size: 12px; }
    .am-mt .am-mt-product-name {
      font-size: 13px; font-weight: 600; color: ${T.ink};
    }
    .am-mt .am-mt-product-unit {
      font-size: 11.5px; color: ${T.ink3}; font-family: ${T.mono};
      margin-left: auto;
    }
    .am-mt .am-mt-row {
      display: grid;
      grid-template-columns: 1fr 100px 130px 90px;
      column-gap: 16px;
      align-items: center;
      padding: 0 18px;
      min-height: 40px;
    }
    .am-mt .am-mt-row.am-mt-header {
      min-height: 32px;
      border-bottom: 1px solid ${T.border};
      font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${T.ink3}; font-weight: 600;
    }
    .am-mt .am-mt-row.am-mt-data + .am-mt-row.am-mt-data { border-top: 1px solid ${T.borderS}; }
    .am-mt .am-mt-c-contract { color: ${T.ink}; font-size: 13.5px; font-weight: 500; letter-spacing: -0.1px; }
    .am-mt .am-mt-c-last { text-align: right; color: ${T.ink}; font-weight: 600; font-size: 14px; }
    .am-mt .am-mt-c-change { text-align: right; font-weight: 500; font-size: 12.5px; }
    .am-mt .am-mt-c-prev { text-align: right; color: ${T.ink3}; font-weight: 500; font-size: 12px; }
    .am-mt .am-mt-change-up { color: ${T.ok}; }
    .am-mt .am-mt-change-down { color: ${T.err}; }
    .am-mt .am-mt-change-flat { color: ${T.ink2}; }
    .am-mt .am-mt-change-arrow { font-size: 9px; margin-right: 4px; line-height: 1; }
    .am-mt .am-mt-error-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 3px 9px; border-radius: 999px;
      background: ${T.errSoft}; color: ${T.err};
      font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
    }
    .am-mt .am-mt-error-pill::before {
      content: ""; width: 5px; height: 5px; border-radius: 999px; background: ${T.err};
    }
    .am-mt .am-mt-skeleton {
      display: inline-block; background: ${T.surface2};
      border-radius: 4px; height: 11px;
    }
  `;
  document.head.appendChild(s);
}

function fmt(val, decimals = 2) {
  if (val == null || !Number.isFinite(Number(val))) return "—";
  return Number(val).toFixed(decimals).replace("-", "−");
}

function ChangeCell({ change, changePercent }) {
  if (change == null) return <span className="am-mt-c-change am-mt-change-flat">—</span>;
  const tone = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "·";
  const absChange = Math.abs(change).toFixed(2);
  const absPct = Math.abs(changePercent ?? 0).toFixed(2);
  return (
    <span className={`am-mt-c-change am-mt-mono am-mt-change-${tone}`}>
      <span className="am-mt-change-arrow">{arrow}</span>
      {absChange} <span style={{ color: T.ink3, fontWeight: 500 }}>({absPct}%)</span>
    </span>
  );
}

function ProductBlock({ product }) {
  return (
    <div className="am-mt-block">
      <div className="am-mt-product-head">
        <span className="am-mt-product-market">{product.market}</span>
        <span className="am-mt-product-sep">·</span>
        <span className="am-mt-product-name">{product.product}</span>
        <span className="am-mt-product-unit">{product.unit}</span>
      </div>
      <div className="am-mt-row am-mt-header">
        <div>Contract</div>
        <div style={{ textAlign: "right" }}>Last</div>
        <div style={{ textAlign: "right" }}>Δ</div>
        <div style={{ textAlign: "right" }}>Prev.</div>
      </div>
      {product.contracts.map((c) => (
        <div className="am-mt-row am-mt-data" key={c.label}>
          <div className="am-mt-c-contract">{c.label}</div>
          <div className="am-mt-c-last am-mt-mono">{fmt(c.price)}</div>
          <div>
            <ChangeCell change={c.change} changePercent={c.changePercent} />
          </div>
          <div className="am-mt-c-prev am-mt-mono">{fmt(c.prevClose)}</div>
        </div>
      ))}
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="am-mt-block">
      <div className="am-mt-product-head">
        <span className="am-mt-skeleton" style={{ width: 120 }} />
      </div>
      <div className="am-mt-row am-mt-header">
        <div>Contract</div>
        <div style={{ textAlign: "right" }}>Last</div>
        <div style={{ textAlign: "right" }}>Δ</div>
        <div style={{ textAlign: "right" }}>Prev.</div>
      </div>
      {[1, 2, 3].map((i) => (
        <div className="am-mt-row am-mt-data" key={i}>
          <div><span className="am-mt-skeleton" style={{ width: 80 }} /></div>
          <div style={{ textAlign: "right" }}><span className="am-mt-skeleton" style={{ width: 56 }} /></div>
          <div style={{ textAlign: "right" }}><span className="am-mt-skeleton" style={{ width: 90 }} /></div>
          <div style={{ textAlign: "right" }}><span className="am-mt-skeleton" style={{ width: 56 }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function MarketTickerDesktop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    injectCss();
  }, []);

  useEffect(() => {
    let mounted = true;
    getGrainFutures()
      .then((data) => {
        if (!mounted) return;
        if (!Array.isArray(data) || data.length === 0) {
          setError(true);
        } else {
          setProducts(data);
        }
        setFetchedAt(new Date());
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const timeLabel = fetchedAt
    ? fetchedAt.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="am-mt">
      <div className="am-mt-section-head">
        <span className="am-mt-section-label">Futures</span>
        {error ? (
          <span className="am-mt-error-pill">Feed offline</span>
        ) : (
          <span className="am-mt-section-meta">
            {loading ? "Se încarcă…" : timeLabel ? `Actualizat ${timeLabel}` : "Indicativ"}
          </span>
        )}
      </div>
      {loading
        ? [1, 2].map((i) => <SkeletonBlock key={i} />)
        : products.map((p) => <ProductBlock key={`${p.market}-${p.product}`} product={p} />)}
    </div>
  );
}
