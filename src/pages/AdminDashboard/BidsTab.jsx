import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAppContext } from "../../context/AppContext.jsx";
import { useRealtimeSubscription } from "../../hooks/useRealtimeSubscription.js";
import { getProductLabelSafe, PRODUCT_FILTER_KEYS } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatDeliveryRange, formatLocationDisplay, isFreightParity } from "../../utils/formatting";
import { getAcceptedPrice } from "../../utils/bidPricing";
import BidCardV2 from "../../components/features/BidCardV2.jsx";

const BidCardComponent = BidCardV2;

const PAGE_SIZE = 50;

// Explicit column list: `*` shipped every column of every row, and the payload
// is the whole point here.
const BID_COLUMNS =
  "id, farmer_id, farmer_email, product, quantity, price, counter_price, final_price, " +
  "status, parity, freight_cost, delivery_start, delivery_end, delivery_location, " +
  "loading_location, crop_year, quantity_tolerance, currency, remarks, contract_no, " +
  "accepted_at, created_at";

// Sentinel for "no location set" — freight parities leave delivery_location
// null until an admin assigns one, and those bids need to stay findable.
const NO_LOCATION = "-";

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
  const { addFarmerRewardsPoints } = useAppContext();

  const [bids, setBids] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [filterCropYear, setFilterCropYear] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [statsRows, setStatsRows] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const [adminSelectedBid, setAdminSelectedBid] = useState(null);
  const [adminModalCounter, setAdminModalCounter] = useState("");
  const [adminModalFreight, setAdminModalFreight] = useState("");
  const [adminModalDelivery, setAdminModalDelivery] = useState("");
  const [adminModalOriginal, setAdminModalOriginal] = useState({ counter: "", freight: "", delivery: "" });
  const [adminConfirmAction, setAdminConfirmAction] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [loadingLocationOptions, setLoadingLocationOptions] = useState([]);
  const [cropYearOptions, setCropYearOptions] = useState([]);

  // Filter dropdowns come from their own sources, not from the loaded rows:
  // with pagination only ~50 bids are in memory, so deriving options from them
  // would quietly shrink the lists to whatever is on the current page.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [profilesRes, optionsRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name").eq("role", "farmer"),
        supabase.rpc("bid_filter_options"),
      ]);
      if (cancelled) return;

      if (!profilesRes.error && profilesRes.data) {
        setFarmers(
          profilesRes.data
            .map((p) => ({ id: p.id, email: p.full_name || p.email || p.id }))
            .sort((a, b) => String(a.email).localeCompare(String(b.email)))
        );
      }
      if (!optionsRes.error && optionsRes.data) {
        setLoadingLocationOptions(optionsRes.data.loading_locations || []);
        setCropYearOptions(optionsRes.data.crop_years || []);
      }
    })();

    return () => { cancelled = true; };
  }, []);

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

  // ── Bid list: server-side filters + keyset pagination ─────────────────────────
  //
  // Previously the whole table was fetched and filtered in the browser. Ordering
  // by id descending is equivalent to created_at descending (id is a monotonic
  // identity assigned as rows are inserted) but gives a trivial cursor, and the
  // primary key serves it as a backward index scan.

  const applyFilters = useCallback((query) => {
    let q = query;
    if (listFarmerFilter !== "all") q = q.eq("farmer_id", listFarmerFilter);
    if (filterProduct !== "all") q = q.eq("product", filterProduct);
    if (filterStatus !== "all") {
      if (filterStatus === "pending") q = q.in("status", ["pending", "countered", "farmer_countered"]);
      else q = q.eq("status", filterStatus);
    }
    if (filterParity !== "all") q = q.eq("parity", filterParity);
    if (filterDeliveryLocation !== "all") {
      q = filterDeliveryLocation === NO_LOCATION
        ? q.is("delivery_location", null)
        : q.eq("delivery_location", filterDeliveryLocation);
    }
    if (filterLoadingLocation !== "all") {
      q = filterLoadingLocation === NO_LOCATION
        ? q.is("loading_location", null)
        : q.eq("loading_location", filterLoadingLocation);
    }
    if (filterCropYear !== "all") q = q.eq("crop_year", Number(filterCropYear));
    // A bid with no delivery window cannot satisfy a window filter; NULL
    // comparisons drop it, matching the previous client-side behaviour.
    if (filterDeliveryFrom) q = q.gte("delivery_start", filterDeliveryFrom);
    if (filterDeliveryTo) q = q.lte("delivery_end", filterDeliveryTo);
    return q;
  }, [
    listFarmerFilter, filterProduct, filterStatus, filterParity,
    filterDeliveryLocation, filterLoadingLocation, filterCropYear,
    filterDeliveryFrom, filterDeliveryTo,
  ]);

  const fetchPage = useCallback(async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    let q = applyFilters(supabase.from("bids").select(BID_COLUMNS));
    if (cursor != null) q = q.lt("id", cursor);
    return q.order("id", { ascending: false }).limit(limit);
  }, [applyFilters]);

  // First page, and a fresh one whenever a filter changes.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchPage();
      if (cancelled) return;

      setLoading(false);
      if (fetchError) {
        // Silence here is what made a failed load look like an empty table.
        setError("Nu am putut încărca ofertele: " + fetchError.message);
        setBids([]);
        setHasMore(false);
        return;
      }
      setBids(data || []);
      setHasMore((data || []).length === PAGE_SIZE);
    })();

    return () => { cancelled = true; };
  }, [fetchPage]);

  const loadMore = async () => {
    const last = bids[bids.length - 1];
    if (!last || loadingMore) return;

    setLoadingMore(true);
    const { data, error: fetchError } = await fetchPage({ cursor: last.id });
    setLoadingMore(false);

    if (fetchError) {
      setError("Nu am putut încărca restul ofertelor: " + fetchError.message);
      return;
    }
    setBids((prev) => [...prev, ...(data || [])]);
    setHasMore((data || []).length === PAGE_SIZE);
  };

  // Realtime: refresh exactly the rows already on screen. Re-evaluating whether
  // an incoming row still matches the active filters would mean duplicating the
  // filter logic client-side — the thing this refactor removes — and the loaded
  // window is at most a few hundred rows.
  const refreshWindowRef = useRef(null);
  refreshWindowRef.current = async () => {
    const { data, error: fetchError } = await fetchPage({
      limit: Math.max(bids.length, PAGE_SIZE),
    });
    if (fetchError || !data) return;
    setBids(data);
    setHasMore(data.length >= Math.max(bids.length, PAGE_SIZE));
  };

  // Stable identity so the channel is not torn down and rebuilt on every
  // filter change.
  const onBidsChanged = useCallback(() => { refreshWindowRef.current?.(); }, []);
  useRealtimeSubscription("bids", onBidsChanged);

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
    const { error: updateError } = await supabase.from("bids").update({ status: action }).eq("id", bid.id);
    if (updateError) { setError("Nu am putut actualiza oferta: " + updateError.message); return; }
    if (action === "accepted" && bid.farmer_id) {
      await addFarmerRewardsPoints(bid.farmer_id, Number(bid.quantity || 0));
    }
    await refreshWindowRef.current?.();
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
    const { error: updateError } = await supabase.from("bids").update(payload).eq("id", bid.id);
    if (updateError) { setModalError("Eroare la trimiterea actualizării: " + updateError.message); return; }

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
    await refreshWindowRef.current?.();
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

  // Statistics are aggregated by the DB, not by walking every bid in the
  // browser: the payload stays a handful of rows no matter how many contracts
  // exist. RLS inside bid_stats() scopes the result to the caller, so the same
  // call serves an admin (all farmers) and a farmer (their own).
  // Only 'accepted' is aggregated, so a status filter that excludes accepted
  // has no statistics to show — skip the round-trip entirely.
  const statsApplicable = filterStatus === "all" || filterStatus === "accepted";

  useEffect(() => {
    if (!showStats || !statsApplicable) return;

    let cancelled = false;

    (async () => {
      setStatsLoading(true);
      setStatsError(null);

      // Mirrors applyFilters() above — the list and these totals must describe
      // the same set of contracts.
      const { data, error: rpcError } = await supabase.rpc("bid_stats", {
        p_farmer_id:         listFarmerFilter === "all" ? null : listFarmerFilter,
        p_product:           filterProduct === "all" ? null : filterProduct,
        p_parity:            filterParity === "all" ? null : filterParity,
        p_delivery_location: (filterDeliveryLocation === "all" || filterDeliveryLocation === NO_LOCATION)
          ? null : filterDeliveryLocation,
        p_loading_location:  (filterLoadingLocation === "all" || filterLoadingLocation === NO_LOCATION)
          ? null : filterLoadingLocation,
        p_delivery_location_unset: filterDeliveryLocation === NO_LOCATION,
        p_loading_location_unset:  filterLoadingLocation === NO_LOCATION,
        p_delivery_from:     filterDeliveryFrom || null,
        p_delivery_to:       filterDeliveryTo || null,
        p_crop_year:         filterCropYear === "all" ? null : Number(filterCropYear),
      });
      if (cancelled) return;

      setStatsLoading(false);
      if (rpcError) {
        setStatsError("Nu am putut încărca statisticile: " + rpcError.message);
        setStatsRows([]);
        return;
      }
      setStatsRows((data || []).map((row) => ({
        product:  row.product,
        totalQty: Number(row.total_qty || 0),
        avgPrice: Number(row.avg_price || 0),
      })));
    })();

    return () => { cancelled = true; };
  }, [
    showStats, statsApplicable, listFarmerFilter, filterProduct, filterParity,
    filterDeliveryLocation, filterLoadingLocation, filterDeliveryFrom,
    filterDeliveryTo, filterCropYear,
  ]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Derived, not synced: a status filter excluding accepted simply has no
  // statistics, and the last fetched rows stay cached for when it is cleared.
  const visibleStats = statsApplicable ? statsRows : [];

  const statsTotalQty = visibleStats.reduce((sum, row) => sum + Number(row.totalQty || 0), 0);

  // delivery_location is constrained to the silo list by BidForm, so the silo
  // query already loaded above is its real domain.
  const deliveryLocationOptions = deliveryLocations;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="card admin-card dashboard-card">
        <div className="card-header admin-bids-header activity-header-compact">
          <h2 className="market-title">Toate ofertele</h2>
          <div className="admin-bids-actions">
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
        </div>

        {showStats && (
          <div style={{ marginTop: 12 }}>
            {statsLoading && statsApplicable ? (
              <p className="small-text">Se calculează statisticile…</p>
            ) : statsError && statsApplicable ? (
              <p className="badge rejected" role="alert">{statsError}</p>
            ) : visibleStats.length === 0 ? (
              <p className="small-text">Nu există contracte acceptate pentru filtrele selectate.</p>
            ) : (
              <>
              <p className="small-text" style={{ marginBottom: 8 }}>Doar contracte acceptate</p>
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
                    {visibleStats.map((row) => (
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
              </>
            )}
          </div>
        )}

        {loading && <p className="small-text" style={{ marginTop: 12 }}>Se încarcă…</p>}
        {error && <p className="badge rejected" style={{ marginTop: 12 }}>{error}</p>}

        {!loading && !error && (
          <div className="admin-bid-list" style={{ marginTop: 14 }}>
            {bids.map((b) => (
              <BidCardComponent
                key={b.id}
                bid={b}
                onClick={() => openAdminModal(b, null)}
                onAccept={() => submitDirectDecision("accepted", b)}
                onReject={() => submitDirectDecision("rejected", b)}
                onCounter={() => openAdminModal(b, "countered")}
              />
            ))}

            {bids.length === 0 && (
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
                    setFilterCropYear("all");
                  }}
                >
                  Resetează filtrele
                </button>
              </div>
            )}

            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
                <button
                  type="button"
                  className="btn small outline"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? "Se încarcă…" : "Încarcă mai multe"}
                </button>
              </div>
            )}

            {bids.length > 0 && (
              <p className="small-text" style={{ textAlign: "center", marginTop: 10 }}>
                {hasMore ? `${bids.length} oferte afișate` : `${bids.length} oferte — toate încărcate`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Admin bid action modal */}
      {adminSelectedBid && (
        <div
          className="bid-modal-backdrop bid-modal-backdrop-details"
          role="dialog"
          aria-modal="true"
          onClick={() => setAdminSelectedBid(null)}
        >
          <div
            className="bid-modal bid-modal-details"
            onClick={(event) => { event.stopPropagation(); setAdminConfirmAction(null); }}
          >
            <div className="bid-detail-drag" aria-hidden="true" />
            <div className="bid-modal-header">
              <div className="bid-detail-header-left">
                <div className="bid-detail-title-row">
                  <h3 className="bid-detail-title">{getProductLabelSafe(adminSelectedBid.product)}</h3>
                  <BidStatusBadge status={adminSelectedBid.status} />
                </div>
                <span className="bid-detail-date">{formatDateTime(adminSelectedBid.created_at)}</span>
              </div>
              <button type="button" className="bid-detail-close" onClick={() => setAdminSelectedBid(null)}>
                ×
              </button>
            </div>
            <div className="bid-modal-body">
              <div className="bid-modal-row">
                <span className="bid-modal-label">Fermier</span>
                <span className="bid-modal-value">{adminSelectedBid.farmer_email || adminSelectedBid.farmer_id}</span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Produs</span>
                <span className="bid-modal-value">{getProductLabelSafe(adminSelectedBid.product)}</span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Cantitate</span>
                <span className="bid-modal-value">{formatCompactNumber(adminSelectedBid.quantity)} t</span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Preț</span>
                <span className="bid-modal-value">
                  {adminSelectedBid.status === "accepted" && getAcceptedPrice(adminSelectedBid) != null ? (
                    <>{formatCompactNumber(getAcceptedPrice(adminSelectedBid))}{" "}{`${adminSelectedBid.currency || (adminSelectedBid.product === "sunflower" ? "USD" : "EUR")}/t`}</>
                  ) : hasPositiveNumber(adminSelectedBid.counter_price) ? (
                    <>{formatCompactNumber(adminSelectedBid.counter_price)}{" "}{`${adminSelectedBid.currency || (adminSelectedBid.product === "sunflower" ? "USD" : "EUR")}/t`}</>
                  ) : (
                    <>{formatCompactNumber(adminSelectedBid.price)}{" "}{`${adminSelectedBid.currency || (adminSelectedBid.product === "sunflower" ? "USD" : "EUR")}/t`}</>
                  )}
                </span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Contra-ofertă</span>
                <span className="bid-modal-value bid-modal-counter">
                  <input
                    className="bid-detail-counter-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="-"
                    value={adminModalCounter}
                    onChange={(e) => setAdminModalCounter(e.target.value)}
                  />
                  <span className="bid-modal-unit">
                    {`${adminSelectedBid.currency || (adminSelectedBid.product === "sunflower" ? "USD" : "EUR")}/t`}
                  </span>
                </span>
              </div>
              {isFreightParity(adminSelectedBid.parity) && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Transport</span>
                  <span className="bid-modal-value bid-modal-counter">
                    <input
                      className="bid-detail-counter-input"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="-"
                      value={adminModalFreight}
                      onChange={(e) => setAdminModalFreight(e.target.value)}
                    />
                    <span className="bid-modal-unit">
                      {`${adminSelectedBid.currency || (adminSelectedBid.product === "sunflower" ? "USD" : "EUR")}/t`}
                    </span>
                  </span>
                </div>
              )}
              <div className="bid-modal-row">
                <span className="bid-modal-label">Paritate</span>
                <span className="bid-modal-value">
                  {isFreightParity(adminSelectedBid.parity) ? (
                    <span className="bid-modal-parity-edit">
                      <span>
                        {String(adminSelectedBid.parity || "").toUpperCase()}{" "}
                        {adminSelectedBid.loading_location || "-"}
                      </span>
                      <span className="bid-modal-parity-separator">la</span>
                      <select
                        className="input inline-select bid-modal-inline-select"
                        value={adminModalDelivery}
                        onChange={(e) => setAdminModalDelivery(e.target.value)}
                      >
                        <option value="">Locație livrare</option>
                        {adminModalDelivery && !deliveryLocations.includes(adminModalDelivery) && (
                          <option value={adminModalDelivery}>{formatLocationDisplay(adminModalDelivery)}</option>
                        )}
                        {deliveryLocations.map((loc) => (
                          <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                        ))}
                      </select>
                    </span>
                  ) : (
                    formatParityDisplay(adminSelectedBid, { detailed: true })
                  )}
                </span>
              </div>
              <div className="bid-modal-row">
                <span className="bid-modal-label">Livrare</span>
                <span className="bid-modal-value">
                  {formatDeliveryRange(adminSelectedBid.delivery_start, adminSelectedBid.delivery_end)}
                </span>
              </div>
              {adminSelectedBid.crop_year && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">An recoltă</span>
                  <span className="bid-modal-value">{adminSelectedBid.crop_year}</span>
                </div>
              )}
              {adminSelectedBid.quantity_tolerance != null && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Toleranță</span>
                  <span className="bid-modal-value">±{adminSelectedBid.quantity_tolerance}%</span>
                </div>
              )}
              {adminSelectedBid.remarks && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Observații</span>
                  <span className="bid-modal-value">{adminSelectedBid.remarks}</span>
                </div>
              )}
              <div className="bid-modal-row">
                <span className="bid-modal-label">Stare</span>
                <span className="bid-modal-value">{getStatusLabel(adminSelectedBid.status)}</span>
              </div>
              {adminSelectedBid.status === "accepted" && adminSelectedBid.contract_no && (
                <div className="bid-modal-row">
                  <span className="bid-modal-label">Contract</span>
                  <span className="bid-modal-value">{adminSelectedBid.contract_no}</span>
                </div>
              )}
            </div>
            {modalError && (
              <div className="modal-inline-error" role="alert">
                {modalError}
              </div>
            )}
            <div className="bid-detail-footer">
              {(() => {
                const currentCounter = parseOptionalNumber(adminModalCounter);
                const originalCounter = parseOptionalNumber(adminModalOriginal.counter);
                const currentFreight = parseOptionalNumber(adminModalFreight);
                const originalFreight = parseOptionalNumber(adminModalOriginal.freight);
                const currentDelivery = normalizeOptionalText(adminModalDelivery);
                const originalDelivery = normalizeOptionalText(adminModalOriginal.delivery);
                const isDecisionLocked =
                  adminSelectedBid.status === "accepted" ||
                  adminSelectedBid.status === "rejected" ||
                  adminSelectedBid.status === "countered";
                const counterInvalid = currentCounter != null && !Number.isFinite(currentCounter);
                const freightInvalid =
                  isFreightParity(adminSelectedBid.parity) &&
                  currentFreight != null && !Number.isFinite(currentFreight);
                const counterChanged =
                  counterInvalid ||
                  (currentCounter == null && originalCounter != null) ||
                  (currentCounter != null && originalCounter == null) ||
                  (Number.isFinite(currentCounter) && Number.isFinite(originalCounter) && currentCounter !== originalCounter);
                const freightChanged =
                  isFreightParity(adminSelectedBid.parity) &&
                  (freightInvalid ||
                    (currentFreight == null && originalFreight != null) ||
                    (currentFreight != null && originalFreight == null) ||
                    (Number.isFinite(currentFreight) && Number.isFinite(originalFreight) && currentFreight !== originalFreight));
                const deliveryChanged =
                  isFreightParity(adminSelectedBid.parity) && currentDelivery !== originalDelivery;
                const hasChanges = counterChanged || freightChanged || deliveryChanged;

                return (
                  <>
                    <button
                      type="button"
                      className={`bid-action-reject${adminConfirmAction === "rejected" ? " is-confirming" : ""}`}
                      disabled={isDecisionLocked}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (adminConfirmAction !== "rejected") { setAdminConfirmAction("rejected"); return; }
                        submitAdminDecision("rejected");
                      }}
                    >
                      {adminConfirmAction === "rejected" ? "Confirmi?" : "Respinge"}
                    </button>
                    <button
                      type="button"
                      className={`bid-action-counter${adminConfirmAction === "countered" ? " is-confirming" : ""}`}
                      disabled={isDecisionLocked || !hasChanges || counterInvalid || freightInvalid}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (adminConfirmAction !== "countered") { setAdminConfirmAction("countered"); return; }
                        submitAdminDecision("countered");
                      }}
                    >
                      {adminConfirmAction === "countered" ? "Confirmi?" : "Contra-ofertă"}
                    </button>
                    <button
                      type="button"
                      className={`bid-action-accept${adminConfirmAction === "accepted" ? " is-confirming" : ""}`}
                      disabled={isDecisionLocked || hasChanges}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (adminConfirmAction !== "accepted") { setAdminConfirmAction("accepted"); return; }
                        submitAdminDecision("accepted");
                      }}
                    >
                      {adminConfirmAction === "accepted" ? "Confirmi?" : "Acceptă"}
                    </button>
                  </>
                );
              })()}
            </div>{/* bid-detail-footer */}
          </div>
        </div>
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
                    <option value={NO_LOCATION}>Fără locație</option>
                    {deliveryLocationOptions.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-loading-loc">Locație încărcare</label>
                  <select id="af-loading-loc" className="bid-input-field" value={filterLoadingLocation} onChange={(e) => setFilterLoadingLocation(e.target.value)}>
                    <option value="all">Toate</option>
                    <option value={NO_LOCATION}>Fără locație</option>
                    {loadingLocationOptions.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* An recoltă */}
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-crop-year">An recoltă</label>
                  <select id="af-crop-year" className="bid-input-field" value={filterCropYear} onChange={(e) => setFilterCropYear(e.target.value)}>
                    <option value="all">Toți anii</option>
                    {cropYearOptions.map((year) => (
                      <option key={year} value={String(year)}>{year}</option>
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
                    setFilterCropYear("all");
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
