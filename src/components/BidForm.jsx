// src/components/BidForm.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { isFreightParity } from "../utils/formatting";

const PRODUCT_OPTIONS = [
  { value: "wheat", label: "Wheat" },
  { value: "barley", label: "Barley" },
  { value: "corn", label: "Corn" },
  { value: "rapeseed", label: "Rapeseed" },
  { value: "sunflower", label: "Sunflower" },
];

const PARITY_OPTIONS = ["CPT", "DAP", "FCA", "FOR", "FOB", "CIF"];
const CURRENCY_OPTIONS = ["EUR", "USD", "RON"];

const currentYear = new Date().getFullYear();
const CROP_YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1];

export default function BidForm({ onBidCreated, embedded = false }) {
  const [product, setProduct] = useState("wheat");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [parity, setParity] = useState("CPT");
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState("Port Constanța");
  const [loadingLocation, setLoadingLocation] = useState("");
  const [deliveryStart, setDeliveryStart] = useState("");
  const [deliveryEnd, setDeliveryEnd] = useState("");
  const [cropYear, setCropYear] = useState(String(currentYear));
  const [quantityTolerance, setQuantityTolerance] = useState("");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLocations = async () => {
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
      setLocations(["Port Constanța", ...Array.from(map.keys())]);
    };

    loadLocations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const qtyNum = Number(quantity);
    const priceNum = Number(price);

    if (!qtyNum || qtyNum <= 0) {
      setLoading(false);
      setError("Enter a valid quantity (> 0).");
      return;
    }

    if (!priceNum || priceNum <= 0) {
      setLoading(false);
      setError("Enter a valid price (> 0).");
      return;
    }

    if (deliveryEnd && deliveryStart && deliveryEnd < deliveryStart) {
      setLoading(false);
      setError("End date cannot be earlier than start date.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setLoading(false);
      setError("You must be logged in to submit a bid.");
      return;
    }

    const user = userData.user;

    const { error: insertError } = await supabase.from("bids").insert({
      farmer_id: user.id,
      farmer_email: user.email,
      product,
      quantity: qtyNum,
      price: priceNum,
      currency,
      parity,
      delivery_location: isFreightParity(parity) ? null : location || "Port Constanța",
      loading_location: isFreightParity(parity) ? loadingLocation || null : null,
      freight_cost: null,
      delivery_start: deliveryStart || null,
      delivery_end: deliveryEnd || null,
      crop_year: cropYear ? Number(cropYear) : null,
      quantity_tolerance: quantityTolerance ? Number(quantityTolerance) : null,
      remarks: remarks.trim() || null,
      status: "pending",
    });

    if (insertError) {
      setLoading(false);
      if (insertError.message?.includes("Rate limit exceeded")) {
        setError("Too many bids submitted. Please wait a minute before trying again.");
      } else {
        setError("Error submitting bid: " + insertError.message);
      }
      return;
    }

    setMessage("Bid submitted successfully. A trader will contact you.");
    setLoading(false);

    // Reset
    setQuantity("");
    setPrice("");
    setCurrency("EUR");
    setParity("CPT");
    setLocation("Port Constanța");
    setLoadingLocation("");
    setDeliveryStart("");
    setDeliveryEnd("");
    setCropYear(String(currentYear));
    setQuantityTolerance("");
    setRemarks("");

    if (onBidCreated) onBidCreated();
  };

  const qtyInvalid = !!error && error.includes("quantity");
  const priceInvalid = !!error && error.includes("price");
  const dateInvalid = !!error && error.includes("date");

  const content = (
    <>
      <h2>Place a bid</h2>

      {message && (
        <p className="bid-form-feedback bid-feedback-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="bid-form-feedback bid-feedback-error" role="alert" id="bid-form-error">
          {error}
        </p>
      )}

      <form className="form" onSubmit={handleSubmit} autoComplete="off" noValidate>
        {/* PRODUCT */}
        <div className="bid-input-container">
          <label className="bid-input-label" htmlFor="bid-product">Product</label>
          <select
            id="bid-product"
            className="bid-input-field"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            {PRODUCT_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* QUANTITY + TOLERANCE */}
        <div className="bid-form-grid-2">
          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-quantity">Quantity (t)</label>
            <input
              id="bid-quantity"
              className="bid-input-field"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              aria-required="true"
              aria-invalid={qtyInvalid || undefined}
              aria-describedby={qtyInvalid ? "bid-form-error" : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ex: 100"
            />
          </div>

          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-tolerance">Tolerance (%)</label>
            <input
              id="bid-tolerance"
              className="bid-input-field"
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              step="1"
              value={quantityTolerance}
              onChange={(e) => setQuantityTolerance(e.target.value)}
              placeholder="ex: 5"
            />
          </div>
        </div>

        {/* PRICE + CURRENCY */}
        <div className="bid-form-grid-2">
          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-price">Price (/t)</label>
            <input
              id="bid-price"
              className="bid-input-field"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              required
              aria-required="true"
              aria-invalid={priceInvalid || undefined}
              aria-describedby={priceInvalid ? "bid-form-error" : undefined}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="ex: 200"
            />
          </div>

          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-currency">Currency</label>
            <select
              id="bid-currency"
              className="bid-input-field"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PARITY + LOCATION */}
        <div className="bid-form-grid-2">
          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-parity">Parity</label>
            <select
              id="bid-parity"
              className="bid-input-field"
              value={parity}
              onChange={(e) => setParity(e.target.value)}
            >
              {PARITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {!isFreightParity(parity) && (
            <div className="bid-input-container">
              <label className="bid-input-label" htmlFor="bid-location">Delivery location</label>
              <select
                id="bid-location"
                className="bid-input-field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {locations.length === 0 && (
                  <option value="Port Constanța">Constanta Port</option>
                )}
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === "Port Constanța" ? "Constanta Port" : loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isFreightParity(parity) && (
          <div className="bid-form-grid-2">
            <div className="bid-input-container">
              <label className="bid-input-label" htmlFor="bid-loading-location">Loading location</label>
              <input
                id="bid-loading-location"
                className="bid-input-field"
                type="text"
                value={loadingLocation}
                onChange={(e) => setLoadingLocation(e.target.value)}
                placeholder="e.g. Farm / Silo"
              />
            </div>
          </div>
        )}

        {/* DELIVERY DATES - NATIVE, MOBILE SAFE */}
        <div className="bid-form-grid-2">
          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-delivery-start">Delivery start</label>
            <input
              id="bid-delivery-start"
              type="date"
              className="bid-input-field"
              value={deliveryStart}
              onChange={(e) => setDeliveryStart(e.target.value)}
            />
          </div>

          <div className="bid-input-container">
            <label className="bid-input-label" htmlFor="bid-delivery-end">Delivery end</label>
            <input
              id="bid-delivery-end"
              type="date"
              className="bid-input-field"
              aria-invalid={dateInvalid || undefined}
              aria-describedby={dateInvalid ? "bid-form-error" : undefined}
              value={deliveryEnd}
              onChange={(e) => setDeliveryEnd(e.target.value)}
            />
          </div>
        </div>

        {/* CROP YEAR */}
        <div className="bid-input-container">
          <label className="bid-input-label" htmlFor="bid-crop-year">Crop year</label>
          <select
            id="bid-crop-year"
            className="bid-input-field"
            value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
          >
            {CROP_YEAR_OPTIONS.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        {/* REMARKS */}
        <div className="bid-input-container">
          <label className="bid-input-label" htmlFor="bid-remarks">Remarks (optional)</label>
          <textarea
            id="bid-remarks"
            className="bid-input-field"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any notes for the trader..."
          />
        </div>

        <button
          className="btn primary-btn full-width bid-submit-btn"
          type="submit"
          disabled={loading}
          aria-disabled={loading}
        >
          {loading ? "Submitting..." : "Submit bid"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div className="bid-form-embedded">{content}</div>;
  }

  return <div className="card bid-form-card">{content}</div>;
}
