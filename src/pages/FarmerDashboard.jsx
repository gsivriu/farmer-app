import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

import MarketTicker from "../components/MarketTicker";
import PricesGrid from "../components/PricesGrid";
import BidForm from "../components/BidForm";

import FarmerProgress from "../components/FarmerProgress";


const PRODUCT_LABELS = {
  wheat: "Grâu",
  barley: "Orz",
  corn: "Porumb",
  rapeseed: "Rapiță",
  sunflower: "Floarea soarelui",
};

export default function FarmerDashboard() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedBid, setSelectedBid] = useState(null);
  const [productFilter, setProductFilter] = useState("all");
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);

  const loadBids = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setError("Nu am putut identifica utilizatorul curent.");
      setLoading(false);
      return;
    }

    const userId = userData.user.id;

    const { data, error: bidsError } = await supabase
      .from("bids")
      .select("*")
      .eq("farmer_id", userId) // ✅ important
      .order("created_at", { ascending: false });

    if (bidsError) {
      setError("Eroare la încărcarea bid-urilor: " + bidsError.message);
      setLoading(false);
      return;
    }

    setBids(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBids();
  }, [loadBids]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);

      const keywords = [
        '"preț grâu"',
        '"porumb"',
        '"rapiță"',
        '"floarea soarelui"',
        '"recoltă cereale"',
        '"piața agricolă"',
        '"wheat price"',
        '"corn price"',
        '"rapeseed"',
        '"sunflower seeds"',
        '"grain harvest"',
        '"agricultural market"',
        '"Port Constanța"',
        '"tranzit cereale"',
        '"Ukraine grain deal"',
        '"exporturi Rusia"',
        '"curs BNR"',
        '"euro ron"',
        '"inflație România"',
        '"ROBOR"',
        '"preț motorină"',
        '"gaz natural"',
        '"preț baril petrol"',
        '"diesel price"',
        '"natural gas"',
        '"oil barrel price"',
      ];

      const buildQuery = (terms, maxLen) => {
        let result = "";
        for (const term of terms) {
          const next = result ? `${result} OR ${term}` : term;
          if (next.length > maxLen) break;
          result = next;
        }
        return result;
      };

      const q = buildQuery(keywords, 200);
      try {
        const { data, error } = await supabase.functions.invoke("gnews", {
          body: { q, lang: "ro", max: 10 },
        });

        if (error) {
          throw new Error(error.message || "GNews error");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setNewsItems(Array.isArray(data?.articles) ? data.articles : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("GNews fetch failed:", err);
          setNewsError(err?.message || "Nu am putut încărca știrile.");
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
  const acceptedBids = useMemo(
    () => bids.filter((b) => b.status === "accepted"),
    [bids]
  );

  const filteredAcceptedBids = useMemo(() => {
    if (productFilter === "all") return acceptedBids;
    return acceptedBids.filter((b) => b.product === productFilter);
  }, [acceptedBids, productFilter]);

  const filteredBids = useMemo(() => {
    if (productFilter === "all") return bids;
    return bids.filter((b) => b.product === productFilter);
  }, [bids, productFilter]);

  const totalQty = useMemo(() => {
    return acceptedBids.reduce((acc, b) => acc + Number(b.quantity || 0), 0);
  }, [filteredAcceptedBids]);

  const statsRows = useMemo(() => {
    const map = new Map();

    for (const b of filteredAcceptedBids) {
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
  }, [filteredAcceptedBids]);

  // ============================
  // ACTIONS (countered bids)
  // ============================
  const handleAcceptCounter = async (bid) => {
    const finalPrice =
      bid.counter_price != null ? Number(bid.counter_price) : Number(bid.price);

    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "accepted", final_price: finalPrice })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Eroare la acceptare: " + updErr.message);
      return;
    }

    setBids((prev) =>
      prev.map((x) =>
        x.id === bid.id ? { ...x, status: "accepted", final_price: finalPrice } : x
      )
    );
  };

  const handleRejectCounter = async (bid) => {
    const { error: updErr } = await supabase
      .from("bids")
      .update({ status: "rejected" })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Eroare la respingere: " + updErr.message);
      return;
    }

    setBids((prev) => prev.map((x) => (x.id === bid.id ? { ...x, status: "rejected" } : x)));
  };

  const handleCounterBack = async (bid) => {
    const lastPrice =
      bid.counter_price != null ? Number(bid.counter_price) : Number(bid.price);

    const input = window.prompt(
      `Introduceți un nou preț (EUR/t).\nUltima ofertă: ${lastPrice} EUR/t`,
      String(lastPrice)
    );

    if (input === null) return;

    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) {
      window.alert("Introduceți un preț valid.");
      return;
    }

    const { error: updErr } = await supabase
      .from("bids")
      .update({ counter_price: value, status: "countered" })
      .eq("id", bid.id);

    if (updErr) {
      window.alert("Eroare la counter: " + updErr.message);
      return;
    }

    setBids((prev) =>
      prev.map((x) =>
        x.id === bid.id ? { ...x, counter_price: value, status: "countered" } : x
      )
    );
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("ro-RO", {
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
    return dt.toLocaleDateString("en-GB");
  };

  return (
    <div className="app-container">
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
          Activitatea mea
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
          {/* PROGRESS + MARKET OVERVIEW */}
          <div className="dashboard-row full">
            <div className="card dashboard-card">
              <FarmerProgress embedded />
              <div className="section-divider" />
              <MarketTicker />
            </div>
          </div>
        </div>

        <div className={"tab-content " + (activeTab === "sale" ? "active" : "")}>
          {/* PRICES + BID FORM */}
          <div className="dashboard-row full">
            <div className="card dashboard-card sale-card">
              <PricesGrid />
              <div className="section-divider" />
              <BidForm onBidCreated={loadBids} embedded />
            </div>
          </div>
        </div>

        <div className={"tab-content " + (activeTab === "activity" ? "active" : "")}>
          {/* ACTIVITY */}
          <div className="dashboard-row full">
            <div className="card">
              <div className="card-header">
                <h2 className="market-title">Activitatea mea</h2>
              </div>

              <div className="card-body">
                {loading && <p>Se încarcă datele...</p>}
                {error && <p className="badge rejected">{error}</p>}

                <div className="dashboard-section">
                  <p>
                    <strong>Volum total:</strong>{" "}
                    {Number(totalQty || 0).toFixed(2)} t
                  </p>
                </div>

            <div className="dashboard-section">
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>
                  Statistici pe produs
                </h3>
                <select
                  className="input"
                  style={{ maxWidth: 180, padding: "6px 8px", fontSize: 13 }}
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <option value="all">Toate</option>
                  {Object.keys(PRODUCT_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {PRODUCT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              {statsRows.length === 0 ? (
                <p className="small-text">
                  Nu ai încă bid-uri acceptate pentru a calcula statistici.
                </p>
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
                              <td>{PRODUCT_LABELS[row.product] || row.product}</td>
                              <td>{Number(row.totalQty || 0).toFixed(2)}</td>
                              <td>{Number(row.avgPrice || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="dashboard-section">
                  <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>
                    Bid-urile mele
                  </h3>

                  {filteredBids.length === 0 ? (
                    <p className="small-text">
                      Nu ai încă bid-uri plasate.
                    </p>
                  ) : (
                    <div className="bid-list">
                      {filteredBids.map((b) => {
                        const statusClass =
                          b.status === "accepted"
                            ? "is-accepted"
                            : b.status === "rejected"
                            ? "is-rejected"
                            : "is-pending";
                        const activePrice =
                          b.counter_price != null
                            ? Number(b.counter_price)
                            : Number(b.price);

                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={"bid-row " + statusClass}
                            onClick={() => setSelectedBid(b)}
                          >
                            <div className="bid-left">
                              <div className="bid-title">
                                {PRODUCT_LABELS[b.product] || b.product}
                              </div>
                              <div className="bid-date">{formatDateOnly(b.created_at)}</div>
                              {b.status === "accepted" && b.contract_no && (
                                <div className="bid-contract">Contract: {b.contract_no}</div>
                              )}
                            </div>

                            <div className="bid-details">
                              <div className="bid-field">
                                <span className="bid-label">Cantitate</span>
                                <span className="bid-value">
                                  {Number(b.quantity || 0).toFixed(2)} t
                                </span>
                              </div>
                              <div className="bid-field">
                                <span className="bid-label">Preț</span>
                                <span className="bid-value">
                                  {Number(activePrice || 0).toFixed(2)} EUR/t
                                </span>
                              </div>
                              <div className="bid-field">
                                <span className="bid-label">Livrare</span>
                                <span className="bid-value">
                                  {b.delivery_start && b.delivery_end
                                    ? `${b.delivery_start} → ${b.delivery_end}`
                                    : "-"}
                                </span>
                              </div>
                            </div>

                            <div className="bid-right">
                              <span className="bid-status">{b.status}</span>
                              {b.status === "countered" && (
                                <div className="bid-actions">
                                  <button
                                    type="button"
                                    className="btn small ghost"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleAcceptCounter(b);
                                    }}
                                  >
                                    Acceptă
                                  </button>
                                  <button
                                    type="button"
                                    className="btn small ghost"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRejectCounter(b);
                                    }}
                                  >
                                    Respinge
                                  </button>
                                  <button
                                    type="button"
                                    className="btn small ghost"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleCounterBack(b);
                                    }}
                                  >
                                    Counter
                                  </button>
                                </div>
                              )}
                            </div>
                          </button>
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
                {newsLoading && <p className="small-text">Se încarcă știrile...</p>}
                {newsError && <p className="badge rejected">{newsError}</p>}
                {!newsLoading && !newsError && newsItems.length === 0 && (
                  <p className="small-text">Nu am găsit știri relevante.</p>
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
                              ? new Date(item.publishedAt).toLocaleDateString("ro-RO")
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
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bid-modal-header">
              <h3>Detalii bid</h3>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setSelectedBid(null)}
              >
                Închide
              </button>
            </div>
            <div className="bid-modal-body">
              <div><b>Data:</b> {formatDateTime(selectedBid.created_at)}</div>
              <div>
                <b>Produs:</b> {PRODUCT_LABELS[selectedBid.product] || selectedBid.product}
              </div>
              <div><b>Cantitate:</b> {Number(selectedBid.quantity || 0).toFixed(2)} t</div>
              <div>
                <b>Preț:</b>{" "}
                {Number(
                  selectedBid.counter_price != null
                    ? selectedBid.counter_price
                    : selectedBid.price || 0
                ).toFixed(2)}{" "}
                EUR/t
              </div>
              <div>
                <b>Status:</b> {selectedBid.status}
              </div>
              {selectedBid.contract_no && (
                <div>
                  <b>Contract:</b> {selectedBid.contract_no}
                </div>
              )}
              <div>
                <b>Livrare:</b>{" "}
                {selectedBid.delivery_start && selectedBid.delivery_end
                  ? `${selectedBid.delivery_start} → ${selectedBid.delivery_end}`
                  : "-"}
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
