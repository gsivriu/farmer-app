import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext.jsx";
import { getProductLabelSafe, PRODUCT_FILTER_KEYS } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../../utils/formatting";
import BidCardV2 from "../../components/features/BidCardV2.jsx";
import AdminBidDetailModal from "../../components/AdminBidDetailModal.jsx";
import "./BidsTab.css";

const PERIOD_OPTIONS = [
  { value: "all", label: "Toate" },
  { value: "1", label: "Astăzi" },
  { value: "7", label: "Ultimele 7 zile" },
  { value: "30", label: "Ultimele 30 zile" },
  { value: "90", label: "Ultimele 90 zile" },
  { value: "365", label: "Ultimul an" },
];

const periodCutoff = (value) => {
  if (!value || value === "all") return null;
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return null;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return cutoff;
};

const BidCardComponent = BidCardV2;

const formatDateOnly = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("ro-RO", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("ro-RO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

const getStatusLabel = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "accepted") return "Acceptat";
  if (value === "rejected") return "Respins";
  if (value === "countered") return "Contra-ofertă";
  if (value === "farmer_countered") return "Răspuns fermier";
  return "În așteptare";
};

const getAcceptedPrice = (bid) => {
  if (!bid) return null;
  const raw = bid.final_price != null ? bid.final_price
    : hasPositiveNumber(bid.counter_price) ? bid.counter_price
    : bid.price;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const formatParityDisplay = (bid, { detailed = false } = {}) => {
  if (!bid?.parity) return "-";
  const parity = String(bid.parity).toUpperCase();
  const delivery = formatLocationDisplay(bid.delivery_location || "-");
  const loading = formatLocationDisplay(bid.loading_location || "-");
  if (parity === "FCA" || parity === "FOB" || parity === "FOR") {
    return detailed
      ? `${parity} ${loading} cu livrare la ${delivery}`
      : `${parity} ${loading} la ${delivery}`;
  }
  return `${parity} ${delivery}`;
};

const parseOptionalNumber = (value) => {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
};

const normalizeOptionalText = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

function BidStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted")         return <span className="bid-status-badge bid-status-accepted">Acceptat</span>;
  if (s === "rejected")         return <span className="bid-status-badge bid-status-rejected">Respins</span>;
  if (s === "countered")        return <span className="bid-status-badge bid-status-countered">Contra-ofertă</span>;
  if (s === "farmer_countered") return <span className="bid-status-badge bid-status-countered">Răspuns fermier</span>;
  return <span className="bid-status-badge bid-status-pending">În așteptare</span>;
}

export default function BidsTab() {
  const { bids, fetchBids, addFarmerRewardsPoints } = useAppContext();

  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [listFarmerFilter, setListFarmerFilter] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterParity, setFilterParity] = useState("all");
  const [filterDeliveryFrom, setFilterDeliveryFrom] = useState("");
  const [filterDeliveryTo, setFilterDeliveryTo] = useState("");
  const [filterDeliveryLocation, setFilterDeliveryLocation] = useState("all");
  const [filterLoadingLocation, setFilterLoadingLocation] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("30");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [adminSelectedBid, setAdminSelectedBid] = useState(null);
  const [adminModalCounter, setAdminModalCounter] = useState("");
  const [adminModalFreight, setAdminModalFreight] = useState("");
  const [adminModalDelivery, setAdminModalDelivery] = useState("");
  const [adminModalOriginal, setAdminModalOriginal] = useState({ counter: "", freight: "", delivery: "" });
  const [adminConfirmAction, setAdminConfirmAction] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);

  useEffect(() => {
    if (!Array.isArray(bids)) return;
    const map = new Map();
    bids.forEach((b) => {
      if (!b.farmer_id) return;
      if (!map.has(b.farmer_id)) {
        map.set(b.farmer_id, { id: b.farmer_id, email: b.farmer_email || b.farmer_id });
      }
    });
    setFarmers(Array.from(map.values()));
    setLoading(false);
  }, [bids]);

  useEffect(() => {
    supabase
      .from("silo_price_configs")
      .select("silo_name")
      .order("silo_name", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) return;
        const map = new Map();
        (data || []).forEach((row) => { if (row?.silo_name) map.set(row.silo_name, true); });
        setDeliveryLocations(["Port Constanța", ...Array.from(map.keys())]);
      });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const hasFreightDetails = (bid, freightValue, deliveryValue) => {
    if (!isFreightParity(bid?.parity)) return true;
    const freightRaw = freightValue != null && String(freightValue).trim() !== "" ? freightValue : bid?.freight_cost;
    const deliveryRaw = deliveryValue != null && String(deliveryValue).trim() !== "" ? deliveryValue : bid?.delivery_location;
    const freightNum = Number(freightRaw);
    const hasFreight = freightRaw != null && String(freightRaw).trim() !== "" && Number.isFinite(freightNum) && freightNum > 0;
    return hasFreight && String(deliveryRaw || "").trim() !== "";
  };

  const getMissingFreightMessage = (bid, freightValue, deliveryValue) => {
    if (!isFreightParity(bid?.parity)) return null;
    const freightRaw = freightValue != null && String(freightValue).trim() !== "" ? freightValue : bid?.freight_cost;
    const deliveryRaw = deliveryValue != null && String(deliveryValue).trim() !== "" ? deliveryValue : bid?.delivery_location;
    const freightNum = Number(freightRaw);
    const hasFreight = freightRaw != null && String(freightRaw).trim() !== "" && Number.isFinite(freightNum) && freightNum > 0;
    const hasDelivery = String(deliveryRaw || "").trim() !== "";
    if (!hasFreight && !hasDelivery) return "Oferta nu a fost trimisă. Completează tariful de transport și locația de livrare.";
    if (!hasFreight) return "Oferta nu a fost trimisă. Completează tariful de transport.";
    if (!hasDelivery) return "Oferta nu a fost trimisă. Completează locația de livrare.";
    return null;
  };

  // Direct accept/reject from card — no modal, no freight validation needed
  const submitDirectDecision = async (action, bid) => {
    const { error } = await supabase.from("bids").update({ status: action }).eq("id", bid.id);
    if (error) { console.error("Decision error:", error.message); return; }
    if (action === "accepted" && bid.farmer_id) {
      await addFarmerRewardsPoints(bid.farmer_id, Number(bid.quantity || 0));
    }
    await fetchBids();
  };

  const submitAdminDecision = async (action, targetBid = null) => {
    const bid = targetBid ?? adminSelectedBid;
    if (!bid) return;
    const useModal = !targetBid;
    const freightValue = useModal ? adminModalFreight : bid.freight_cost;
    const deliveryValue = useModal ? adminModalDelivery : bid.delivery_location;
    const counterValue = useModal ? adminModalCounter : bid.counter_price;

    if (isFreightParity(bid.parity)) {
      const missingMessage = getMissingFreightMessage(bid, freightValue, deliveryValue);
      if (missingMessage) { setModalError(missingMessage); return; }
    }

    const payload = { status: action };
    if (action === "countered") {
      const counterNum = parseOptionalNumber(counterValue);
      if (!Number.isFinite(counterNum) || counterNum <= 0) { setModalError("Introdu un preț de contra-ofertă valid."); return; }
      payload.counter_price = counterNum;
      if (isFreightParity(bid.parity)) {
        const freightNum = parseOptionalNumber(freightValue);
        if (!Number.isFinite(freightNum) || freightNum <= 0) { setModalError("Introdu un tarif de transport valid."); return; }
        payload.freight_cost = freightNum;
        payload.delivery_location = normalizeOptionalText(deliveryValue);
      }
    }

    setModalError(null);
    const { error } = await supabase.from("bids").update(payload).eq("id", bid.id);
    if (error) { setModalError("Eroare la trimiterea actualizării: " + error.message); return; }

    if (action === "accepted" && bid.farmer_id) {
      await addFarmerRewardsPoints(bid.farmer_id, Number(bid.quantity || 0));
    }

    if (useModal) {
      setAdminSelectedBid(null);
      setAdminConfirmAction(null);
      setAdminModalCounter("");
      setAdminModalFreight("");
      setAdminModalDelivery("");
    }
    await fetchBids();
  };

  const openAdminModal = (bid, confirmAction = null) => {
    setAdminSelectedBid(bid);
    const counterValue = Number(bid.counter_price || 0) > 0 ? String(bid.counter_price) : "";
    const freightValue = Number(bid.freight_cost || 0) > 0 ? String(bid.freight_cost) : "";
    const deliveryValue = bid.delivery_location ?? "";
    setAdminModalCounter(counterValue);
    setAdminModalFreight(freightValue);
    setAdminModalDelivery(deliveryValue);
    setAdminModalOriginal({ counter: counterValue, freight: freightValue, delivery: deliveryValue });
    setAdminConfirmAction(confirmAction);
    setModalError(null);
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const periodCut = periodCutoff(filterPeriod);
  const scopedBids = (bids || []).filter((b) => {
    if (listFarmerFilter !== "all" && b.farmer_id !== listFarmerFilter) return false;
    if (filterProduct !== "all" && b.product !== filterProduct) return false;
    if (filterParity !== "all" && b.parity !== filterParity) return false;
    if (filterDeliveryLocation !== "all" && (b.delivery_location || "-") !== filterDeliveryLocation) return false;
    if (filterLoadingLocation !== "all" && (b.loading_location || "-") !== filterLoadingLocation) return false;
    if (filterDeliveryFrom || filterDeliveryTo) {
      const start = b.delivery_start ? b.delivery_start.slice(0, 10) : null;
      const end = b.delivery_end ? b.delivery_end.slice(0, 10) : null;
      if (!start || !end) return false;
      if (filterDeliveryFrom && start < filterDeliveryFrom) return false;
      if (filterDeliveryTo && end > filterDeliveryTo) return false;
    }
    if (periodCut) {
      if (!b.created_at) return false;
      const created = new Date(b.created_at);
      if (Number.isNaN(created.getTime()) || created < periodCut) return false;
    }
    return true;
  });

  const isPending = (s) => s === "pending" || s === "countered" || s === "farmer_countered";
  const statusCounts = scopedBids.reduce(
    (acc, b) => {
      acc.all += 1;
      if (b.status === "accepted") acc.accepted += 1;
      else if (b.status === "rejected") acc.rejected += 1;
      else if (isPending(b.status)) acc.pending += 1;
      return acc;
    },
    { all: 0, accepted: 0, rejected: 0, pending: 0 },
  );
  const totalVolume = scopedBids.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

  const filteredBids = scopedBids.filter((b) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return isPending(b.status);
    return b.status === filterStatus;
  });

  const statsRows = (() => {
    const map = new Map();
    filteredBids.forEach((b) => {
      const product = b.product || "unknown";
      const qty = Number(b.quantity || 0);
      const price = b.status === "accepted"
        ? Number(getAcceptedPrice(b) || 0)
        : Number(hasPositiveNumber(b.counter_price) ? b.counter_price : b.price ?? 0);
      if (!map.has(product)) map.set(product, { product, totalQty: 0, totalValue: 0 });
      const current = map.get(product);
      current.totalQty += qty;
      current.totalValue += qty * price;
    });
    return Array.from(map.values()).map((row) => ({
      ...row,
      avgPrice: row.totalQty ? row.totalValue / row.totalQty : 0,
    }));
  })();

  const statsTotalQty = statsRows.reduce((sum, row) => sum + Number(row.totalQty || 0), 0);

  const deliveryLocationOptions = Array.from(
    new Set((bids || []).map((b) => b.delivery_location || "-").filter((loc) => loc && loc.trim() !== ""))
  ).sort((a, b) => a.localeCompare(b));

  const loadingLocationOptions = Array.from(
    new Set((bids || []).map((b) => b.loading_location || "-").filter((loc) => loc && loc.trim() !== ""))
  ).sort((a, b) => a.localeCompare(b));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="card admin-card dashboard-card oferte-page">
        <header className="oferte-head">
          <div className="oferte-title">
            <h2>Oferte</h2>
            <div className="oferte-sub">
              <span className="stat"><strong>{statusCounts.all}</strong>&nbsp;total</span>
              <span className="sep" />
              <span className="stat"><strong>{statusCounts.accepted}</strong>&nbsp;acceptate</span>
              <span className="sep" />
              <span className="stat"><strong>{statusCounts.rejected}</strong>&nbsp;respinse</span>
              <span className="sep" />
              <span className="stat"><strong>{formatCompactNumber(totalVolume)}</strong>&nbsp;t volum</span>
            </div>
          </div>
          <div className="oferte-tools">
            <button type="button" className="btn small outline" onClick={() => setFiltersOpen(true)}>Filtre</button>
            <button type="button" className="btn small outline" onClick={() => setShowStats((prev) => !prev)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginRight: 5 }}>
                <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="5.5" y="4" width="3" height="9" rx="1" fill="currentColor" opacity="0.75"/>
                <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/>
              </svg>
              Statistici
            </button>
          </div>
        </header>

        <div className="oferte-filter-bar">
          <div className="oferte-tabs" role="tablist" aria-label="Filtrează după stare">
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "all"}
              className={"oferte-tab" + (filterStatus === "all" ? " is-on" : "")}
              onClick={() => setFilterStatus("all")}
            >
              Toate <span className="count">{statusCounts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "accepted"}
              className={"oferte-tab" + (filterStatus === "accepted" ? " is-on" : "")}
              onClick={() => setFilterStatus("accepted")}
            >
              Acceptate <span className="count">{statusCounts.accepted}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "rejected"}
              className={"oferte-tab" + (filterStatus === "rejected" ? " is-on" : "")}
              onClick={() => setFilterStatus("rejected")}
            >
              Respinse <span className="count">{statusCounts.rejected}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "pending"}
              className={"oferte-tab" + (filterStatus === "pending" ? " is-on" : "")}
              onClick={() => setFilterStatus("pending")}
            >
              În așteptare <span className="count">{statusCounts.pending}</span>
            </button>
          </div>

          <div className="oferte-dds">
            <div className="oferte-dd-group" style={{ "--label-pad": "62px" }}>
              <span className="lbl">Produs:</span>
              <select
                aria-label="Filtrează după produs"
                className="oferte-dd"
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
              >
                <option value="all">Toate</option>
                {PRODUCT_FILTER_KEYS.map((key) => (
                  <option key={key} value={key}>{getProductLabelSafe(key)}</option>
                ))}
              </select>
            </div>
            <div className="oferte-dd-group" style={{ "--label-pad": "64px" }}>
              <span className="lbl">Fermier:</span>
              <select
                aria-label="Filtrează după fermier"
                className="oferte-dd"
                value={listFarmerFilter}
                onChange={(e) => setListFarmerFilter(e.target.value)}
              >
                <option value="all">Toți</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>{f.email || f.id}</option>
                ))}
              </select>
            </div>
            <div className="oferte-dd-group" style={{ "--label-pad": "75px" }}>
              <span className="lbl">Perioadă:</span>
              <select
                aria-label="Filtrează după perioadă"
                className="oferte-dd"
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {showStats && (
          <div style={{ marginTop: 12 }}>
            {statsRows.length === 0 ? (
              <p className="small-text">Nu există statistici pentru filtrele selectate.</p>
            ) : (
              <div className="table-wrapper">
                <table className="table stats-table">
                  <thead>
                    <tr>
                      <th>Produs</th>
                      <th>Volum (t)</th>
                      <th>Preț mediu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsRows.map((row) => (
                      <tr key={row.product}>
                        <td>{getProductLabelSafe(row.product)}</td>
                        <td>{Number(row.totalQty || 0).toFixed(2)}</td>
                        <td>{Number(row.avgPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="stats-total-row">
                      <td>TOTAL</td>
                      <td>{Number(statsTotalQty || 0).toFixed(2)}</td>
                      <td>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {loading && <p className="small-text" style={{ marginTop: 12 }}>Se încarcă…</p>}
        {error && <p className="badge rejected" style={{ marginTop: 12 }}>{error}</p>}

        {!loading && !error && (
          <div className="admin-bid-list" style={{ marginTop: 14 }}>
            {filteredBids.map((b) => (
              <BidCardComponent
                key={b.id}
                bid={b}
                onClick={() => openAdminModal(b, null)}
                onAccept={() => submitDirectDecision("accepted", b)}
                onReject={() => submitDirectDecision("rejected", b)}
                onCounter={() => openAdminModal(b, "countered")}
              />
            ))}

            {filteredBids.length === 0 && (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12h.01M12 16h.01" />
                </svg>
                <p className="empty-state-title">Nicio ofertă găsită</p>
                <p className="empty-state-subtitle">Nicio ofertă nu corespunde filtrelor selectate. Încearcă să ajustezi sau resetezi filtrele.</p>
                <button
                  type="button"
                  className="btn small outline"
                  onClick={() => {
                    setListFarmerFilter("all");
                    setFilterProduct("all");
                    setFilterStatus("all");
                    setFilterParity("all");
                    setFilterDeliveryFrom("");
                    setFilterDeliveryTo("");
                    setFilterDeliveryLocation("all");
                    setFilterLoadingLocation("all");
                    setFilterPeriod("all");
                  }}
                >
                  Resetează filtrele
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {adminSelectedBid && (
        <AdminBidDetailModal
          bid={(bids || []).find((b) => b.id === adminSelectedBid.id) || adminSelectedBid}
          onClose={() => setAdminSelectedBid(null)}
          onUpdated={fetchBids}
        />
      )}

      {/* Filters modal */}
      {filtersOpen && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setFiltersOpen(false)}
        >
          <div className="bid-modal" onClick={(event) => event.stopPropagation()}>
            <div className="bid-modal-header">
              <h3 id="admin-filters-modal-title">Filtre</h3>
              <button
                type="button"
                className="btn small ghost modal-close-btn"
                aria-label="Închide filtrele"
                onClick={() => setFiltersOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="bid-modal-body bid-modal-body-filters">

              {/* Fermier + Produs */}
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-farmer">Fermier</label>
                  <select id="af-farmer" className="bid-input-field" value={listFarmerFilter} onChange={(e) => setListFarmerFilter(e.target.value)}>
                    <option value="all">Toți fermierii</option>
                    {(farmers || []).map((f) => (
                      <option key={f.id} value={f.id}>{f.email || f.id}</option>
                    ))}
                  </select>
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-product">Produs</label>
                  <select id="af-product" className="bid-input-field" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
                    <option value="all">Toate</option>
                    {PRODUCT_FILTER_KEYS.map((key) => (
                      <option key={key} value={key}>{getProductLabelSafe(key)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stare ofertă + Paritate */}
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-status">Stare ofertă</label>
                  <select id="af-status" className="bid-input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">Toate</option>
                    <option value="accepted">Acceptate</option>
                    <option value="rejected">Respinse</option>
                    <option value="pending">În așteptare</option>
                  </select>
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-parity">Paritate</label>
                  <select id="af-parity" className="bid-input-field" value={filterParity} onChange={(e) => setFilterParity(e.target.value)}>
                    <option value="all">Toate</option>
                    {["CPT", "DAP", "FCA", "FOR", "FOB", "CIF"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Locație livrare + Locație încărcare */}
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-delivery-loc">Locație livrare</label>
                  <select id="af-delivery-loc" className="bid-input-field" value={filterDeliveryLocation} onChange={(e) => setFilterDeliveryLocation(e.target.value)}>
                    <option value="all">Toate</option>
                    {deliveryLocationOptions.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-loading-loc">Locație încărcare</label>
                  <select id="af-loading-loc" className="bid-input-field" value={filterLoadingLocation} onChange={(e) => setFilterLoadingLocation(e.target.value)}>
                    <option value="all">Toate</option>
                    {loadingLocationOptions.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Livrare de la + până la */}
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-from">Livrare · de la</label>
                  <input
                    id="af-from"
                    className="bid-input-field"
                    type="date"
                    value={filterDeliveryFrom}
                    onChange={(e) => setFilterDeliveryFrom(e.target.value)}
                  />
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-to">Livrare · până la</label>
                  <input
                    id="af-to"
                    className="bid-input-field"
                    type="date"
                    value={filterDeliveryTo}
                    onChange={(e) => setFilterDeliveryTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="btn small ghost filter-btn-reset"
                  onClick={() => {
                    setListFarmerFilter("all");
                    setFilterProduct("all");
                    setFilterStatus("all");
                    setFilterParity("all");
                    setFilterDeliveryFrom("");
                    setFilterDeliveryTo("");
                    setFilterDeliveryLocation("all");
                    setFilterLoadingLocation("all");
                    setFilterPeriod("all");
                  }}
                >
                  Resetează
                </button>
                <button
                  type="button"
                  className="btn small primary-btn filter-btn-apply"
                  onClick={() => setFiltersOpen(false)}
                >
                  Aplică filtrele
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
