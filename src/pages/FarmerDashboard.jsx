import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../supabaseClient";

import MarketTicker from "../components/MarketTicker";
import ExchangeRatesCard from "../components/ExchangeRatesCard";
import WeatherWidget from "../components/WeatherWidget";
import PricesGrid from "../components/PricesGrid";
import BidForm from "../components/BidForm";

import FarmerProgress from "../components/FarmerProgress";
import SiloPriceTable from "../components/SiloPriceTable";
import { useAppContext } from "../context/AppContext.jsx";
import { getProductLabelSafe, PRODUCT_FILTER_KEYS } from "../utils/productLabels";

const formatDateDMY = (value) => {
  if (!value) return "-";
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(str);
  if (Number.isNaN(dt.getTime())) return str;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const formatDeliveryRange = (start, end) => {
  if (!start || !end) return "-";
  return `${formatDateDMY(start)} - ${formatDateDMY(end)}`;
};

const isFreightParity = (parity) => {
  const p = String(parity || "").toUpperCase();
  return p === "FCA" || p === "FOB" || p === "FOR";
};

const formatLocationDisplay = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return raw || "-";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized === "port constanta") return "Constanta Port";
  return raw;
};

const formatParityDisplay = (bid) => {
  if (!bid?.parity) return "-";
  const parity = String(bid.parity).toUpperCase();
  const delivery = formatLocationDisplay(bid.delivery_location || "-");
  const loading = formatLocationDisplay(bid.loading_location || "-");
  if (isFreightParity(parity)) {
    return `${parity} ${loading}`;
  }
  return `${parity} ${delivery}`;
};

export default function FarmerDashboard() {
  const { commodities, bids, fetchBids, addFarmerRewardsPoints } = useAppContext();
  const [localBids, setLocalBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farmerActionLocks, setFarmerActionLocks] = useState({});
  const [farmerModalCounter, setFarmerModalCounter] = useState("");
  const [farmerModalOriginal, setFarmerModalOriginal] = useState({ counter: "" });
  const [farmerConfirmAction, setFarmerConfirmAction] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    return window.localStorage.getItem("farmer-active-tab") || "home";
  });
  const [selectedBid, setSelectedBid] = useState(null);
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const saleTouchStartYRef = useRef(0);
  const saleTouchDeltaRef = useRef(0);
  const salePullingRef = useRef(false);
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [farmerId, setFarmerId] = useState(null);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  useEffect(() => {
    if (!Array.isArray(bids)) return;
    setLocalBids(bids);
    setLoading(false);
  }, [bids]);

  useEffect(() => {
    let mounted = true;
    const loadFarmerId = async () => {
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr || !data?.user) return;
      if (mounted) setFarmerId(data.user.id);
    };
    loadFarmerId();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setFarmerActionLocks((prev) => {
      let changed = false;
      const next = { ...prev };
      localBids.forEach((bid) => {
        const lock = next[bid.id];
        if (!lock || !lock.locked) return;
        if (
          bid.status === "countered" &&
          lock.lastCounter != null &&
          Number(bid.counter_price) !== Number(lock.lastCounter)
        ) {
          next[bid.id] = { locked: false, lastCounter: null };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [localBids]);

  useEffect(() => {
    window.localStorage.setItem("farmer-active-tab", activeTab);
  }, [activeTab]);

  const handleSaleTouchStart = (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    if (window.scrollY > 0) return;
    saleTouchStartYRef.current = event.touches[0].clientY;
    saleTouchDeltaRef.current = 0;
    salePullingRef.current = true;
  };

  const handleSaleTouchMove = (event) => {
    if (!salePullingRef.current) return;
    if (!event.touches || event.touches.length !== 1) return;
    saleTouchDeltaRef.current = event.touches[0].clientY - saleTouchStartYRef.current;
  };

  const handleSaleTouchEnd = () => {
    if (!salePullingRef.current) return;
    const delta = saleTouchDeltaRef.current;
    salePullingRef.current = false;
    saleTouchDeltaRef.current = 0;
    saleTouchStartYRef.current = 0;
    if (delta > 80) {
      window.location.reload();
    }
  };

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const shouldDisableRefresh = activeTab === "home";
    html.classList.toggle("disable-refresh", shouldDisableRefresh);
    body.classList.toggle("disable-refresh", shouldDisableRefresh);
    return () => {
      html.classList.remove("disable-refresh");
      body.classList.remove("disable-refresh");
    };
  }, [activeTab]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);

      try {
        const simpleQuery = "agricultura OR cereale OR preturi";
        const { data, error } = await supabase.functions.invoke("gnews", {
          body: {
            q: simpleQuery,
            lang: "ro",
            max: 10,
          },
        });

        if (error) {
          throw error;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        const rawArticles = Array.isArray(data?.articles) ? data.articles : [];
        const seen = new Set();
        const deduped = [];
        for (const item of rawArticles) {
          const title = (item?.title || "").trim().toLowerCase();
          const url = (item?.url || "").trim().toLowerCase();
          const key = url || title;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          deduped.push(item);
        }
        setNewsItems(deduped);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("News error:", err);
          setNewsError(err?.message || "Loading error");
        }
      } finally {
        setNewsLoading(false);
      }
    };

    if (activeTab === "news") {
      fetchNews();
    }

    return () => controller.abort();
  }, [activeTab]);

  // ============================
  // CALCULE: accepted only
  // ============================
  const userBids = useMemo(() => {
    if (!farmerId) return [];
    return localBids.filter((b) => b.farmer_id === farmerId);
  }, [localBids, farmerId]);

  const filteredBids = useMemo(() => {
    return userBids.filter((b) => {
      if (productFilter !== "all" && b.product !== productFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          if (b.status !== "pending" && b.status !== "countered") return false;
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
        b.final_price != null
          ? Number(b.final_price)
          : b.counter_price != null
          ? Number(b.counter_price)
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

  // ============================
  // ACTIONS (countered bids)
  // ============================
  const parseOptionalNumber = (value) => {
    const trimmed = String(value ?? "").trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : NaN;
  };

  const handleAcceptCounter = async (bid) => {
    const finalPrice =
      bid.counter_price != null ? Number(bid.counter_price) : Number(bid.price);

    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "accepted", final_price: finalPrice })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Error while accepting: " + updErr.message);
      return;
    }

    setLocalBids((prev) =>
      prev.map((x) =>
        x.id === bid.id ? { ...x, status: "accepted", final_price: finalPrice } : x
      )
    );
    if (bid.farmer_id) {
      await addFarmerRewardsPoints(bid.farmer_id, Number(bid.quantity || 0));
    }
    window.dispatchEvent(new Event("farmer-progress-refresh"));
    setFarmerConfirmAction(null);
    setFarmerActionLocks((prev) => ({
      ...prev,
      [bid.id]: { locked: true, lastCounter: null },
    }));
  };

  const handleRejectCounter = async (bid) => {
    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "rejected" })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Error while rejecting: " + updErr.message);
      return;
    }

    setLocalBids((prev) =>
      prev.map((x) => (x.id === bid.id ? { ...x, status: "rejected" } : x))
    );
    setFarmerConfirmAction(null);
    setFarmerActionLocks((prev) => ({
      ...prev,
      [bid.id]: { locked: true, lastCounter: null },
    }));
  };

  const handleCounterBack = async (bid) => {
    const value = Number(farmerModalCounter);
    if (!Number.isFinite(value) || value <= 0) {
      window.alert("Enter a valid price.");
      return;
    }

    const { error: updErr } = await supabase
      .from("bids")
      .update({ counter_price: value, status: "countered" })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Error while countering: " + updErr.message);
      return;
    }

    setLocalBids((prev) =>
      prev.map((x) =>
        x.id === bid.id ? { ...x, counter_price: value, status: "countered" } : x
      )
    );
    setFarmerConfirmAction(null);
    setFarmerActionLocks((prev) => ({
      ...prev,
      [bid.id]: { locked: true, lastCounter: value },
    }));
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("en-GB", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusLabel = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "accepted") return "Accepted";
    if (value === "rejected") return "Rejected";
    if (value === "countered") return "Counter offer";
    return "Pending";
  };

  return (
    <div className="dashboard-inner">
      <style>{`
        @media screen and (min-width: 1024px) {
          .dashboard-home-stack {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 32px;
          }

          .dashboard-home-stack .card {
            margin-bottom: 0;
          }

          .home-card-primary {
            padding-bottom: 12px;
          }

          .dashboard-home-stack .progress-card {
            margin-bottom: 0;
          }

          .dashboard-home-stack .exchange-card {
            border-radius: 24px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            border: 1px solid #e2e8f0 !important;
            padding: 24px !important;
            background-color: #ffffff !important;
            width: 100%;
            box-sizing: border-box;
            /* Keep margin reset active. */
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }

          .theme-dark .dashboard-home-stack .exchange-card {
            background-color: #0f172a !important;
            border-color: #1f2937 !important;
            box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.55) !important;
          }
        }

        .tab-content.active .bid-details .bid-field,
        .tab-content.active .bid-details-compact .bid-field {
          gap: 2px !important;
        }
      `}</style>
      <nav className="desktop-nav">
        <button
          type="button"
          className={"nav-item " + (activeTab === "home" ? "active" : "")}
          onClick={() => setActiveTab("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "sale" ? "active" : "")}
          onClick={() => setActiveTab("sale")}
        >
          Sale
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "activity" ? "active" : "")}
          onClick={() => setActiveTab("activity")}
        >
          My Activity
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "news" ? "active" : "")}
          onClick={() => setActiveTab("news")}
        >
          News
        </button>
      </nav>

      <div className="farmer-dashboard-layout">
        <div className={"tab-content " + (activeTab === "home" ? "active" : "")}>
          {/* PROGRESS + MARKET OVERVIEW - Desktop Single Column */}
          <div className="dashboard-row full">
            <div className="dashboard-home-stack">
              <div className="card dashboard-card home-card-primary">
                <FarmerProgress embedded />
              </div>

              <div className="home-card-secondary">
                <ExchangeRatesCard />
              </div>

              <div className="card dashboard-card home-card-secondary">
                <WeatherWidget />
              </div>

              <div className="card dashboard-card home-card-tertiary">
                <MarketTicker />
              </div>
            </div>
          </div>
        </div>

        <div
          className={"tab-content " + (activeTab === "sale" ? "active" : "")}
          onTouchStart={activeTab === "sale" ? handleSaleTouchStart : undefined}
          onTouchMove={activeTab === "sale" ? handleSaleTouchMove : undefined}
          onTouchEnd={activeTab === "sale" ? handleSaleTouchEnd : undefined}
        >
          {/* PRICES + BID FORM */}
          <div className="dashboard-row full">
            <div className="card dashboard-card sale-card">
              <PricesGrid />
              <div className="section-divider" />
              <BidForm onBidCreated={fetchBids} embedded />
              <div className="section-divider" />
              <SiloPriceTable commodities={commodities} readOnly />
            </div>
          </div>
        </div>

        <div className={"tab-content " + (activeTab === "activity" ? "active" : "")}>
          {/* ACTIVITY */}
          <div className="dashboard-row full">
            <div className="card">
              <div className="card-header activity-header-compact">
                <h2 className="market-title">My Activity</h2>
              </div>

              <div className="card-body">
                {loading && <p>Loading data...</p>}
                {error && <p className="badge rejected">{error}</p>}

            {showStats && (
              <div className="dashboard-section">
                {statsRows.length === 0 ? (
                  <p className="small-text">
                    No stats available for the selected filters.
                  </p>
                ) : (
                  <div className="table-wrapper">
                    <table className="table stats-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Volume (t)</th>
                          <th>Average price</th>
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
                  <div className="activity-header">
                    <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>
                      My Bids
                    </h3>
                    <div className="admin-bids-actions">
                      <button
                        type="button"
                        className="btn small outline filter-btn"
                        onClick={() => setFiltersOpen(true)}
                      >
                        Filters
                      </button>
                      <button
                        type="button"
                        className="btn small outline filter-btn"
                        onClick={() => setShowStats((prev) => !prev)}
                      >
                        Stats
                      </button>
                    </div>
                  </div>

                  {filteredBids.length === 0 ? (
                    <p className="small-text">
                      You have no bids yet.
                    </p>
                  ) : (
                    <div className="bid-list">
                      {filteredBids.map((b) => {
                        const statusClass =
                          b.status === "accepted"
                            ? "is-accepted"
                            : b.status === "rejected"
                            ? "is-rejected"
                            : b.status === "countered"
                            ? "is-countered"
                            : "is-pending";
                        const activePrice =
                          b.counter_price != null
                            ? Number(b.counter_price)
                            : Number(b.price);
                        const unit = b.product === "sunflower" ? "USD/t" : "EUR/t";
                        const statusLabel = getStatusLabel(b.status);

                        return (
                          <div
                            role="button"
                            tabIndex={0}
                            key={b.id}
                            className={"bid-row " + statusClass}
                            onClick={() => {
                              setSelectedBid(b);
                              const counterValue =
                                Number(b.counter_price || 0) > 0
                                  ? String(b.counter_price)
                                  : "";
                              setFarmerModalCounter(counterValue);
                              setFarmerModalOriginal({ counter: counterValue });
                              setFarmerConfirmAction(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                const counterValue =
                                  Number(b.counter_price || 0) > 0
                                    ? String(b.counter_price)
                                    : "";
                                setSelectedBid(b);
                                setFarmerModalCounter(counterValue);
                                setFarmerModalOriginal({ counter: counterValue });
                                setFarmerConfirmAction(null);
                              }
                            }}
                          >
                            <div className="bid-header">
                              <div>
                                <div className="bid-title">
                                  {getProductLabelSafe(b.product)}
                                </div>
                                {b.status === "accepted" && b.contract_no && (
                                  <div className="bid-contract">
                                    Contract: {b.contract_no}
                                  </div>
                                )}
                              </div>
                              <span className={`status-badge status-${statusClass.slice(3)}`}>
                                {statusLabel}
                              </span>
                            </div>

                      <div className="bid-details bid-details-compact">
                        <div className="bid-field">
                          <span className="bid-label">Quantity</span>
                          <span className="bid-value bid-qty">
                            {Number(b.quantity || 0).toFixed(2)} t
                          </span>
                        </div>
                        <div className="bid-field bid-field-right">
                          <span className="bid-label">Price</span>
                          <span
                            className={[
                              "bid-value",
                              "bid-price",
                              b.counter_price != null && b.status === "countered"
                                ? "farmer-bid-counter-value"
                                : "",
                            ].join(" ")}
                          >
                            {Number(activePrice || 0).toFixed(2)} EUR/t
                          </span>
                        </div>
                      </div>
                      <div className="bid-details bid-details-compact">
                        <div className="bid-field">
                          <span className="bid-value bid-parity-value">
                            {formatParityDisplay(b)}
                          </span>
                        </div>
                      </div>

                      <div className="bid-footer">
                        Offer date:{" "}
                        <span className="bid-date-value">
                          {formatDateOnly(b.created_at)}
                        </span>
                      </div>
                            <div className="bid-hint">View details &gt;</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={"tab-content " + (activeTab === "news" ? "active" : "")}>
          {/* NEWS */}
          <div className="dashboard-row full">
            <div className="card">
              <div className="card-header">
                <h2 className="market-title">News</h2>
              </div>
              <div className="card-body">
                {newsLoading && <p className="small-text">Loading news...</p>}
                {newsError && <p className="badge rejected">{newsError}</p>}
                {!newsLoading && !newsError && newsItems.length === 0 && (
                  <p className="small-text">No relevant news found.</p>
                )}
                {!newsLoading && !newsError && newsItems.length > 0 && (
                  <div className="news-list">
                    {newsItems.map((item) => (
                      <a
                        key={item.url}
                        className="news-item"
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.image && (
                          <img
                            className="news-thumb"
                            src={item.image}
                            alt={item.title}
                            loading="lazy"
                          />
                        )}
                        <div className="news-content">
                          <div className="news-title">{item.title}</div>
                          <div className="small-text">
                            {item.source?.name ? item.source.name + " • " : ""}
                            {item.publishedAt
                              ? new Date(item.publishedAt).toLocaleDateString("en-GB")
                              : ""}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedBid && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedBid(null)}
        >
          <div
            className="bid-modal"
            onClick={(event) => {
              event.stopPropagation();
              setFarmerConfirmAction(null);
            }}
          >
            <div className="bid-modal-header">
              <h3>Bid details</h3>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setSelectedBid(null)}
              >
                Close
              </button>
            </div>
            <div className="bid-modal-body">
              <div><b>Date:</b> {formatDateTime(selectedBid.created_at)}</div>
              <div>
                <b>Product:</b> {getProductLabelSafe(selectedBid.product)}
              </div>
              <div><b>Quantity:</b> {Number(selectedBid.quantity || 0).toFixed(2)} t</div>
              <div>
                <b>Price (Counter):</b>{" "}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    className="input inline-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="-"
                    value={farmerModalCounter}
                    onChange={(e) => setFarmerModalCounter(e.target.value)}
                  />
                  {selectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
                </span>
              </div>
              <div>
                <b>Status:</b> {selectedBid.status}
              </div>
              {selectedBid.status === "accepted" && selectedBid.contract_no && (
                <div>
                  <b>Contract:</b> {selectedBid.contract_no}
                </div>
              )}
              {isFreightParity(selectedBid.parity) && (
                <div>
                  <b>Loading:</b> {formatLocationDisplay(selectedBid.loading_location || "-")}
                </div>
              )}
              <div>
                <b>Delivery:</b>{" "}
                {formatDeliveryRange(
                  selectedBid.delivery_start,
                  selectedBid.delivery_end
                )}
              </div>
            </div>
            {selectedBid.status === "countered" && (
              <div className="modal-actions">
                {(() => {
                  const lockInfo = farmerActionLocks[selectedBid.id];
                  const isLocked =
                    lockInfo?.locked &&
                    (lockInfo.lastCounter == null ||
                      Number(selectedBid.counter_price) ===
                        Number(lockInfo.lastCounter));
                  const currentCounter = parseOptionalNumber(farmerModalCounter);
                  const originalCounter = parseOptionalNumber(farmerModalOriginal.counter);
                  const counterInvalid =
                    currentCounter != null && !Number.isFinite(currentCounter);
                  const counterChanged =
                    counterInvalid ||
                    (currentCounter == null && originalCounter != null) ||
                    (currentCounter != null && originalCounter == null) ||
                    (Number.isFinite(currentCounter) &&
                      Number.isFinite(originalCounter) &&
                      currentCounter !== originalCounter);
                  const hasChanges = counterChanged;
                  return (
                    <>
                      <button
                        type="button"
                        className="btn small ghost farmer-reject-btn"
                        disabled={isLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (farmerConfirmAction !== "rejected") {
                            setFarmerConfirmAction("rejected");
                            return;
                          }
                          handleRejectCounter(selectedBid);
                        }}
                      >
                        {farmerConfirmAction === "rejected" ? "Confirm?" : "Reject"}
                      </button>
                      <button
                        type="button"
                        className="btn small ghost farmer-counter-btn"
                        disabled={!hasChanges || counterInvalid || isLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (farmerConfirmAction !== "countered") {
                            setFarmerConfirmAction("countered");
                            return;
                          }
                          handleCounterBack(selectedBid);
                        }}
                      >
                        {farmerConfirmAction === "countered" ? "Confirm?" : "Counter offer"}
                      </button>
                      <button
                        type="button"
                        className="btn small ghost farmer-accept-btn"
                        disabled={hasChanges || isLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (farmerConfirmAction !== "accepted") {
                            setFarmerConfirmAction("accepted");
                            return;
                          }
                          handleAcceptCounter(selectedBid);
                        }}
                      >
                        {farmerConfirmAction === "accepted" ? "Confirm?" : "Accept"}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {filtersOpen && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setFiltersOpen(false)}
        >
          <div className="bid-modal" onClick={(event) => event.stopPropagation()}>
            <div className="bid-modal-header">
              <h3>Filters</h3>
              <button
                type="button"
                className="btn small outline filter-btn"
                onClick={() => setFiltersOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="bid-modal-body">
              <div className="filter-group">
                <label className="label">Product</label>
                <select
                  className="input"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {PRODUCT_FILTER_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {getProductLabelSafe(key)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Bid status</label>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Bid date (from)</label>
                <input
                  className="input"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label className="label">Bid date (to)</label>
                <input
                  className="input"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="btn small outline filter-btn"
                  onClick={() => setFiltersOpen(false)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="btn small outline filter-btn"
                  onClick={() => {
                    setProductFilter("all");
                    setStatusFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button
          type="button"
          className={"nav-item " + (activeTab === "home" ? "active" : "")}
          onClick={() => setActiveTab("home")}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5z" />
          </svg>
          <span className="nav-label">Home</span>
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "sale" ? "active" : "")}
          onClick={() => setActiveTab("sale")}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 3v18" />
            <path d="M16 7.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3-4-1.1-4-3" />
          </svg>
          <span className="nav-label">Sale</span>
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "activity" ? "active" : "")}
          onClick={() => setActiveTab("activity")}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 20V9m7 11V4m7 16v-6" />
          </svg>
          <span className="nav-label">Activity</span>
        </button>
        <button
          type="button"
          className={"nav-item " + (activeTab === "news" ? "active" : "")}
          onClick={() => setActiveTab("news")}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M3.5 6h15a2 2 0 0 1 2 2v9.5a1.5 1.5 0 0 1-3 0V7.5H6.5v10a1.5 1.5 0 0 1-3 0V6z" />
            <path d="M8 10h6M8 13h6M8 16h5" />
          </svg>
          <span className="nav-label">News</span>
        </button>
      </nav>
    </div>
  );

  
}
