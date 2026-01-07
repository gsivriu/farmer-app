import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext.jsx";
import MarketTicker from "../components/MarketTicker.jsx";
import SiloPriceTable from "../components/SiloPriceTable.jsx";
import ExchangeRatesCard from "../components/ExchangeRatesCard.jsx";

const PRODUCT_LABELS = {
  wheat: "Grâu",
  barley: "Orz",
  corn: "Porumb",
  rapeseed: "Rapiță",
  sunflower: "Floarea soarelui",
};

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
  return `${formatDateDMY(start)} ${formatDateDMY(end)}`;
};

export default function AdminDashboard() {
  // === PREȚURI INTERNE (CONTEXT) ===
  const { commodities, updateCommodityPrice } = useAppContext();

  const [draftPrices, setDraftPrices] = useState({});
  const [priceNotice, setPriceNotice] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    return window.localStorage.getItem("admin-active-tab") || "home";
  });

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

    const label = PRODUCT_LABELS[id] || id;
    setPriceNotice(`Noul preț de listă pentru ${label} a fost setat.`);
  };

  // === BIDS DIN SUPABASE ===
  const [bids, setBids] = useState([]);
  const [farmers, setFarmers] = useState([]); // listă unică de fermieri
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filtre listă principală
  const [listFarmerFilter, setListFarmerFilter] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterParity, setFilterParity] = useState("all");
  const [filterDeliveryFrom, setFilterDeliveryFrom] = useState("");
  const [filterDeliveryTo, setFilterDeliveryTo] = useState("");
  const [filterDeliveryLocation, setFilterDeliveryLocation] = useState("all");
  const [filterLoadingLocation, setFilterLoadingLocation] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [showStats, setShowStats] = useState(false);

  const [selectedBid, setSelectedBid] = useState(null);
  const [adminSelectedBid, setAdminSelectedBid] = useState(null);
  const [adminModalCounter, setAdminModalCounter] = useState("");
  const [adminModalFreight, setAdminModalFreight] = useState("");
  const [adminModalDelivery, setAdminModalDelivery] = useState("");
  const [adminModalOriginal, setAdminModalOriginal] = useState({
    counter: "",
    freight: "",
    delivery: "",
  });
  const [adminConfirmAction, setAdminConfirmAction] = useState(null);
  const [deliveryLocations, setDeliveryLocations] = useState([]);

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

  useEffect(() => {
    const loadDeliveryLocations = async () => {
      const { data, error: loadError } = await supabase
        .from("silo_price_configs")
        .select("silo_name")
        .order("silo_name", { ascending: true });

      if (loadError) {
        return;
      }

      const map = new Map();
      (data || []).forEach((row) => {
        if (row?.silo_name) {
          map.set(row.silo_name, true);
        }
      });
      setDeliveryLocations(["Port Constanța", ...Array.from(map.keys())]);
    };

    loadDeliveryLocations();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("admin-active-tab", activeTab);
  }, [activeTab]);

  const hasFreightDetails = (bid, freightValue, deliveryValue) => {
    if (!isFreightParity(bid?.parity)) return true;
    const freightRaw =
      freightValue != null && String(freightValue).trim() !== ""
        ? freightValue
        : bid?.freight_cost;
    const deliveryRaw =
      deliveryValue != null && String(deliveryValue).trim() !== ""
        ? deliveryValue
        : bid?.delivery_location;
    const freightNum = Number(freightRaw);
    const hasFreight =
      freightRaw != null &&
      String(freightRaw).trim() !== "" &&
      Number.isFinite(freightNum) &&
      freightNum > 0;
    const hasDelivery = String(deliveryRaw || "").trim() !== "";
    return hasFreight && hasDelivery;
  };

  const getMissingFreightMessage = (bid, freightValue, deliveryValue) => {
    if (!isFreightParity(bid?.parity)) return null;
    const freightRaw =
      freightValue != null && String(freightValue).trim() !== ""
        ? freightValue
        : bid?.freight_cost;
    const deliveryRaw =
      deliveryValue != null && String(deliveryValue).trim() !== ""
        ? deliveryValue
        : bid?.delivery_location;
    const freightNum = Number(freightRaw);
    const hasFreight =
      freightRaw != null &&
      String(freightRaw).trim() !== "" &&
      Number.isFinite(freightNum) &&
      freightNum > 0;
    const hasDelivery = String(deliveryRaw || "").trim() !== "";

    if (!hasFreight && !hasDelivery) {
      return "Bid-ul nu a fost transmis. Vă rugăm completați tariful transport și locația de descărcare.";
    }
    if (!hasFreight) {
      return "Bid-ul nu a fost transmis. Vă rugăm completați tariful transport.";
    }
    if (!hasDelivery) {
      return "Bid-ul nu a fost transmis. Vă rugăm completați locația de descărcare.";
    }
    return null;
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

  const submitAdminDecision = async (action, targetBid = null) => {
    const bid = targetBid ?? adminSelectedBid;
    if (!bid) return;
    const useModal = !targetBid;
    const freightValue = useModal ? adminModalFreight : bid.freight_cost;
    const deliveryValue = useModal ? adminModalDelivery : bid.delivery_location;
    const counterValue = useModal ? adminModalCounter : bid.counter_price;

    if (isFreightParity(bid.parity)) {
      const missingMessage = getMissingFreightMessage(
        bid,
        freightValue,
        deliveryValue
      );
      if (missingMessage) {
        alert(missingMessage);
        return;
      }
    }

    const payload = { status: action };
    if (action === "countered") {
      const counterNum = parseOptionalNumber(counterValue);
      if (!Number.isFinite(counterNum) || counterNum <= 0) {
        alert("Introdu un preț de counter valid.");
        return;
      }
      payload.counter_price = counterNum;
      if (isFreightParity(bid.parity)) {
        const freightNum = parseOptionalNumber(freightValue);
        if (!Number.isFinite(freightNum) || freightNum <= 0) {
          alert("Introdu un tarif de transport valid.");
          return;
        }
        payload.freight_cost = freightNum;
        payload.delivery_location = normalizeOptionalText(deliveryValue);
      }
    }

    const { error } = await supabase
      .from("bids")
      .update(payload)
      .eq("id", bid.id);

    if (error) {
      alert("Eroare la trimiterea actualizării: " + error.message);
      return;
    }

    if (useModal) {
      setAdminSelectedBid(null);
      setAdminConfirmAction(null);
      setAdminModalCounter("");
      setAdminModalFreight("");
      setAdminModalDelivery("");
    }
    await loadBids();
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

  const getAcceptedPrice = (bid) => {
    if (!bid) return null;
    const raw =
      bid.final_price != null
        ? bid.final_price
        : bid.counter_price != null
        ? bid.counter_price
        : bid.price;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const isFreightParity = (parity) => {
    const p = String(parity || "").toUpperCase();
    return p === "FCA" || p === "FOB" || p === "FOR";
  };

  const formatParityDisplay = (bid, { detailed = false } = {}) => {
    if (!bid?.parity) return "-";
    const parity = String(bid.parity).toUpperCase();
    const delivery = bid.delivery_location || "-";
    const loading = bid.loading_location || "-";
    if (parity === "FCA" || parity === "FOB" || parity === "FOR") {
      return detailed
        ? `${parity} ${loading} cu descarcare la ${delivery}`
        : `${parity} ${loading} catre ${delivery}`;
    }
    return `${parity} ${delivery}`;
  };

  const getStatusLabel = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "accepted") return "Acceptat";
    if (value === "rejected") return "Respins";
    if (value === "countered") return "Contra-ofertă";
    return "În așteptare";
  };

  // filtre pentru „Toate bid-urile”
  const filteredBids = bids.filter((b) => {
    if (listFarmerFilter !== "all" && b.farmer_id !== listFarmerFilter) return false;
    if (filterProduct !== "all" && b.product !== filterProduct) return false;
    if (filterStatus !== "all") {
      if (filterStatus === "pending") {
        if (b.status !== "pending" && b.status !== "countered") return false;
      } else if (b.status !== filterStatus) {
        return false;
      }
    }
    if (filterParity !== "all" && b.parity !== filterParity) return false;
    if (
      filterDeliveryLocation !== "all" &&
      (b.delivery_location || "-") !== filterDeliveryLocation
    )
      return false;
    if (
      filterLoadingLocation !== "all" &&
      (b.loading_location || "-") !== filterLoadingLocation
    )
      return false;
    if (filterDeliveryFrom || filterDeliveryTo) {
      const start = b.delivery_start ? b.delivery_start.slice(0, 10) : null;
      const end = b.delivery_end ? b.delivery_end.slice(0, 10) : null;
      if (!start || !end) return false;
      if (filterDeliveryFrom && start < filterDeliveryFrom) return false;
      if (filterDeliveryTo && end > filterDeliveryTo) return false;
    }
    return true;
  });

  // statistici pe produs (după filtrele curente)
  const statsRows = (() => {
    const map = new Map();
    filteredBids.forEach((b) => {
      const product = b.product || "unknown";
      const qty = Number(b.quantity || 0);
      let price = 0;
      if (b.status === "accepted") {
        price = Number(getAcceptedPrice(b) || 0);
      } else {
        price = Number(b.counter_price ?? b.price ?? 0);
      }
      if (!map.has(product)) {
        map.set(product, { product, totalQty: 0, totalValue: 0 });
      }
      const current = map.get(product);
      current.totalQty += qty;
      current.totalValue += qty * price;
    });
    return Array.from(map.values()).map((row) => ({
      ...row,
      avgPrice: row.totalQty ? row.totalValue / row.totalQty : 0,
    }));
  })();

  const statsTotalQty = statsRows.reduce(
    (sum, row) => sum + Number(row.totalQty || 0),
    0
  );

  const deliveryLocationOptions = Array.from(
    new Set(
      (bids || [])
        .map((b) => b.delivery_location || "-")
        .filter((loc) => loc && loc.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b));

  const loadingLocationOptions = Array.from(
    new Set(
      (bids || [])
        .map((b) => b.loading_location || "-")
        .filter((loc) => loc && loc.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b));


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
        <div
          className={
            "tab-pane admin-home-pane" + (activeTab === "home" ? " active" : "")
          }
        >
          <div className="card admin-card dashboard-card">
            {/* Optional: Market overview sus (arata bine pe admin) */}
            <MarketTicker />

            <div className="section-divider" />
            <ExchangeRatesCard />

            <div className="section-divider exchange-divider" />

            {/* Setare prețuri */}
            <div className="card-header admin-price-header">
              <h2 className="market-title">Setare prețuri zilnice</h2>
              <p className="market-subtitle">
                Introdu și confirmă prețurile interne. Fermierii vor vedea automat noile valori.
              </p>
              {priceNotice && <p className="admin-price-notice">{priceNotice}</p>}
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

            <div className="section-divider" />
            <SiloPriceTable commodities={commodities} />
          </div>
        </div>

        <div className={activeTab === "bids" ? "tab-pane active" : "tab-pane"}>
          <div className="card admin-card dashboard-card">
            {/* Filtre + Toate bid-urile */}
            <div className="card-header admin-bids-header">
              <h2 className="market-title">Toate bid-urile</h2>
              <div className="admin-bids-actions">
                <button
                  type="button"
                  className="btn small outline filter-btn"
                  onClick={() => setFiltersOpen(true)}
                >
                  Filtre
                </button>
                <button
                  type="button"
                  className="btn small outline filter-btn"
                  onClick={() => setShowStats((prev) => !prev)}
                >
                  Statistici
                </button>
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
                            <td>{PRODUCT_LABELS[row.product] || row.product}</td>
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

            {loading && <p className="small-text" style={{ marginTop: 12 }}>Se încarcă...</p>}
            {error && <p className="badge rejected" style={{ marginTop: 12 }}>{error}</p>}

            {!loading && !error && (
              <div className="admin-bid-list" style={{ marginTop: 14 }}>
                {filteredBids.map((b) => {
                  const unit = b.product === "sunflower" ? "USD/t" : "EUR/t";
                  const statusClass =
                    b.status === "accepted"
                      ? "is-accepted"
                      : b.status === "rejected"
                      ? "is-rejected"
                      : b.status === "countered"
                      ? "is-countered"
                      : "is-pending";
                  const acceptedPrice = getAcceptedPrice(b);
                  const showAccepted = b.status === "accepted" && acceptedPrice != null;
                  const showRejected = b.status === "rejected" && acceptedPrice != null;
                  const showCounter =
                    !showAccepted && !showRejected && b.counter_price != null;
                  const showPending = !showCounter && !showAccepted && !showRejected;
                  const counterNum = Number(b.counter_price);
                  const priceNum = Number(b.price);
                  const hasCounterPrice =
                    b.counter_price != null &&
                    Number.isFinite(counterNum) &&
                    counterNum > 0;
                  const isCounterSameAsPrice =
                    hasCounterPrice &&
                    Number.isFinite(priceNum) &&
                    counterNum === priceNum;
                  const acceptDisabled = hasCounterPrice && !isCounterSameAsPrice;

                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      className={"bid-row admin-bid-row " + statusClass}
                      key={b.id}
                      onClick={() => {
                        setAdminSelectedBid(b);
                        const counterValue =
                          Number(b.counter_price || 0) > 0 ? String(b.counter_price) : "";
                        const freightValue =
                          Number(b.freight_cost || 0) > 0 ? String(b.freight_cost) : "";
                        const deliveryValue = b.delivery_location ?? "";
                        setAdminModalCounter(counterValue);
                        setAdminModalFreight(freightValue);
                        setAdminModalDelivery(deliveryValue);
                        setAdminModalOriginal({
                          counter: counterValue,
                          freight: freightValue,
                          delivery: deliveryValue,
                        });
                        setAdminConfirmAction(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          const counterValue =
                            Number(b.counter_price || 0) > 0
                              ? String(b.counter_price)
                              : "";
                          const freightValue =
                            Number(b.freight_cost || 0) > 0
                              ? String(b.freight_cost)
                              : "";
                          const deliveryValue = b.delivery_location ?? "";
                          setAdminSelectedBid(b);
                          setAdminModalCounter(counterValue);
                          setAdminModalFreight(freightValue);
                          setAdminModalDelivery(deliveryValue);
                          setAdminModalOriginal({
                            counter: counterValue,
                            freight: freightValue,
                            delivery: deliveryValue,
                          });
                          setAdminConfirmAction(null);
                        }
                      }}
                    >
                      <div className="admin-bid-row-left">
                        <div className="admin-bid-crop">
                          {PRODUCT_LABELS[b.product] || b.product}
                        </div>
                        <span className={`status-badge status-${statusClass.slice(3)}`}>
                          {getStatusLabel(b.status)}
                        </span>
                      </div>
                      <div className="admin-bid-row-middle">
                        <div className="admin-bid-details-grid">
                          <div className="admin-bid-field">
                            <span className="bid-label">Fermier</span>
                            <span className="bid-value">
                              {b.farmer_email || b.farmer_id}
                            </span>
                          </div>
                          <div className="admin-bid-field">
                            <span className="bid-label">Cantitate</span>
                            <span className="bid-value">
                              {Number(b.quantity || 0).toFixed(2)} t
                            </span>
                          </div>
                          <div className="admin-bid-field">
                            <span className="bid-label">Preț</span>
                            <span className="admin-bid-price">
                              {showCounter ? (
                                <span className="admin-bid-counter-value">
                                  {Number(b.counter_price || 0).toFixed(2)} {unit}
                                </span>
                              ) : showAccepted ? (
                                `${acceptedPrice.toFixed(2)} ${unit}`
                              ) : showRejected ? (
                                `${acceptedPrice.toFixed(2)} ${unit}`
                              ) : showPending ? (
                                `${Number(b.price || 0).toFixed(2)} ${unit}`
                              ) : (
                                "-"
                              )}
                            </span>
                          </div>
                          <div className="admin-bid-field">
                            <span className="bid-label">Data</span>
                            <span className="bid-value">
                              {formatDateOnly(b.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="admin-bid-row-actions">
                        <button
                          type="button"
                          className="btn small ghost admin-reject-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            submitAdminDecision("rejected", b);
                          }}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="btn small ghost admin-counter-btn"
                          disabled={!hasCounterPrice}
                          onClick={(event) => {
                            event.stopPropagation();
                            submitAdminDecision("countered", b);
                          }}
                        >
                          Counter
                        </button>
                        <button
                          type="button"
                          className="btn small ghost admin-accept-btn"
                          disabled={acceptDisabled}
                          onClick={(event) => {
                            event.stopPropagation();
                            submitAdminDecision("accepted", b);
                          }}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredBids.length === 0 && (
                  <p className="small-text" style={{ padding: 12 }}>
                    Nu există bid-uri pentru filtrele selectate.
                  </p>
                )}
              </div>
            )}

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
                {selectedBid.status === "accepted" &&
                getAcceptedPrice(selectedBid) != null ? (
                  <>
                    {Number(getAcceptedPrice(selectedBid)).toFixed(2)}{" "}
                    {selectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
                  </>
                ) : (
                  "-"
                )}
              </div>
              <div>
                <b>Status:</b> {selectedBid.status}
              </div>
              {selectedBid.status === "accepted" && selectedBid.contract_no && (
                <div>
                  <b>Contract:</b> {selectedBid.contract_no}
                </div>
              )}
              <div>
                <b>Livrare:</b>{" "}
                {formatDeliveryRange(
                  selectedBid.delivery_start,
                  selectedBid.delivery_end
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {adminSelectedBid && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setAdminSelectedBid(null)}
        >
          <div
            className="bid-modal"
            onClick={(event) => {
              event.stopPropagation();
              setAdminConfirmAction(null);
            }}
          >
            <div className="bid-modal-header">
              <h3>Detalii bid</h3>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => setAdminSelectedBid(null)}
              >
                Închide
              </button>
            </div>
            <div className="bid-modal-body">
              <div><b>Data:</b> {formatDateTime(adminSelectedBid.created_at)}</div>
              <div><b>Fermier:</b> {adminSelectedBid.farmer_email || adminSelectedBid.farmer_id}</div>
              <div>
                <b>Produs:</b>{" "}
                {PRODUCT_LABELS[adminSelectedBid.product] || adminSelectedBid.product}
              </div>
              <div><b>Cantitate:</b> {Number(adminSelectedBid.quantity || 0).toFixed(2)} t</div>
              <div>
                <b>Preț:</b>{" "}
                {adminSelectedBid.status === "accepted" &&
                getAcceptedPrice(adminSelectedBid) != null ? (
                  <>
                    {Number(getAcceptedPrice(adminSelectedBid)).toFixed(2)}{" "}
                    {adminSelectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
                  </>
                ) : adminSelectedBid.counter_price != null ? (
                  <>
                    {Number(adminSelectedBid.counter_price).toFixed(2)}{" "}
                    {adminSelectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
                  </>
                ) : (
                  <>
                    {Number(adminSelectedBid.price || 0).toFixed(2)}{" "}
                    {adminSelectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
                  </>
                )}
              </div>
              <div>
                <b>Counter:</b>{" "}
                <input
                  className="input inline-input"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="-"
                  value={adminModalCounter}
                  onChange={(e) => setAdminModalCounter(e.target.value)}
                />
              </div>
              {isFreightParity(adminSelectedBid.parity) && (
                <div>
                  <b>Transport:</b>{" "}
                  <input
                    className="input inline-input"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="-"
                    value={adminModalFreight}
                    onChange={(e) => setAdminModalFreight(e.target.value)}
                  />{" "}
                  {adminSelectedBid.product === "sunflower" ? "USD/t" : "EUR/t"}
                </div>
              )}
              <div>
                <b>Paritate:</b>{" "}
                {isFreightParity(adminSelectedBid.parity) ? (
                  <>
                    {String(adminSelectedBid.parity || "").toUpperCase()}{" "}
                    {adminSelectedBid.loading_location || "-"} cu descarcare la{" "}
                    <select
                      className="input inline-select"
                      value={adminModalDelivery}
                      onChange={(e) => setAdminModalDelivery(e.target.value)}
                    >
                      <option value="">Locație descărcare</option>
                      {adminModalDelivery &&
                        !deliveryLocations.includes(adminModalDelivery) && (
                          <option value={adminModalDelivery}>
                            {adminModalDelivery}
                          </option>
                        )}
                      {deliveryLocations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  formatParityDisplay(adminSelectedBid, { detailed: true })
                )}
              </div>
              <div>
                <b>Livrare:</b>{" "}
                {formatDeliveryRange(
                  adminSelectedBid.delivery_start,
                  adminSelectedBid.delivery_end
                )}
              </div>
              <div><b>Status:</b> {adminSelectedBid.status}</div>
              {adminSelectedBid.status === "accepted" && adminSelectedBid.contract_no && (
                <div><b>Contract:</b> {adminSelectedBid.contract_no}</div>
              )}
            </div>
            <div className="modal-actions">
              {(() => {
                const currentCounter = parseOptionalNumber(adminModalCounter);
                const originalCounter = parseOptionalNumber(adminModalOriginal.counter);
                const currentFreight = parseOptionalNumber(adminModalFreight);
                const originalFreight = parseOptionalNumber(adminModalOriginal.freight);
                const currentDelivery = normalizeOptionalText(adminModalDelivery);
                const originalDelivery = normalizeOptionalText(adminModalOriginal.delivery);
                const counterInvalid =
                  currentCounter != null && !Number.isFinite(currentCounter);
                const freightInvalid =
                  isFreightParity(adminSelectedBid.parity) &&
                  currentFreight != null &&
                  !Number.isFinite(currentFreight);
                const counterChanged =
                  counterInvalid ||
                  (currentCounter == null && originalCounter != null) ||
                  (currentCounter != null && originalCounter == null) ||
                  (Number.isFinite(currentCounter) &&
                    Number.isFinite(originalCounter) &&
                    currentCounter !== originalCounter);
                const freightChanged =
                  isFreightParity(adminSelectedBid.parity) &&
                  (freightInvalid ||
                    (currentFreight == null && originalFreight != null) ||
                    (currentFreight != null && originalFreight == null) ||
                    (Number.isFinite(currentFreight) &&
                      Number.isFinite(originalFreight) &&
                      currentFreight !== originalFreight));
                const deliveryChanged =
                  isFreightParity(adminSelectedBid.parity) &&
                  currentDelivery !== originalDelivery;
                const hasChanges = counterChanged || freightChanged || deliveryChanged;
                return (
                  <>
                    <button
                      type="button"
                      className="btn small ghost admin-reject-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (adminConfirmAction !== "rejected") {
                          setAdminConfirmAction("rejected");
                          return;
                        }
                        submitAdminDecision("rejected");
                      }}
                    >
                      {adminConfirmAction === "rejected" ? "Sigur?" : "Respinge"}
                    </button>
                    <button
                      type="button"
                      className="btn small ghost admin-counter-btn"
                      disabled={!hasChanges || counterInvalid || freightInvalid}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (adminConfirmAction !== "countered") {
                          setAdminConfirmAction("countered");
                          return;
                        }
                        submitAdminDecision("countered");
                      }}
                    >
                      {adminConfirmAction === "countered" ? "Sigur?" : "Contra-ofertă"}
                    </button>
                    <button
                      type="button"
                      className="btn small ghost admin-accept-btn"
                      disabled={hasChanges}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (adminConfirmAction !== "accepted") {
                          setAdminConfirmAction("accepted");
                          return;
                        }
                        submitAdminDecision("accepted");
                      }}
                    >
                      {adminConfirmAction === "accepted" ? "Sigur?" : "Acceptă"}
                    </button>
                  </>
                );
              })()}
            </div>
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
              <h3>Filtre</h3>
              <button
                type="button"
                className="btn small outline filter-btn"
                onClick={() => setFiltersOpen(false)}
              >
                Închide
              </button>
            </div>
            <div className="bid-modal-body">
              <div className="filter-group">
                <label className="label">Fermier</label>
                <select
                  className="input"
                  value={listFarmerFilter}
                  onChange={(e) => {
                    setListFarmerFilter(e.target.value);
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

              <div className="filter-group">
                <label className="label">Produs</label>
                <select
                  className="input"
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                >
                  <option value="all">Toate</option>
                  {Object.keys(PRODUCT_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {PRODUCT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Status bid</label>
                <select
                  className="input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Toate</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Paritate</label>
                <select
                  className="input"
                  value={filterParity}
                  onChange={(e) => setFilterParity(e.target.value)}
                >
                  <option value="all">Toate</option>
                  {["CPT", "DAP", "FCA", "FOR", "FOB", "CIF"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Locație descărcare</label>
                <select
                  className="input"
                  value={filterDeliveryLocation}
                  onChange={(e) => setFilterDeliveryLocation(e.target.value)}
                >
                  <option value="all">Toate</option>
                  {deliveryLocationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Locație încărcare</label>
                <select
                  className="input"
                  value={filterLoadingLocation}
                  onChange={(e) => setFilterLoadingLocation(e.target.value)}
                >
                  <option value="all">Toate</option>
                  {loadingLocationOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="label">Livrare (de la)</label>
                <input
                  className="input"
                  type="date"
                  value={filterDeliveryFrom}
                  onChange={(e) => setFilterDeliveryFrom(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label className="label">Livrare (până la)</label>
                <input
                  className="input"
                  type="date"
                  value={filterDeliveryTo}
                  onChange={(e) => setFilterDeliveryTo(e.target.value)}
                />
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="btn small outline filter-btn"
                  onClick={() => setFiltersOpen(false)}
                >
                  Ok
                </button>
                <button
                  type="button"
                  className="btn small outline filter-btn"
                  onClick={() => {
                    setListFarmerFilter("all");
                    setFilterProduct("all");
                    setFilterStatus("all");
                    setFilterParity("all");
                    setFilterDeliveryFrom("");
                    setFilterDeliveryTo("");
                    setFilterDeliveryLocation("all");
                    setFilterLoadingLocation("all");
                  }}
                >
                  Resetează
                </button>
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
