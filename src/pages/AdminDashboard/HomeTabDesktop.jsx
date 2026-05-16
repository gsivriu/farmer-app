import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext.jsx";
import MarketTickerDesktop from "../../components/MarketTickerDesktop.jsx";
import ExchangeRatesCard from "../../components/ExchangeRatesCard.jsx";
import SiloPriceTable from "../../components/SiloPriceTable.jsx";
import { getProductLabelSafe } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { isFreightParity, formatLocationDisplay } from "../../utils/formatting";
import { supabase } from "../../supabaseClient";
import AdminBidDetailModal from "../../components/AdminBidDetailModal.jsx";

const T = {
  bg: "#F8F7F5",
  surface: "#FFFFFF",
  surface2: "#F2F1EF",
  border: "#E5E3DF",
  borderS: "#EFEDE9",
  ink: "#0F0F0E",
  ink2: "#6B6860",
  ink3: "#A8A49E",
  red: "#B9101E",
  redSoft: "#FDF1F2",
  ok: "#16A34A",
  okSoft: "#F0FDF4",
  warn: "#D97706",
  warnSoft: "#FFFBEB",
  err: "#DC2626",
  errSoft: "#FEF2F2",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace',
};

const PRODUCT_SYMBOL = {
  wheat: "GRA",
  corn: "PRM",
  rapeseed: "RAP",
  sunflower: "FSO",
  barley: "ORZ",
  feedwheat: "GRA-F",
};

const STATUS_TONE = {
  accepted: "ok",
  rejected: "err",
  countered: "warn",
  farmer_countered: "warn",
  pending: "warn",
};

const STATUS_LABEL = {
  accepted: "Acceptat",
  rejected: "Respins",
  countered: "Contra-ofertă",
  farmer_countered: "Răspuns fermier",
  pending: "În așteptare",
};

function Pill({ tone = "neutral", size = "sm", children }) {
  const tones = {
    neutral: { bg: T.surface2, fg: T.ink2, dot: T.ink3 },
    ok: { bg: T.okSoft, fg: T.ok, dot: T.ok },
    warn: { bg: T.warnSoft, fg: T.warn, dot: T.warn },
    err: { bg: T.errSoft, fg: T.err, dot: T.err },
    info: { bg: T.infoSoft, fg: T.info, dot: T.info },
    red: { bg: T.redSoft, fg: T.red, dot: T.red },
  };
  const c = tones[tone] || tones.neutral;
  const pad = size === "xs" ? "2px 7px" : "3px 9px";
  const fs = size === "xs" ? 10.5 : 11.5;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: pad,
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: 0.02,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c.dot }} />
      {children}
    </span>
  );
}

function Delta({ value, suffix = "%" }) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const up = v >= 0;
  const color = v === 0 ? T.ink2 : up ? T.ok : T.err;
  const arrow = v === 0 ? "·" : up ? "▲" : "▼";
  const abs = Math.abs(v).toFixed(2);
  return (
    <span
      className="am-mono"
      style={{ color, fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <span style={{ fontSize: 9, lineHeight: 1 }}>{arrow}</span>
      {abs}
      {suffix}
    </span>
  );
}

function Card({ children, padding = 16, style }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, unit, delta }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.06,
          textTransform: "uppercase",
          color: T.ink2,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="am-mono"
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: T.ink,
            letterSpacing: -0.4,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: T.ink2, fontWeight: 500 }}>{unit}</span>}
      </div>
      {delta !== undefined && delta !== null && (
        <div style={{ marginTop: 6 }}>
          <Delta value={delta} />
        </div>
      )}
    </div>
  );
}

function injectBaseCss() {
  if (typeof document === "undefined" || document.getElementById("am-home-base")) return;
  const s = document.createElement("style");
  s.id = "am-home-base";
  s.textContent = `
    .am-home { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif; color: ${T.ink}; font-variant-numeric: tabular-nums; background: ${T.bg}; min-height: 100%; }
    .am-home * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .am-home .am-mono { font-family: ${T.mono}; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
    .am-home .am-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: ${T.ink2}; font-weight: 600; }
    .am-home input.am-input { font-family: ${T.mono}; font-variant-numeric: tabular-nums; background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 8px; height: 36px; padding: 0 12px; font-size: 13.5px; font-weight: 600; color: ${T.ink}; width: 100%; outline: none; }
    .am-home input.am-input:focus { border-color: ${T.red}; box-shadow: 0 0 0 3px ${T.redSoft}; }
    .am-home select.am-select { font-family: inherit; background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 8px; height: 36px; padding: 0 10px; font-size: 12.5px; font-weight: 500; color: ${T.ink}; outline: none; cursor: pointer; width: 100%; }
    .am-home button.am-btn { font-family: inherit; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 12.5px; height: 36px; padding: 0 14px; border: 1px solid transparent; transition: filter .15s ease, background-color .15s ease; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
    .am-home button.am-btn:hover { filter: brightness(0.96); }
    .am-home button.am-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .am-home button.am-btn-primary { background: ${T.red}; color: #fff; border-color: ${T.red}; }
    .am-home button.am-btn-ghost { background: transparent; color: ${T.ink}; border-color: ${T.border}; }
    .am-home button.am-btn-stop { background: transparent; color: ${T.err}; border-color: ${T.err}; filter: none; }
    .am-home button.am-btn-stop:hover { background: ${T.errSoft}; filter: none; }
    .am-home .am-activity-row { transition: background-color .12s ease; }
    .am-home .am-activity-row:hover { background: ${T.surface2} !important; }
    .am-home .am-wrap-existing { padding: 0; }
    .am-home .am-wrap-existing > * { margin: 0 !important; }
    .am-home .am-wrap-existing .home-page { padding: 0 !important; gap: 0 !important; }
  `;
  document.head.appendChild(s);
}

function formatNum(n, decimals = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("ro-RO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `acum ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `acum ${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) return `acum ${days}z`;
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getBidDisplayPrice(b) {
  const s = String(b?.status || "").toLowerCase();
  if (s === "accepted") {
    if (b.final_price != null && Number.isFinite(Number(b.final_price))) return Number(b.final_price);
    if (hasPositiveNumber(b.counter_price)) return Number(b.counter_price);
  }
  if (hasPositiveNumber(b?.counter_price)) return Number(b.counter_price);
  return Number(b?.price);
}

function getBidCurrency(b) {
  return b?.currency || (b?.product === "sunflower" ? "USD" : "EUR");
}

function formatParity(b) {
  if (!b?.parity) return "—";
  const parity = String(b.parity).toUpperCase();
  const delivery = formatLocationDisplay(b.delivery_location || "");
  const loading = formatLocationDisplay(b.loading_location || "");
  if (isFreightParity(parity)) {
    return loading && delivery ? `${parity} ${loading} la ${delivery}` : `${parity} ${loading || delivery || "—"}`;
  }
  return delivery ? `${parity} ${delivery}` : parity;
}

export default function HomeTabDesktop() {
  const { commodities, bids, fetchBids, updateCommodityPrice, stopCommodity } = useAppContext();

  const [draftPrices, setDraftPrices] = useState({});
  const [draftCurrencies, setDraftCurrencies] = useState({});
  const [priceNotice, setPriceNotice] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [loadingStop, setLoadingStop] = useState({});
  const [farmersMap, setFarmersMap] = useState({});
  const [selectedBid, setSelectedBid] = useState(null);

  useEffect(() => {
    injectBaseCss();
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "farmer")
      .then(({ data }) => {
        if (!mounted || !data) return;
        const map = {};
        for (const p of data) map[p.id] = p;
        setFarmersMap(map);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setDraftPrices(Object.fromEntries((commodities || []).map((c) => [c.id, String(c.price ?? "")])));
    setDraftCurrencies(Object.fromEntries((commodities || []).map((c) => [c.id, c.currency || "EUR"])));
  }, [commodities]);

  const handleSavePrice = async (id) => {
    const raw = draftPrices[id];
    const num = Number(raw);
    if (!raw || String(raw).trim() === "" || !Number.isFinite(num) || num <= 0) {
      alert("Introdu un preț valid, mai mare decât 0.");
      return;
    }
    const currency = draftCurrencies[id] || "EUR";
    setSavingId(id);
    const { error } = await updateCommodityPrice(id, num, currency);
    setSavingId(null);
    if (error) {
      alert("Eroare la actualizarea prețului: " + error.message);
      return;
    }
    setPriceNotice(`Preț actualizat: ${getProductLabelSafe(id)}.`);
    window.setTimeout(() => setPriceNotice(""), 3500);
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
    window.setTimeout(() => setPriceNotice(""), 3500);
  };

  // ── Derived KPIs ───────────────────────────────────────────────
  const kpis = useMemo(() => {
    const today = todayKey();
    const list = bids || [];
    let openCount = 0;
    let acceptedTodayCount = 0;
    let qtyToday = 0;
    let valueTodayEur = 0;
    for (const b of list) {
      const s = String(b.status || "").toLowerCase();
      const isOpen = s === "pending" || s === "countered" || s === "farmer_countered";
      if (isOpen) openCount += 1;
      const isToday = String(b.created_at || "").slice(0, 10) === today;
      if (isToday && s === "accepted") acceptedTodayCount += 1;
      if (isToday) {
        const qty = Number(b.quantity || 0);
        const price =
          s === "accepted" && Number(b.counter_price) > 0
            ? Number(b.counter_price)
            : Number(b.counter_price) > 0
              ? Number(b.counter_price)
              : Number(b.price || 0);
        qtyToday += Number.isFinite(qty) ? qty : 0;
        if (Number.isFinite(qty) && Number.isFinite(price)) valueTodayEur += qty * price;
      }
    }
    return { openCount, acceptedTodayCount, qtyToday, valueTodayEur };
  }, [bids]);

  // ── Live activity ──────────────────────────────────────────────
  const liveEvents = useMemo(() => {
    const list = [...(bids || [])]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8);
    return list.map((b) => {
      const s = String(b.status || "").toLowerCase();
      const tone = STATUS_TONE[s] || "neutral";
      const label = STATUS_LABEL[s] || "În așteptare";
      const product = getProductLabelSafe(b.product);
      const qty = formatCompactNumber(b.quantity);
      const currency = getBidCurrency(b);
      const priceVal = getBidDisplayPrice(b);
      const farmer = farmersMap[b.farmer_id];
      const farmerName = farmer?.full_name || farmer?.email || b.farmer_email || "—";
      return {
        bid: b,
        id: b.id,
        tone,
        title: `${label} · ${product} · ${farmerName}`,
        meta: `${qty} t @ ${formatCompactNumber(priceVal)} ${currency}/t · ${formatParity(b)}`,
        when: formatTimeAgo(b.created_at),
      };
    });
  }, [bids, farmersMap]);

  // ── Render ─────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="am-home" style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Trading desk</div>
          <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 3 }}>
            {today} · {kpis.openCount} oferte deschise
          </div>
        </div>
        {priceNotice && (
          <div
            style={{
              fontSize: 12.5,
              color: T.ok,
              background: T.okSoft,
              padding: "6px 12px",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {priceNotice}
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card padding={16}>
          <Stat label="Oferte deschise" value={formatNum(kpis.openCount)} />
        </Card>
        <Card padding={16}>
          <Stat label="Volum azi" value={formatNum(kpis.qtyToday)} unit="t" />
        </Card>
        <Card padding={16}>
          <Stat label="Valoare azi" value={formatNum(kpis.valueTodayEur)} unit="€" />
        </Card>
        <Card padding={16}>
          <Stat label="Acceptate azi" value={formatNum(kpis.acceptedTodayCount)} />
        </Card>
      </div>

      {/* Two-column: Prețuri de listă + Live activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Prețuri de listă */}
        <Card padding={0}>
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Prețuri de listă</div>
              <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>
                Ameropa CPT Constanța · publicate către fermieri în timp real
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              fontSize: 10.5,
              color: T.ink3,
              fontWeight: 600,
              letterSpacing: 0.06,
              textTransform: "uppercase",
              borderBottom: `1px solid ${T.borderS}`,
            }}
          >
            <div style={{ flex: "0 0 35%" }}>Produs</div>
            <div style={{ flex: "0 0 15%", textAlign: "right" }}>Preț</div>
            <div style={{ flex: "0 0 12%" }}>Monedă</div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>Acțiuni</div>
          </div>
          {(commodities || []).map((c, i, arr) => {
            const isStopped = c.active === false;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderBottom: i === arr.length - 1 ? "none" : `1px solid ${T.borderS}`,
                }}
              >
                <div style={{ flex: "0 0 35%", minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {getProductLabelSafe(c.id, c.name)}
                    {isStopped && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: T.err, fontWeight: 600 }}>
                        · Oprit
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink2 }}>CPT Constanța</div>
                </div>
                <div style={{ flex: "0 0 15%" }}>
                  <input
                    className="am-input"
                    type="number"
                    step="0.5"
                    style={{ textAlign: "right" }}
                    value={draftPrices?.[c.id] ?? ""}
                    onChange={(e) => setDraftPrices((p) => ({ ...p, [c.id]: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
                <div style={{ flex: "0 0 12%" }}>
                  <select
                    className="am-select"
                    value={draftCurrencies?.[c.id] ?? "EUR"}
                    onChange={(e) => setDraftCurrencies((p) => ({ ...p, [c.id]: e.target.value }))}
                  >
                    <option value="EUR">EUR/t</option>
                    <option value="RON">RON/t</option>
                    <option value="USD">USD/t</option>
                  </select>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="am-btn am-btn-primary"
                    onClick={() => handleSavePrice(c.id)}
                    disabled={savingId === c.id}
                  >
                    {isStopped ? "Reactivează" : "Confirmă"}
                  </button>
                  {!isStopped && (
                    <button
                      type="button"
                      className="am-btn am-btn-stop"
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
          {(!commodities || commodities.length === 0) && (
            <div style={{ padding: 24, color: T.ink2, fontSize: 13 }}>Nu există produse configurate.</div>
          )}
        </Card>

        {/* Live activity */}
        <Card padding={0}>
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Activitate recentă</div>
            <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>
              Ultimele oferte trimise de fermieri
            </div>
          </div>
          <div>
            {liveEvents.length === 0 && (
              <div style={{ padding: 24, color: T.ink2, fontSize: 13 }}>Nu există activitate recentă.</div>
            )}
            {liveEvents.map((e, i) => {
              const dotColor =
                e.tone === "ok" ? T.ok : e.tone === "err" ? T.err : e.tone === "warn" ? T.warn : T.ink3;
              return (
                <button
                  type="button"
                  key={e.id || i}
                  onClick={() => setSelectedBid(e.bid)}
                  className="am-activity-row"
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 18px",
                    borderTop: i === 0 ? "none" : `1px solid ${T.borderS}`,
                    background: "transparent",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: dotColor,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>
                      {e.title}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: T.ink2, marginTop: 2 }}>
                      {e.meta}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, color: T.ink3, whiteSpace: "nowrap" }}>{e.when}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Reference markets + FX */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Piețe de referință</div>
            <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>CBOT · MATIF · contracte futures</div>
          </div>
          <MarketTickerDesktop />
        </Card>
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Cursuri valutare</div>
            <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>BNR · EUR/USD/RON</div>
          </div>
          <div style={{ padding: 18 }} className="am-wrap-existing">
            <ExchangeRatesCard />
          </div>
        </Card>
      </div>

      {/* Silo prices */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Prețuri silozuri</div>
          <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>
            Diferențe de preț pe locații față de CPT Constanța
          </div>
        </div>
        <div style={{ padding: 18 }} className="am-wrap-existing">
          <SiloPriceTable commodities={commodities} />
        </div>
      </Card>

      {selectedBid && (
        <AdminBidDetailModal
          bid={(bids || []).find((b) => b.id === selectedBid.id) || selectedBid}
          onClose={() => setSelectedBid(null)}
          onUpdated={fetchBids}
        />
      )}
    </div>
  );
}

