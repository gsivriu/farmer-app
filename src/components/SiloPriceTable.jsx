import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { getProductLabelSafe } from "../utils/productLabels";

const SILO_PRICE_TABLE = "silo_price_configs";

const PRODUCT_ID_ALIASES = {
  wheat: "wheat",
  grau: "wheat",
  barley: "barley",
  orz: "barley",
  corn: "corn",
  porumb: "corn",
  rapeseed: "rapeseed",
  rapita: "rapeseed",
  sunflower: "sunflower",
  "floarea soarelui": "sunflower",
  sfs: "sunflower",
};

const normalizeProductType = (value) => {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return PRODUCT_ID_ALIASES[key] || key;
};

export default function SiloPriceTable({ commodities = [], readOnly = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [overrideValue, setOverrideValue] = useState("");

  useEffect(() => {
    const loadRows = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from(SILO_PRICE_TABLE)
        .select("id,silo_name,product_type,offset_value,currency,manual_price")
        .order("silo_name", { ascending: true });

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(data || []);
      }

      setLoading(false);
    };

    loadRows();
  }, []);

  const productList = useMemo(() => {
    return (commodities || []).map((c) => ({
      id: c.id,
      name: c.name,
      price: Number(c.price || 0),
      currency: c.id === "sunflower" ? "USD" : "EUR",
    }));
  }, [commodities]);

  const silos = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const name = row?.silo_name;
      if (name) {
        map.set(name, true);
      }
    });
    return Array.from(map.keys());
  }, [rows]);

  const getRow = (siloName, productId) => {
    const match = rows.find(
      (row) =>
        row?.silo_name === siloName &&
        normalizeProductType(row?.product_type) === productId
    );
    return match || null;
  };

  const getCellValue = (siloName, product) => {
    const row = getRow(siloName, product.id);
    const offset = Number(row?.offset_value || 0);
    const basePrice = Number(product.price || 0);
    const computed = Number(basePrice - offset);
    const manualValue =
      row?.manual_price !== null && row?.manual_price !== undefined
        ? Number(row.manual_price)
        : null;
    const isManualOverride =
      manualValue !== null && Number.isFinite(manualValue) &&
      Number.isFinite(computed) && Math.abs(manualValue - computed) > 0.001;
    const finalValue = manualValue !== null ? manualValue : computed;
    const currency = row?.currency || product.currency;

    return {
      row,
      offset,
      computed,
      manualValue,
      isManualOverride,
      currency,
      finalValue,
      display: Number.isFinite(finalValue) ? finalValue.toFixed(2) : "-",
    };
  };

  const openCell = (siloName, product) => {
    if (readOnly) return;
    const cell = getCellValue(siloName, product);
    setSelectedCell({
      siloName,
      product,
      row: cell.row,
      offset: cell.offset,
      computed: cell.computed,
      currency: cell.currency,
    });
    const initial =
      cell.row?.manual_price !== null && cell.row?.manual_price !== undefined
        ? String(cell.row.manual_price)
        : String(cell.computed);
    setOverrideValue(initial);
  };

  const handleSaveOverride = async () => {
    if (!selectedCell) return;

    const value = overrideValue.trim();
    const nextValue = value === "" ? null : Number(value);
    if (nextValue !== null && (!Number.isFinite(nextValue) || nextValue <= 0)) {
      window.alert("Enter a valid price.");
      return;
    }

    const productType =
      selectedCell.row?.product_type || selectedCell.product.id;

    const payload = {
      silo_name: selectedCell.siloName,
      product_type: productType,
      manual_price: nextValue,
      offset_value: selectedCell.offset,
      currency: selectedCell.currency,
    };

    const { error } = selectedCell.row?.id
      ? await supabase
          .from(SILO_PRICE_TABLE)
          .update({ manual_price: nextValue })
          .eq("id", selectedCell.row.id)
      : await supabase
          .from(SILO_PRICE_TABLE)
          .upsert(payload, { onConflict: "silo_name,product_type" });

    if (error) {
      window.alert("Error while saving: " + error.message);
      return;
    }

    setRows((prev) =>
      prev.map((row) => {
        if (
          row.silo_name === selectedCell.siloName &&
          normalizeProductType(row.product_type) === selectedCell.product.id
        ) {
          return { ...row, manual_price: nextValue };
        }
        return row;
      })
    );
    setSelectedCell(null);
  };

  const handleResetOverride = async () => {
    if (!selectedCell) return;

    const productType =
      selectedCell.row?.product_type || selectedCell.product.id;

    const payload = {
      silo_name: selectedCell.siloName,
      product_type: productType,
      manual_price: null,
      offset_value: selectedCell.offset,
      currency: selectedCell.currency,
    };

    const { error } = selectedCell.row?.id
      ? await supabase
          .from(SILO_PRICE_TABLE)
          .update({ manual_price: null })
          .eq("id", selectedCell.row.id)
      : await supabase
          .from(SILO_PRICE_TABLE)
          .upsert(payload, { onConflict: "silo_name,product_type" });

    if (error) {
      window.alert("Error while resetting: " + error.message);
      return;
    }

    setRows((prev) =>
      prev.map((row) => {
        if (
          row.silo_name === selectedCell.siloName &&
          normalizeProductType(row.product_type) === selectedCell.product.id
        ) {
          return { ...row, manual_price: null };
        }
        return row;
      })
    );
    setSelectedCell(null);
  };

  if (loading) {
    return <p className="small-text">Loading silo prices...</p>;
  }

  if (error) {
    return <p className="badge rejected">{error}</p>;
  }

  if (silos.length === 0 || productList.length === 0) {
    return <p className="small-text">No silo price data available.</p>;
  }

  return (
    <div className={"silo-table-wrap" + (selectedCell ? " is-modal-open" : "")}>
      <div className="silo-table-header">
        <h3>Silo prices</h3>
      </div>

      <div className="silo-table-scroll">
        <table className="silo-table">
          <thead>
            <tr>
              <th className="silo-sticky-head">Silo</th>
              {productList.map((product) => (
                <th key={product.id}>
                  {getProductLabelSafe(product.id, product.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {silos.map((silo) => (
              <tr key={silo}>
                <td className="silo-name">{silo}</td>
                {productList.map((product) => {
                  const cell = getCellValue(silo, product);
                  return (
                    <td
                      key={`${silo}-${product.id}`}
                      className={"silo-cell" + (readOnly ? " readonly" : "")}
                      onClick={() => openCell(silo, product)}
                    >
                      <div
                        className={
                          "silo-cell-value" +
                          (cell.isManualOverride ? " silo-cell-value-manual" : "")
                        }
                      >
                        {cell.display} {cell.currency}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell && !readOnly && (
        <div
          className="bid-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedCell(null)}
        >
          <div className="bid-modal" onClick={(event) => event.stopPropagation()}>
            <div className="bid-modal-header">
              <h3>Silo price</h3>
              <button
                type="button"
                className="btn small ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedCell(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="bid-modal-body">
              <div><b>Silo:</b> {selectedCell.siloName}</div>
              <div><b>Product:</b> {getProductLabelSafe(selectedCell.product.id, selectedCell.product.name)}</div>
              <div>
                <b>CPT Constanta price:</b> {selectedCell.product.price.toFixed(2)}{" "}
                {selectedCell.currency}
              </div>
              <div><b>Spread:</b> -{Number(selectedCell.offset || 0).toFixed(2)}</div>
              <div>
                <b>Calculated:</b> {Number(selectedCell.computed || 0).toFixed(2)}{" "}
                {selectedCell.currency}
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="Final price"
                value={overrideValue}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setOverrideValue(event.target.value)}
              />
              <button type="button" className="btn small ghost" onClick={handleSaveOverride}>
                Save
              </button>
              <button
                type="button"
                className="btn small outline"
                onClick={handleResetOverride}
              >
                Reset to automatic calculation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
