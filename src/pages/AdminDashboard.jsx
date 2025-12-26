import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext.jsx";
import MarketTicker from "../components/MarketTicker.jsx";

const PRODUCT_LABELS = {
  wheat: "Grâu",
  barley: "Orz",
  corn: "Porumb",
  rapeseed: "Rapiță",
  sunflower: "Floarea soarelui",
};

export default function AdminDashboard() {
  // === PREȚURI INTERNE (CONTEXT) ===
  const { commodities, updateCommodityPrice } = useAppContext();

  const [draftPrices, setDraftPrices] = useState({});
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    setDraftPrices(
      Object.fromEntries((commodities || []).map((c) => [c.id, String(c.price)]))
    );
  }, [commodities]);

  const handleDraftChange = (id, value) => {
    setDraftPrices((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSavePrice = (id) => {
    const raw = draftPrices[id];
    const num = Number(raw);

    if (!raw || raw.trim() === "") {
      alert("Introdu un preț înainte de a confirma.");
      return;
    }

    if (!Number.isFinite(num) || num <= 0) {
      alert("Introduceți un preț valid, mai mare ca 0.");
      return;
    }

    updateCommodityPrice(id, num);

    setDraftPrices((prev) => ({
      ...prev,
      [id]: String(num),
    }));
  };

  // === BIDS DIN SUPABASE ===
  const [bids, setBids] = useState([]);
  const [farmers, setFarmers] = useState([]); // listă unică de fermieri
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtre listă principală
  const [listFarmerFilter, setListFarmerFilter] = useState("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // istoric fermier selectat
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [farmerHistory, setFarmerHistory] = useState([]);
  const [farmerProductFilter, setFarmerProductFilter] = useState("all");

  const [counterValues, setCounterValues] = useState({});
  const [selectedBid, setSelectedBid] = useState(null);

  // referințe pentru date (pentru fake picker)
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  const loadBids = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setBids([]);
      setFarmers([]);
    } else {
      setBids(data || []);

      // listă unică de fermieri (id + email)
      const map = new Map();
      (data || []).forEach((b) => {
        if (!b.farmer_id) return;
        if (!map.has(b.farmer_id)) {
          map.set(b.farmer_id, {
            id: b.farmer_id,
            email: b.farmer_email || b.farmer_id,
          });
        }
      });
      setFarmers(Array.from(map.values()));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBids();
  }, []);

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from("bids").update({ status }).eq("id", id);

    if (error) {
      alert("Eroare la actualizarea statusului: " + error.message);
      return;
    }
    await loadBids();
  };

  const sendCounter = async (id) => {
    const raw = counterValues[id];
    const num = Number(raw);

    if (!raw || !Number.isFinite(num) || num <= 0) {
      alert("Introdu un preț de counter valid.");
      return;
    }

    const { error } = await supabase
      .from("bids")
      .update({ status: "countered", counter_price: num })
      .eq("id", id);

    if (error) {
      alert("Eroare la trimiterea counterului: " + error.message);
      return;
    }

    setCounterValues((prev) => ({ ...prev, [id]: "" }));
    await loadBids();
  };

  const loadFarmerHistory = async (farmer_id) => {
    if (!farmer_id || farmer_id === "all") {
      setSelectedFarmer(null);
      setFarmerHistory([]);
      return;
    }

    setSelectedFarmer(farmer_id);
    setFarmerProductFilter("all");

    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("farmer_id", farmer_id)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Eroare la încărcarea istoricului: " + error.message);
      setFarmerHistory([]);
      return;
    }

    setFarmerHistory(data || []);
  };

  const formatDateOnly = (value) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("en-GB");
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

  const getFarmerEmail = (farmer_id) => {
    const fromList = farmers.find((f) => f.id === farmer_id)?.email || null;
    const fromBids = bids.find((b) => b.farmer_id === farmer_id)?.farmer_email || farmer_id;
    const fromHistory =
      farmerHistory.find((b) => b.farmer_id === farmer_id)?.farmer_email ||
      fromList ||
      fromBids;
    return fromHistory;
  };

  // === STATISTICI PE PRODUS (accepted) ===
  const acceptedHistory = farmerHistory.filter((b) => b.status === "accepted");

  const statsMap = {};
  for (const b of acceptedHistory) {
    const p = b.product || "unknown";
    const qty = Number(b.quantity || 0);
    const price = Number(b.price || 0);

    if (!statsMap[p]) {
      statsMap[p] = { product: p, totalQty: 0, totalValue: 0 };
    }
    statsMap[p].totalQty += qty;
    statsMap[p].totalValue += qty * price;
  }

  const statsRows = Object.values(statsMap).map((r) => ({
    ...r,
    avgPrice: r.totalQty ? r.totalValue / r.totalQty : 0,
  }));

  // filtre pentru „Toate bid-urile”
  const filteredBids = bids.filter((b) => {
    if (listFarmerFilter !== "all" && b.farmer_id !== listFarmerFilter) return false;

    const dateStr = b.created_at ? b.created_at.slice(0, 10) : null;

    if (filterStart && (!dateStr || dateStr < filterStart)) return false;
    if (filterEnd && (!dateStr || dateStr > filterEnd)) return false;

    return true;
  });

  // filtrare istoric fermier după produs
  const filteredHistory =
    farmerProductFilter === "all"
      ? farmerHistory
      : farmerHistory.filter((b) => b.product === farmerProductFilter);

  return (
    <div className="admin-layout">
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
          className={"nav-item " + (activeTab === "bids" ? "active" : "")}
          onClick={() => setActiveTab("bids")}
        >
          Farmer Bids
        </button>
      </nav>

      <div className="tab-content admin-tab-content">
        <div className={activeTab === "home" ? "tab-pane active" : "tab-pane"}>
          {/* Optional: Market overview sus (arata bine pe admin) */}
          <div className="card admin-card">
            <MarketTicker />
          </div>

          {/* CARD: Setare prețuri */}
          <div className="card admin-card">
            <div className="card-header">
              <h2 className="market-title">Setare prețuri zilnice</h2>
              <p className="market-subtitle">
                Introdu și confirmă prețurile interne. Fermierii vor vedea automat noile valori.
              </p>
            </div>

            <div className="admin-grid">
              {(commodities || []).map((c) => (
                <div className="admin-price-item" key={c.id}>
                  <div className="admin-label">{c.name || PRODUCT_LABELS[c.id] || c.id}</div>

                  <div className="admin-row">
                    <input
                      className="input admin-input"
                      type="number"
                      step="0.01"
                      value={draftPrices?.[c.id] ?? ""}
                      onChange={(e) => handleDraftChange(c.id, e.target.value)}
                      placeholder="ex: 200"
                    />

                    <span className="admin-unit">
                      {c.id === "sunflower" ? "USD/t" : "EUR/t"}
                    </span>

                    <button
                      type="button"
                      className="btn primary-btn admin-btn"
                      onClick={() => handleSavePrice(c.id)}
                    >
                      Confirmă
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={activeTab === "bids" ? "tab-pane active" : "tab-pane"}>
          {/* CARD: Filtre + Toate bid-urile */}
          <div className="card admin-card">
            <div className="card-header">
              <h2 className="market-title">Toate bid-urile</h2>
              <p className="market-subtitle">Filtrează după fermier și perioadă.</p>
            </div>

            <div className="admin-filters">
              <div className="admin-filter">
                <label className="label">Fermieri</label>
                <select
                  className="input"
                  value={listFarmerFilter}
                  onChange={(e) => {
                    const id = e.target.value;
                    setListFarmerFilter(id);
                  
                    // dacă alegi un fermier, încarcă automat istoricul lui
                    if (id !== "all") {
                      loadFarmerHistory(id);
                    } else {
                      // dacă revii pe "all", ascundem istoricul
                      setSelectedFarmer(null);
                      setFarmerHistory([]);
                    }
                  }}
                  
                >
                  <option value="all">Toți fermierii</option>
                  {(farmers || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.email || f.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-filter">
               <label className="label">De la</label>
                <input
                type="date"
                className="input"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                />
                </div>

                <div className="admin-filter">
                  <label className="label">Până la</label>
                  <input
                    type="date"
                    className="input"
                    value={filterEnd}
                            onChange={(e) => setFilterEnd(e.target.value)}
                      />
                </div>


            </div>

            {loading && <p className="small-text" style={{ marginTop: 12 }}>Se încarcă...</p>}
            {error && <p className="badge rejected" style={{ marginTop: 12 }}>{error}</p>}

            {!loading && !error && (
              <div className="admin-table-scroll" style={{ marginTop: 14 }}>
                <div className="table-wrapper">
                <table className="table wide-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Fermier</th>
                      <th>Produs</th>
                      <th>Cantitate (t)</th>
                      <th>Preț</th>
                      <th>Paritate</th>
                      <th>Livrare</th>
                      <th>Status</th>
                      <th>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBids.map((b) => (
                      <tr key={b.id}>
                        <td>{formatDateTime(b.created_at)}</td>
                        <td>{b.farmer_email || b.farmer_id}</td>
                        <td>{PRODUCT_LABELS[b.product] || b.product}</td>
                        <td>{Number(b.quantity || 0).toFixed(2)}</td>
                        <td>
                          {Number(b.price || 0).toFixed(2)}{" "}
                          {b.product === "sunflower" ? "USD/t" : "EUR/t"}
                          {b.counter_price != null && (
                            <span style={{ marginLeft: 8, color: "#b91c1c", fontWeight: 700 }}>
                              (counter: {Number(b.counter_price).toFixed(2)})
                            </span>
                          )}
                        </td>
                        <td>{b.parity || "-"}</td>
                        <td>
                          {b.delivery_start && b.delivery_end
                            ? `${b.delivery_start} → ${b.delivery_end}`
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={
                              "badge " +
                              (b.status === "accepted"
                                ? "accepted"
                                : b.status === "rejected"
                                ? "rejected"
                                : b.status === "countered"
                                ? "counter"
                                : "pending")
                            }
                          >
                            {b.status}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              className="btn small ghost"
                              type="button"
                              onClick={() => updateStatus(b.id, "accepted")}
                            >
                              Accept
                            </button>

                            <button
                              className="btn small ghost"
                              type="button"
                              onClick={() => updateStatus(b.id, "rejected")}
                            >
                              Reject
                            </button>

                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input
                                className="input"
                                style={{ width: 110, padding: "6px 8px", fontSize: 13 }}
                                type="number"
                                step="0.01"
                                placeholder="Counter"
                                value={counterValues[b.id] ?? ""}
                                onChange={(e) =>
                                  setCounterValues((prev) => ({
                                    ...prev,
                                    [b.id]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                className="btn small ghost"
                                type="button"
                                onClick={() => sendCounter(b.id)}
                              >
                                Send
                              </button>
                            </div>

                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredBids.length === 0 && (
                      <tr>
                        <td colSpan={9} className="small-text" style={{ padding: 12 }}>
                          Nu există bid-uri pentru filtrele selectate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </div>

          {/* CARD: Istoric fermier (optional, doar dacă ai selectat) */}
          {selectedFarmer && (
            <div className="card admin-card">
              <div className="card-header">
                <h2 className="market-title">Istoric fermier</h2>
                <p className="market-subtitle">{getFarmerEmail(selectedFarmer)}</p>
              </div>

              <div className="admin-filters">
                <div className="admin-filter">
                  <label className="label">Produs</label>
                  <select
                    className="input"
                    value={farmerProductFilter}
                    onChange={(e) => setFarmerProductFilter(e.target.value)}
                  >
                    <option value="all">Toate</option>
                    {Object.keys(PRODUCT_LABELS).map((k) => (
                      <option key={k} value={k}>
                        {PRODUCT_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* statistici */}
              <div style={{ marginTop: 14 }}>
                <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>
                  Statistici pe produs (accepted)
                </h3>
                {statsRows.length === 0 ? (
                  <p className="small-text">Nu există bid-uri accepted în istoric.</p>
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

              {/* tabel istoric */}
              <div style={{ marginTop: 14 }}>
                <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>Bid-uri fermier</h3>

            {filteredHistory.length === 0 ? (
              <p className="small-text">Nicio înregistrare pentru filtrul selectat.</p>
            ) : (
              <div className="bid-list">
                {filteredHistory.map((b) => {
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
                  const unit = b.product === "sunflower" ? "USD/t" : "EUR/t";

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
                            {Number(activePrice || 0).toFixed(2)} {unit}
                          </span>
                        </div>
                      </div>

                      <span className="bid-status">{b.status}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => {
                    setSelectedFarmer(null);
                    setFarmerHistory([]);
                  }}
                >
                  Închide istoricul
                </button>
              </div>
            </div>
          )}
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
                {selectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
              </div>
              <div>
                <b>Status:</b> {selectedBid.status}
              </div>
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

      <nav className="bottom-nav admin-bottom-nav">
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
          className={"nav-item " + (activeTab === "bids" ? "active" : "")}
          onClick={() => setActiveTab("bids")}
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 7.5V6a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V16" />
            <path d="M14 4v6h6" />
          </svg>
          <span className="nav-label">Bids</span>
        </button>
      </nav>

      {/* Optional: Market overview sus (arata bine pe admin) */}
    </div>
  );
}
