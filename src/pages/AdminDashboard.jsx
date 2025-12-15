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
            <div className="date-wrapper">
              <input
                ref={startInputRef}
                type="date"
                className="input hidden-date-input"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
              />
              <div
                className="fake-date-display"
                onClick={() => startInputRef.current?.showPicker?.()}
              >
                {filterStart
                  ? new Date(filterStart).toLocaleDateString("ro-RO")
                  : "-"}
              </div>
            </div>
          </div>

          <div className="admin-filter">
            <label className="label">Până la</label>
            <div className="date-wrapper">
              <input
                ref={endInputRef}
                type="date"
                className="input hidden-date-input"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
              />
              <div
                className="fake-date-display"
                onClick={() => endInputRef.current?.showPicker?.()}
              >
                {filterEnd ? new Date(filterEnd).toLocaleDateString("ro-RO") : "-"}
              </div>
            </div>
          </div>
        </div>

        {loading && <p className="small-text" style={{ marginTop: 12 }}>Se încarcă...</p>}
        {error && <p className="badge rejected" style={{ marginTop: 12 }}>{error}</p>}

        {!loading && !error && (
          <div className="table-wrapper" style={{ marginTop: 14 }}>
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
                    <td>{b.created_at ? new Date(b.created_at).toLocaleString() : "-"}</td>
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

                        <button
                        className="btn small ghost"
                          type="button"
                          onClick={() => {
                          setListFarmerFilter(b.farmer_id);
                          loadFarmerHistory(b.farmer_id);
                       }}
                        >
                        Istoric
                        </button>

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
            <h3 style={{ margin: "10px 0 8px", fontSize: 16 }}>Statistici pe produs (accepted)</h3>
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
              <div className="table-wrapper">
                <table className="table wide-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Produs</th>
                      <th>Cantitate (t)</th>
                      <th>Preț</th>
                      <th>Livrare</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((b) => (
                      <tr key={b.id}>
                        <td>{b.created_at ? new Date(b.created_at).toLocaleString() : "-"}</td>
                        <td>{PRODUCT_LABELS[b.product] || b.product}</td>
                        <td>{Number(b.quantity || 0).toFixed(2)}</td>
                        <td>
                          {Number(b.price || 0).toFixed(2)}{" "}
                          {b.product === "sunflower" ? "USD/t" : "EUR/t"}
                        </td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  );
}
