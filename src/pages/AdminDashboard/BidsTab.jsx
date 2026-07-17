import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useRealtimeSubscription } from "../../hooks/useRealtimeSubscription.js";
import { getProductLabelSafe, PRODUCT_FILTER_KEYS } from "../../utils/productLabels";
import { formatCompactNumber, hasPositiveNumber } from "../../utils/numberFormat";
import { formatLocationDisplay, isFreightParity } from "../../utils/formatting";
import AdminBidDetailModal from "../../components/AdminBidDetailModal.jsx";
import "./BidsTab.css";

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

// Postgres compares created_at::date against a date, so send a plain local
// calendar day rather than a UTC instant.
const toDateParam = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null;

const RO_MONTHS = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sep.", "oct.", "noi.", "dec."];
const formatCardDate = (iso) => {
  if (!iso) return { day: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "—", time: "" };
  const day = `${String(d.getDate()).padStart(2, "0")} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { day, time };
};

const formatQuantity = (qty) => {
  const n = Number(qty || 0);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(n);
};

const formatCardPrice = (bid) => {
  const s = String(bid?.status || "").toLowerCase();
  const raw = (s === "accepted" || s === "rejected")
    ? (bid.final_price ?? (hasPositiveNumber(bid.counter_price) ? bid.counter_price : bid.price))
    : (hasPositiveNumber(bid.counter_price) ? bid.counter_price : bid.price);
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const formatCardDelivery = (bid) => {
  if (!bid?.parity) return null;
  const parity = String(bid.parity).toUpperCase();
  const delivery = formatLocationDisplay(bid.delivery_location || "");
  const loading = formatLocationDisplay(bid.loading_location || "");
  if (isFreightParity(bid.parity)) {
    const loc = (loading && loading !== "-") ? loading : (delivery && delivery !== "-" ? delivery : "");
    return loc ? `${parity} ${loc}` : null;
  }
  return (delivery && delivery !== "-") ? `${parity} ${delivery}` : parity;
};

const STATUS_PILL = {
  accepted: { cls: "ok",   label: "Acceptat" },
  rejected: { cls: "err",  label: "Respins"  },
  countered: { cls: "info", label: "Contra-ofertă" },
  farmer_countered: { cls: "info", label: "Răspuns fermier" },
  pending:  { cls: "warn", label: "În așteptare" },
};
const statusVisual = (s) => STATUS_PILL[String(s || "").toLowerCase()] || STATUS_PILL.pending;

function OfferCard({ bid, onOpen }) {
  const farmer = bid.farmer_email || bid.farmer_id || "—";
  const date = formatCardDate(bid.created_at);
  const status = statusVisual(bid.status);
  const unit = `${bid.currency || (bid.product === "sunflower" ? "USD" : "EUR")}/t`;
  const deliveryLabel = formatCardDelivery(bid);
  const cropYear = bid.crop_year || "—";

  const open = (e) => { e.stopPropagation(); onOpen?.(); };
  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(); }
  };

  return (
    <article
      className="offer-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.()}
      onKeyDown={handleKey}
    >
      <header className="offer-head">
        <div className="head-prod">
          <span className="prod-name">{getProductLabelSafe(bid.product)}</span>
        </div>
        <div className="head-recolta">
          <span className="recolta">Recoltă <span className="crop">{cropYear}</span></span>
        </div>
        <div className="head-fermier">
          <span className="fermier-email" title={farmer}>{farmer}</span>
        </div>
        <div className="head-status">
          <span className={`pill ${status.cls}`}><span className="dot" />{status.label}</span>
          <button type="button" className="row-action" aria-label="Acțiuni" onClick={open}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="2.5" cy="6" r="1" />
              <circle cx="6" cy="6" r="1" />
              <circle cx="9.5" cy="6" r="1" />
            </svg>
          </button>
        </div>
      </header>

      <div className="offer-data">
        <div className="field">
          <span className="field-label">Cantitate</span>
          <span className="field-value num">{formatQuantity(bid.quantity)}<span className="unit">t</span></span>
        </div>
        <div className="field">
          <span className="field-label">Preț</span>
          <span className="field-value num">{formatCardPrice(bid)}<span className="unit">{unit}</span></span>
        </div>
        <div className="field">
          <span className="field-label">Livrare</span>
          {deliveryLabel ? (
            <div className="field-value">
              <span className="pin">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 1.5c-2 0-3.5 1.5-3.5 3.5 0 2.5 3.5 5.5 3.5 5.5s3.5-3 3.5-5.5C9.5 3 8 1.5 6 1.5z" />
                  <circle cx="6" cy="5" r="1.2" />
                </svg>
                <span>{deliveryLabel}</span>
              </span>
            </div>
          ) : (
            <div className="field-value muted">—</div>
          )}
        </div>
        <div className="field date-field">
          <span className="field-label">Data</span>
          <span className="field-value-wrap">
            <span className="field-value">{date.day}</span>
            {date.time && <span className="field-sub">{date.time}</span>}
          </span>
        </div>
      </div>
    </article>
  );
}

const EMPTY_COUNTS = { all: 0, accepted: 0, rejected: 0, pending: 0, total_volume: 0 };

export default function BidsTab() {
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
  const [filterPeriod, setFilterPeriod] = useState("30");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [adminSelectedBid, setAdminSelectedBid] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState([]);
  const [cropYears, setCropYears] = useState([]);

  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [statsRows, setStatsRows] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // ── Filter option sources ───────────────────────────────────────────────────
  // None of these can be derived from the loaded page any more: with 50 rows in
  // hand, the dropdowns would only ever offer what happened to be on screen.

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "farmer")
      .order("email", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) return;
        setFarmers((data || []).map((p) => ({ id: p.id, email: p.email || p.full_name || p.id })));
      });
  }, []);

  useEffect(() => {
    supabase
      .from("silo_price_configs")
      .select("silo_name")
      .order("silo_name", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) return;
        const names = Array.from(new Set((data || []).map((r) => r?.silo_name).filter(Boolean)));
        setDeliveryLocations(["Port Constanța", ...names]);
      });
  }, []);

  useEffect(() => {
    supabase.rpc("bid_filter_options").then(({ data, error: loadError }) => {
      if (loadError || !data) return;
      setLoadingLocations(data.loading_locations || []);
      setCropYears(data.crop_years || []);
    });
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────

  const periodFrom = toDateParam(periodCutoff(filterPeriod));

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
    if (periodFrom) q = q.gte("created_at", periodFrom);
    return q;
  }, [
    listFarmerFilter, filterProduct, filterStatus, filterParity,
    filterDeliveryLocation, filterLoadingLocation, filterCropYear,
    filterDeliveryFrom, filterDeliveryTo, periodFrom,
  ]);

  // Keyset on id rather than offset: id is a monotonic identity, so ordering by
  // it matches created_at ordering while the primary key serves the cursor as a
  // backward index scan. offset would make Postgres count past every skipped row.
  const fetchPage = useCallback(async ({ cursor = null, limit = PAGE_SIZE } = {}) => {
    let q = applyFilters(supabase.from("bids").select(BID_COLUMNS));
    if (cursor != null) q = q.lt("id", cursor);
    return q.order("id", { ascending: false }).limit(limit);
  }, [applyFilters]);

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
  // Written in an effect, not during render: React reserves render for pure
  // computation, and a ref assigned mid-render is not guaranteed to survive a
  // discarded render pass. No dependency array — it re-runs after every render
  // so the closure always sees the current fetchPage and window size.
  const refreshWindowRef = useRef(null);
  useEffect(() => {
    refreshWindowRef.current = async () => {
      const { data, error: fetchError } = await fetchPage({
        limit: Math.max(bids.length, PAGE_SIZE),
      });
      if (fetchError || !data) return;
      setBids(data);
      setHasMore(data.length >= Math.max(bids.length, PAGE_SIZE));
    };
  });

  // Stable identity so the channel is not torn down and rebuilt on every
  // filter change.
  const onBidsChanged = useCallback(() => { refreshWindowRef.current?.(); }, []);
  useRealtimeSubscription("bids", onBidsChanged);

  // Shared by bid_counts and bid_stats — the list, the tabs and the statistics
  // must describe the same set of contracts. Status is deliberately absent:
  // bid_counts needs every status to fill the tabs, and bid_stats is
  // accepted-only by definition.
  const rpcFilters = useCallback(() => ({
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
    p_created_from:      periodFrom,
    p_crop_year:         filterCropYear === "all" ? null : Number(filterCropYear),
  }), [
    listFarmerFilter, filterProduct, filterParity, filterDeliveryLocation,
    filterLoadingLocation, filterDeliveryFrom, filterDeliveryTo, filterCropYear,
    periodFrom,
  ]);

  // Counts drive the header and the status tabs, so they deliberately ignore
  // the status filter — each tab has to show what it would contain. Counting in
  // the browser would report whatever fits on the current page.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error: rpcError } = await supabase.rpc("bid_counts", rpcFilters(false));
      if (cancelled) return;
      if (rpcError || !data) { setCounts(EMPTY_COUNTS); return; }
      setCounts({ ...EMPTY_COUNTS, ...data });
    })();

    return () => { cancelled = true; };
  }, [rpcFilters]);

  // Only 'accepted' is aggregated, so a status filter that excludes accepted has
  // no statistics to show — skip the round-trip entirely.
  const statsApplicable = filterStatus === "all" || filterStatus === "accepted";

  useEffect(() => {
    if (!showStats || !statsApplicable) return;

    let cancelled = false;

    (async () => {
      setStatsLoading(true);
      setStatsError(null);

      const { data, error: rpcError } = await supabase.rpc("bid_stats", rpcFilters(true));
      if (cancelled) return;

      setStatsLoading(false);
      if (rpcError) {
        setStatsError("Nu am putut încărca statisticile: " + rpcError.message);
        setStatsRows([]);
        return;
      }
      setStatsRows(data || []);
    })();

    return () => { cancelled = true; };
  }, [showStats, statsApplicable, rpcFilters]);

  const statsTotalQty = statsRows.reduce((sum, row) => sum + Number(row.total_qty || 0), 0);

  const resetFilters = () => {
    setListFarmerFilter("all");
    setFilterProduct("all");
    setFilterStatus("all");
    setFilterParity("all");
    setFilterDeliveryFrom("");
    setFilterDeliveryTo("");
    setFilterDeliveryLocation("all");
    setFilterLoadingLocation("all");
    setFilterCropYear("all");
    setFilterPeriod("all");
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="card admin-card dashboard-card oferte-page">
        <header className="oferte-head">
          <div className="oferte-title">
            <h2>Oferte</h2>
            <div className="oferte-sub">
              <span className="stat"><strong>{counts.all}</strong>&nbsp;total</span>
              <span className="sep" />
              <span className="stat"><strong>{counts.accepted}</strong>&nbsp;acceptate</span>
              <span className="sep" />
              <span className="stat"><strong>{counts.rejected}</strong>&nbsp;respinse</span>
              <span className="sep" />
              <span className="stat"><strong>{formatCompactNumber(counts.total_volume)}</strong>&nbsp;t volum</span>
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
              Toate <span className="count">{counts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "accepted"}
              className={"oferte-tab" + (filterStatus === "accepted" ? " is-on" : "")}
              onClick={() => setFilterStatus("accepted")}
            >
              Acceptate <span className="count">{counts.accepted}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "rejected"}
              className={"oferte-tab" + (filterStatus === "rejected" ? " is-on" : "")}
              onClick={() => setFilterStatus("rejected")}
            >
              Respinse <span className="count">{counts.rejected}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "pending"}
              className={"oferte-tab" + (filterStatus === "pending" ? " is-on" : "")}
              onClick={() => setFilterStatus("pending")}
            >
              În așteptare <span className="count">{counts.pending}</span>
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
            {!statsApplicable ? (
              <p className="small-text">
                Statisticile acoperă doar contractele acceptate. Alege „Toate” sau „Acceptate”.
              </p>
            ) : statsLoading ? (
              <p className="small-text">Se încarcă statisticile…</p>
            ) : statsError ? (
              <p className="badge rejected">{statsError}</p>
            ) : statsRows.length === 0 ? (
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
                      {statsRows.map((row) => (
                        <tr key={row.product}>
                          <td>{getProductLabelSafe(row.product)}</td>
                          <td>{formatQuantity(row.total_qty)}</td>
                          <td>{Number(row.avg_price || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="stats-total-row">
                        <td>TOTAL</td>
                        <td>{formatQuantity(statsTotalQty)}</td>
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
          <div className="offer-list">
            {bids.map((b) => (
              <OfferCard
                key={b.id}
                bid={b}
                onOpen={() => setAdminSelectedBid(b)}
              />
            ))}

            {bids.length === 0 && (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12h.01M12 16h.01" />
                </svg>
                <p className="empty-state-title">Nicio ofertă găsită</p>
                <p className="empty-state-subtitle">Nicio ofertă nu corespunde filtrelor selectate. Încearcă să ajustezi sau resetezi filtrele.</p>
                <button type="button" className="btn small outline" onClick={resetFilters}>
                  Resetează filtrele
                </button>
              </div>
            )}

            {hasMore && (
              <div className="offer-list-more">
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
          </div>
        )}
      </div>

      {adminSelectedBid && (
        <AdminBidDetailModal
          bid={bids.find((b) => b.id === adminSelectedBid.id) || adminSelectedBid}
          onClose={() => setAdminSelectedBid(null)}
          onUpdated={() => refreshWindowRef.current?.()}
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
                    {farmers.map((f) => (
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
                    {deliveryLocations.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-loading-loc">Locație încărcare</label>
                  <select id="af-loading-loc" className="bid-input-field" value={filterLoadingLocation} onChange={(e) => setFilterLoadingLocation(e.target.value)}>
                    <option value="all">Toate</option>
                    <option value={NO_LOCATION}>Fără locație</option>
                    {loadingLocations.map((loc) => (
                      <option key={loc} value={loc}>{formatLocationDisplay(loc)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* An recoltă + Perioadă */}
              <div className="bid-form-grid-2">
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-crop-year">An recoltă</label>
                  <select id="af-crop-year" className="bid-input-field" value={filterCropYear} onChange={(e) => setFilterCropYear(e.target.value)}>
                    <option value="all">Toți anii</option>
                    {cropYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="bid-input-container">
                  <label className="bid-input-label" htmlFor="af-period">Perioadă</label>
                  <select id="af-period" className="bid-input-field" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                    {PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                <button type="button" className="btn small ghost filter-btn-reset" onClick={resetFilters}>
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
