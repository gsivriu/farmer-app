import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext.jsx";
import { getProductLabelSafe, PRODUCT_FILTER_KEYS } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../../utils/formatting";

const formatParityDisplay = (bid) => {
  if (!bid?.parity) return "-";
  const parity = String(bid.parity).toUpperCase();
  const delivery = formatLocationDisplay(bid.delivery_location || "-");
  const loading = formatLocationDisplay(bid.loading_location || "-");
  if (isFreightParity(parity)) return `${parity} ${loading}`;
  return `${parity} ${delivery}`;
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

const formatDateOnly = (value) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("ro-RO", { year: "2-digit", month: "2-digit", day: "2-digit" });
};

const getStatusLabel = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "accepted") return "Acceptat";
  if (value === "rejected") return "Respins";
  if (value === "countered") return "Contra-ofertă";
  if (value === "farmer_countered") return "Răspuns trimis";
  return "În așteptare";
};

const parseOptionalNumber = (value) => {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
};

function SkeletonBidRow() {
  return (
    <div className="bid-row bid-row-skeleton" aria-hidden="true">
      <div className="bid-card-header">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-badge" />
      </div>
      <div className="bid-card-row bid-card-row-price">
        <div className="skeleton-line skeleton-label" />
        <div className="skeleton-line skeleton-price" />
      </div>
      <div className="bid-card-row">
        <div className="skeleton-line skeleton-label" />
        <div className="skeleton-line skeleton-value" />
      </div>
      <div className="bid-card-row">
        <div className="skeleton-line skeleton-label" />
        <div className="skeleton-line skeleton-value" />
      </div>
      <div className="bid-card-hint" style={{ visibility: "hidden" }}>—</div>
    </div>
  );
}

export default function ActivityTab() {
  const { bids, fetchBids, addFarmerRewardsPoints } = useAppContext();

  const [localBids, setLocalBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farmerActionLocks, setFarmerActionLocks] = useState({});
  const [farmerModalCounter, setFarmerModalCounter] = useState("");
  const [farmerModalOriginal, setFarmerModalOriginal] = useState({ counter: "" });
  const [farmerConfirmAction, setFarmerConfirmAction] = useState(null);
  const [farmerActionError, setFarmerActionError] = useState(null);
  const [farmerCounterSent, setFarmerCounterSent] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [farmerId, setFarmerId] = useState(null);

  useEffect(() => { fetchBids(); }, [fetchBids]);

  useEffect(() => {
    if (!Array.isArray(bids)) return;
    setLocalBids(bids);
    setLoading(false);
  }, [bids]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error: userErr }) => {
      if (userErr || !data?.user) return;
      if (mounted) setFarmerId(data.user.id);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setFarmerActionLocks((prev) => {
      let changed = false;
      const next = { ...prev };
      localBids.forEach((bid) => {
        const lock = next[bid.id];
        if (!lock || !lock.locked) return;
        if (
          (bid.status === "countered" || bid.status === "accepted" || bid.status === "rejected") &&
          lock.lastCounter != null
        ) {
          next[bid.id] = { locked: false, lastCounter: null };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [localBids]);

  // ── Computations ────────────────────────────────────────────────────────────

  const userBids = useMemo(() => {
    if (!farmerId) return [];
    return localBids.filter((b) => b.farmer_id === farmerId);
  }, [localBids, farmerId]);

  const filteredBids = useMemo(() => {
    return userBids.filter((b) => {
      if (productFilter !== "all" && b.product !== productFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          if (b.status !== "pending" && b.status !== "countered" && b.status !== "farmer_countered") return false;
        } else if (b.status !== statusFilter) {
          return false;
        }
      }
      if (dateFrom || dateTo) {
        const dateStr = b.created_at ? b.created_at.slice(0, 10) : null;
        if (!dateStr) return false;
        if (dateFrom && dateStr < dateFrom) return false;
        if (dateTo && dateStr > dateTo) return false;
      }
      return true;
    });
  }, [userBids, productFilter, statusFilter, dateFrom, dateTo]);

  const statsRows = useMemo(() => {
    const map = new Map();
    for (const b of filteredBids) {
      const product = b.product || "unknown";
      const qty = Number(b.quantity || 0);
      const price =
        b.final_price != null ? Number(b.final_price)
        : b.counter_price != null ? Number(b.counter_price)
        : Number(b.price || 0);
      const prev = map.get(product) || { totalQty: 0, totalValue: 0 };
      prev.totalQty += qty;
      prev.totalValue += qty * price;
      map.set(product, prev);
    }
    return Array.from(map.entries()).map(([product, v]) => ({
      product,
      totalQty: v.totalQty,
      avgPrice: v.totalQty > 0 ? v.totalValue / v.totalQty : 0,
    }));
  }, [filteredBids]);

  const statsTotalQty = useMemo(
    () => statsRows.reduce((sum, row) => sum + Number(row.totalQty || 0), 0),
    [statsRows]
  );

  const activeFilterCount = [
    productFilter !== "all",
    statusFilter !== "all",
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAcceptCounter = async (bid) => {
    const finalPrice = bid.counter_price != null ? Number(bid.counter_price) : Number(bid.price);
    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "accepted", final_price: finalPrice })
      .eq("id", bid.id);
    if (updErr) { setFarmerActionError("Eroare la acceptare: " + updErr.message); return; }
    setLocalBids((prev) =>
      prev.map((x) => x.id === bid.id ? { ...x, status: "accepted", final_price: finalPrice } : x)
    );
    if (bid.farmer_id) await addFarmerRewardsPoints(bid.farmer_id, Number(bid.quantity || 0));
    window.dispatchEvent(new Event("farmer-progress-refresh"));
    setFarmerConfirmAction(null);
    setFarmerActionLocks((prev) => ({ ...prev, [bid.id]: { locked: true, lastCounter: null } }));
    setSelectedBid(null);
    setFarmerActionError(null);
  };

  const handleRejectCounter = async (bid) => {
    const { error: updErr } = await supabase
      .from("bids").update({ status: "rejected" }).eq("id", bid.id);
    if (updErr) { setFarmerActionError("Eroare la respingere: " + updErr.message); return; }
    setLocalBids((prev) => prev.map((x) => (x.id === bid.id ? { ...x, status: "rejected" } : x)));
    setFarmerConfirmAction(null);
    setFarmerActionLocks((prev) => ({ ...prev, [bid.id]: { locked: true, lastCounter: null } }));
    setSelectedBid(null);
    setFarmerActionError(null);
  };

  const handleCounterBack = async (bid) => {
    const value = Number(farmerModalCounter);
    if (!Number.isFinite(value) || value <= 0) { setFarmerActionError("Introdu un preț valid."); return; }
    const { error: updErr } = await supabase
      .from("bids").update({ counter_price: value, status: "farmer_countered" }).eq("id", bid.id);
    if (updErr) { setFarmerActionError("Eroare la trimiterea contra-ofertei: " + updErr.message); return; }
    setLocalBids((prev) =>
      prev.map((x) => x.id === bid.id ? { ...x, counter_price: value, status: "farmer_countered" } : x)
    );
    setFarmerConfirmAction(null);
    setFarmerCounterSent(false);
    setFarmerActionLocks((prev) => ({ ...prev, [bid.id]: { locked: true, lastCounter: value } }));
    setSelectedBid(null);
    setFarmerActionError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="dashboard-row full">
        <div className="card">
          <div className="card-header activity-header-compact">
            <h2 className="market-title">Activitatea mea</h2>
            <div className="activity-header-actions">
              <button type="button" className="btn small outline" onClick={() => setFiltersOpen(true)}>
                Filtre
                {activeFilterCount > 0 && (
                  <span className="filter-active-dot" aria-label={`${activeFilterCount} filtre active`} />
                )}
              </button>
              <button type="button" className="btn small outline" onClick={() => setShowStats((prev) => !prev)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginRight: 5 }}>
                  <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="5.5" y="4" width="3" height="9" rx="1" fill="currentColor" opacity="0.75"/>
                  <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/>
                </svg>
                Statistici
              </button>
            </div>
          </div>

          <div className="card-body">
            {error && <p className="badge rejected">{error}</p>}

            {showStats && (
              <div className="dashboard-section">
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
                          <td>Total</td>
                          <td>{Number(statsTotalQty || 0).toFixed(2)}</td>
                          <td>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="dashboard-section">
              {loading ? (
                <div className="bid-list" aria-label="Loading bids" aria-busy="true">
                  <SkeletonBidRow />
                  <SkeletonBidRow />
                  <SkeletonBidRow />
                </div>
              ) : filteredBids.length === 0 ? (
                <div className="activity-empty-state">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                    <rect x="6" y="10" width="28" height="22" rx="4" stroke="#cbd5e1" strokeWidth="2" fill="none"/>
                    <path d="M13 18h14M13 23h8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="30" cy="10" r="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5"/>
                    <path d="M30 7v3l2 1.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="activity-empty-title">
                    {userBids.length === 0 ? "Nicio ofertă încă" : "Nicio ofertă nu corespunde filtrelor"}
                  </p>
                  <p className="activity-empty-sub">
                    {userBids.length === 0
                      ? "Trimite prima ofertă din tab-ul Vânzare."
                      : "Încearcă să modifici sau să resetezi filtrele."}
                  </p>
                </div>
              ) : (
                <div className="bid-list">
                  {filteredBids.map((b) => {
                    const statusClass =
                      b.status === "accepted" ? "is-accepted"
                      : b.status === "rejected" ? "is-rejected"
                      : b.status === "countered" ? "is-countered"
                      : b.status === "farmer_countered" ? "is-farmer-countered"
                      : "is-pending";
                    const hasCounterPrice = hasPositiveNumber(b.counter_price);
                    const activePrice = hasCounterPrice ? Number(b.counter_price) : Number(b.price);
                    const unit = `${b.currency || (b.product === "sunflower" ? "USD" : "EUR")}/t`;
                    const statusLabel = getStatusLabel(b.status);

                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        key={b.id}
                        className={"bid-row " + statusClass}
                        onClick={() => {
                          setSelectedBid(b);
                          const counterValue = hasPositiveNumber(b.counter_price) ? String(b.counter_price) : "";
                          setFarmerModalCounter(counterValue);
                          setFarmerModalOriginal({ counter: counterValue });
                          setFarmerConfirmAction(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            const counterValue = hasPositiveNumber(b.counter_price) ? String(b.counter_price) : "";
                            setSelectedBid(b);
                            setFarmerModalCounter(counterValue);
                            setFarmerModalOriginal({ counter: counterValue });
                            setFarmerConfirmAction(null);
                          }
                        }}
                      >
                        <div className="bid-card-header">
                          <div className="bid-card-header-main">
                            <div className="bid-card-title">{getProductLabelSafe(b.product)}</div>
                            {b.status === "accepted" && b.contract_no && (
                              <div className="bid-card-subtitle">Contract: {b.contract_no}</div>
                            )}
                          </div>
                          <div className="bid-card-header-badge">
                            <span className={`status-badge status-${statusClass.slice(3)}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        <div className="bid-card-section-label">Detalii</div>

                        <div className="bid-card-row bid-card-row-price">
                          <span className="bid-card-label">Preț</span>
                          <span className={`bid-card-value${hasCounterPrice && b.status === "countered" ? " bid-card-counter-value" : ""}`}>
                            {formatCompactNumber(activePrice)} {unit}
                          </span>
                        </div>
                        <div className="bid-card-row">
                          <span className="bid-card-label">Cantitate</span>
                          <span className="bid-card-value">{formatCompactNumber(b.quantity)} t</span>
                        </div>
                        <div className="bid-card-row">
                          <span className="bid-card-label">Paritate</span>
                          <span className="bid-card-value">{formatParityDisplay(b)}</span>
                        </div>
                        <div className="bid-card-row">
                          <span className="bid-card-label">Data ofertei</span>
                          <span className="bid-card-value">{formatDateOnly(b.created_at)}</span>
                        </div>

                        <div className="bid-card-footer">
                          <span className="bid-card-hint">Vezi detalii ›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bid detail modal */}
      {selectedBid && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bid-detail-modal-title"
          onClick={() => { setSelectedBid(null); setFarmerActionError(null); setFarmerCounterSent(false); }}
        >
          <div
            className="bid-modal bid-modal-details"
            onClick={(event) => { event.stopPropagation(); setFarmerConfirmAction(null); }}
          >
            <div className="bid-modal-header">
              <h3 id="bid-detail-modal-title">Detalii ofertă</h3>
              <button
                type="button"
                className="btn small ghost modal-close-btn"
                aria-label="Închide detaliile ofertei"
                onClick={() => { setSelectedBid(null); setFarmerActionError(null); setFarmerCounterSent(false); }}
              >
                ✕
              </button>
            </div>
            <div className="bid-modal-body">
              <div className="bid-modal-row">
                <span className="bid-modal-label">Dată</span>
                <span className="bid-modal-value">{formatDateTime(selectedBid.created_at)}</span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Produs</span>
                <span className="bid-modal-value">{getProductLabelSafe(selectedBid.product)}</span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Cantitate</span>
                <span className="bid-modal-value">{formatCompactNumber(selectedBid.quantity)} t</span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Preț (Contra)</span>
                <span className="bid-modal-value bid-modal-counter">
                  <input
                    className="input inline-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="-"
                    value={farmerModalCounter}
                    onChange={(e) => setFarmerModalCounter(e.target.value)}
                  />
                  <span className="bid-modal-unit">
                    {`${selectedBid.currency || (selectedBid.product === "sunflower" ? "USD" : "EUR")}/t`}
                  </span>
                </span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Stare</span>
                <span className="bid-modal-value">{getStatusLabel(selectedBid.status)}</span>
              </div>
              {selectedBid.status === "accepted" && selectedBid.contract_no && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Contract</span>
                  <span className="bid-modal-value">{selectedBid.contract_no}</span>
                </div>
              )}
              {isFreightParity(selectedBid.parity) && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Încărcare</span>
                  <span className="bid-modal-value">
                    {formatLocationDisplay(selectedBid.loading_location || "-")}
                  </span>
                </div>
              )}
              <div className="bid-modal-row">
                <span className="bid-modal-label">Livrare</span>
                <span className="bid-modal-value">
                  {formatDeliveryRange(selectedBid.delivery_start, selectedBid.delivery_end)}
                </span>
              </div>
              {selectedBid.crop_year && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">An recoltă</span>
                  <span className="bid-modal-value">{selectedBid.crop_year}</span>
                </div>
              )}
              {selectedBid.quantity_tolerance != null && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Toleranță</span>
                  <span className="bid-modal-value">±{selectedBid.quantity_tolerance}%</span>
                </div>
              )}
              {selectedBid.remarks && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Observații</span>
                  <span className="bid-modal-value">{selectedBid.remarks}</span>
                </div>
              )}
            </div>

            {farmerActionError && (
              <p className="bid-form-feedback bid-feedback-error" style={{ margin: "8px 0 0 0" }} role="alert">
                {farmerActionError}
              </p>
            )}
            {farmerCounterSent && (
              <p className="bid-form-feedback bid-feedback-success" style={{ margin: "8px 0 0 0" }}>
                Contra-oferta a fost trimisă către administrator.
              </p>
            )}

            {selectedBid.status === "countered" && !farmerCounterSent && (
              <div className="modal-actions">
                {(() => {
                  const lockInfo = farmerActionLocks[selectedBid.id];
                  const isLocked =
                    lockInfo?.locked &&
                    (lockInfo.lastCounter == null ||
                      Number(selectedBid.counter_price) === Number(lockInfo.lastCounter));
                  const currentCounter = parseOptionalNumber(farmerModalCounter);
                  const originalCounter = parseOptionalNumber(farmerModalOriginal.counter);
                  const counterInvalid = currentCounter != null && !Number.isFinite(currentCounter);
                  const counterChanged =
                    counterInvalid ||
                    (currentCounter == null && originalCounter != null) ||
                    (currentCounter != null && originalCounter == null) ||
                    (Number.isFinite(currentCounter) && Number.isFinite(originalCounter) &&
                      currentCounter !== originalCounter);
                  const hasChanges = counterChanged;
                  return (
                    <>
                      <button
                        type="button"
                        className="btn small farmer-reject-btn"
                        disabled={isLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (farmerConfirmAction !== "rejected") { setFarmerConfirmAction("rejected"); setFarmerActionError(null); return; }
                          handleRejectCounter(selectedBid);
                        }}
                      >
                        {farmerConfirmAction === "rejected" ? "Confirmi?" : "Respinge"}
                      </button>
                      <button
                        type="button"
                        className="btn small farmer-counter-btn"
                        disabled={!hasChanges || counterInvalid || isLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (farmerConfirmAction !== "countered") { setFarmerConfirmAction("countered"); setFarmerActionError(null); return; }
                          handleCounterBack(selectedBid);
                        }}
                      >
                        {farmerConfirmAction === "countered" ? "Confirmi?" : "Contra-ofertă"}
                      </button>
                      <button
                        type="button"
                        className="btn small farmer-accept-btn"
                        disabled={hasChanges || isLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (farmerConfirmAction !== "accepted") { setFarmerConfirmAction("accepted"); setFarmerActionError(null); return; }
                          handleAcceptCounter(selectedBid);
                        }}
                      >
                        {farmerConfirmAction === "accepted" ? "Confirmi?" : "Acceptă"}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters modal */}
      {filtersOpen && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-modal-title"
          onClick={() => setFiltersOpen(false)}
        >
          <div className="bid-modal" onClick={(event) => event.stopPropagation()}>
            <div className="bid-modal-header">
              <h3 id="filters-modal-title">Filtre</h3>
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
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="filter-product">Produs</label>
                  <select
                    id="filter-product"
                    className="bid-input-field"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                  >
                    <option value="all">Toate</option>
                    {PRODUCT_FILTER_KEYS.map((key) => (
                      <option key={key} value={key}>{getProductLabelSafe(key)}</option>
                    ))}
                  </select>
                </div>

                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="filter-status">Stare ofertă</label>
                  <select
                    id="filter-status"
                    className="bid-input-field"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Toate</option>
                    <option value="accepted">Acceptate</option>
                    <option value="rejected">Respinse</option>
                    <option value="pending">În așteptare</option>
                  </select>
                </div>
              </div>

              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="filter-date-from">Perioada · de la</label>
                  <input
                    id="filter-date-from"
                    className="bid-input-field"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="filter-date-to">Perioada · până la</label>
                  <input
                    id="filter-date-to"
                    className="bid-input-field"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="btn small ghost filter-btn-reset"
                  onClick={() => { setProductFilter("all"); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}
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
