import { useMemo, useState } from "react";
import "./StocksPage.css";

const CHIMPEX_REPORT_DATE = "13 Mar 2026";
const CHIMPEX_EXPORT_FILENAME = "chimpex-detailed-stocks-13-mar-2026";

const chimpexDetailedData = [
  { commodity: "BLY 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "RPS 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "WHT LP 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 311.04, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT HP 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 18127.34, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "CORN 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 5475.23, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "SFS 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT EX NIVA 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "RPS EX NIVA 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "RPS 2025 IMPORTED", origin: "MLD", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "RPS 2025 TRANZIT", origin: "MLD", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "BLY 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "RPS 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT LP 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 1005.8, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT HP 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 15028.97, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "SFS 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT 2025 TRANZIT", origin: "MLD", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "CORN 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 7741.81, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT 2025 IMPORTED", origin: "MLD", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT 2025 IMPORTED", origin: "MLD", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
];

const chimpexColumns = [
  { key: "commodity", label: "COMMODITY", align: "left", width: "150px" },
  { key: "origin", label: "ORIGIN", align: "left", width: "80px" },
  { key: "client", label: "CLIENT", align: "left", width: "260px" },
  { key: "silozChimpex", label: "SILOZ CHIMPEX", align: "right", width: "130px" },
  { key: "warehouseChimpex", label: "WAREHOUSE CHIMPEX", align: "right", width: "150px" },
  { key: "bargesThirdParty", label: "BARGES LOADED FROM 3RD PARTY SUPPLIERS", align: "right", width: "210px" },
  { key: "niva", label: "NIVA", align: "right", width: "100px" },
];

const chimpexFooterRows = [
  {
    label: "TOTAL",
    tone: "neutral",
    values: {
      silozChimpex: 47690.19,
      warehouseChimpex: 0,
      bargesThirdParty: null,
      niva: 0,
    },
  },
  {
    label: "WHEAT BASE",
    tone: "wheat",
    values: {
      silozChimpex: 49011.894,
      warehouseChimpex: 0,
      bargesThirdParty: null,
      niva: 0,
    },
  },
  {
    label: "STORAGE SPACES STATUS (% FULL)",
    tone: "success-soft",
    values: {
      silozChimpex: 22.28,
      warehouseChimpex: null,
      bargesThirdParty: null,
      niva: 0,
    },
    isPercent: true,
  },
  {
    label: "STORAGE SPACES STATUS (% FULL) - TOTAL",
    tone: "success-strong",
    mergedValue: "20.86%",
  },
];

const inlandSummaryData = [
  { commodity: "Wheat", stock: 31600 },
  { commodity: "Corn", stock: 22500 },
  { commodity: "Sunflower", stock: 11800 },
  { commodity: "Rapeseed", stock: 21500 },
  { commodity: "Barley", stock: 6400 },
];

export function formatNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) return "—";
  return numericValue.toLocaleString("ro-RO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) return "—";
  return `${numericValue.toFixed(2)}%`;
}

export function displayCell(value) {
  if (value === null || value === undefined || value === "" || value === 0) return "—";
  return value;
}

export function downloadCSV(filename, rows, columns) {
  const header = columns.map((column) => column.label).join(",");
  const content = rows.map((row) =>
    columns
      .map((column) => {
        const rawValue =
          typeof column.exportValue === "function"
            ? column.exportValue(row)
            : row[column.key];
        const value = displayCell(rawValue);
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",")
  );

  const csv = [header, ...content].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StorageIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="4" height="8" rx="0.5" />
      <rect x="8" y="4" width="4" height="8" rx="0.5" />
      <path d="M2 4C2 2.5 6 2.5 6 4" />
      <path d="M8 4C8 2.5 12 2.5 12 4" />
    </svg>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="stocks-page__filter-group">
      <span className="stocks-page__filter-label">{label}</span>
      <select className="stocks-page__filter-select" value={value} onChange={onChange}>
        <option value="All">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function renderTableCell(value, isPercent = false) {
  const content = isPercent ? formatPercent(value) : formatNumber(value);
  const isEmpty = content === "—";

  return (
    <span className={isEmpty ? "stocks-page__cell-empty" : "stocks-page__cell-value"}>
      {content}
    </span>
  );
}

function SummaryCard({ title, reportDate, data, location }) {
  const totalStock = useMemo(
    () => data.reduce((sum, row) => sum + Number(row.stock || 0), 0),
    [data]
  );

  return (
    <article className="mb-card stocks-page__card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <span className="stocks-page__title">
            <StorageIcon />
            {title}
          </span>
          <span className="mb-head-meta">Report date: {reportDate}</span>
        </div>
        <div className="stocks-page__subhead">
          <span className="stocks-page__location">{location}</span>
        </div>
      </div>

      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns: "minmax(0, 1fr) 120px" }}>
          <span className="mb-col-cell">Commodity</span>
          <span className="mb-col-cell stocks-page__align-right">Stock</span>
        </div>
      </div>

      <div className="mb-card-body stocks-page__summary-body">
        {data.map((row) => (
          <div key={`${title}-${row.commodity}`} className="mb-row" style={{ gridTemplateColumns: "minmax(0, 1fr) 120px" }}>
            <span className="mb-row-label">{row.commodity}</span>
            <span className="mb-row-value stocks-page__align-right">{formatNumber(row.stock)}</span>
          </div>
        ))}
      </div>

      <div className="mb-card-foot stocks-page__footer">
        <div className="stocks-page__footer-top">
          <span className="mb-foot-label">Total stock Inland Silos</span>
          <span className="mb-foot-val">{formatNumber(totalStock)} t</span>
        </div>
      </div>
    </article>
  );
}

function ChimpexDetailedCard() {
  const [commodityFilter, setCommodityFilter] = useState("All");
  const [originFilter, setOriginFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");

  const commodityOptions = useMemo(
    () => [...new Set(chimpexDetailedData.map((row) => row.commodity))].sort(),
    []
  );
  const originOptions = useMemo(
    () => [...new Set(chimpexDetailedData.map((row) => row.origin))].sort(),
    []
  );
  const clientOptions = useMemo(
    () => [...new Set(chimpexDetailedData.map((row) => row.client))].sort(),
    []
  );

  const filteredRows = useMemo(
    () =>
      chimpexDetailedData.filter((row) => {
        const matchesCommodity = commodityFilter === "All" || row.commodity === commodityFilter;
        const matchesOrigin = originFilter === "All" || row.origin === originFilter;
        const matchesClient = clientFilter === "All" || row.client === clientFilter;
        return matchesCommodity && matchesOrigin && matchesClient;
      }),
    [clientFilter, commodityFilter, originFilter]
  );

  const handleReset = () => {
    setCommodityFilter("All");
    setOriginFilter("All");
    setClientFilter("All");
  };

  const exportRows = useMemo(
    () =>
      filteredRows.map((row) => ({
        ...row,
        silozChimpex: formatNumber(row.silozChimpex),
        warehouseChimpex: formatNumber(row.warehouseChimpex),
        bargesThirdParty: displayCell(row.bargesThirdParty),
        niva: formatNumber(row.niva),
      })),
    [filteredRows]
  );

  return (
    <article className="mb-card stocks-page__card stocks-page__detailed-card">
      <div className="mb-card-head stocks-page__detailed-head">
        <div className="mb-card-title">
          <span className="stocks-page__title">
            <StorageIcon />
            Chimpex Siloz — Detailed Stocks Report
          </span>
          <div className="stocks-page__header-actions">
            <span className="mb-head-meta">Report date: {CHIMPEX_REPORT_DATE}</span>
            <button
              type="button"
              className="stocks-page__export-button"
              onClick={() => downloadCSV(CHIMPEX_EXPORT_FILENAME, exportRows, chimpexColumns)}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="stocks-page__subhead stocks-page__subhead--tight">
          <span className="stocks-page__location">Operational visibility by commodity, origin, client and storage space.</span>
        </div>
      </div>

      <div className="stocks-page__filters">
        <FilterSelect
          label="Commodity"
          value={commodityFilter}
          options={commodityOptions}
          onChange={(event) => setCommodityFilter(event.target.value)}
        />
        <FilterSelect
          label="Origin"
          value={originFilter}
          options={originOptions}
          onChange={(event) => setOriginFilter(event.target.value)}
        />
        <FilterSelect
          label="Client"
          value={clientFilter}
          options={clientOptions}
          onChange={(event) => setClientFilter(event.target.value)}
        />
        <div className="stocks-page__filter-group stocks-page__filter-group--action">
          <span className="stocks-page__filter-label">Reset</span>
          <button type="button" className="stocks-page__reset-button" onClick={handleReset}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="stocks-table-wrap">
        <table className="stocks-table chimpex-detailed-table">
          <colgroup>
            {chimpexColumns.map((column) => (
              <col key={column.key} style={{ width: column.width, minWidth: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {chimpexColumns.map((column) => (
                <th
                  key={column.key}
                  className={column.align === "right" ? "stocks-table__th stocks-table__th--numeric" : "stocks-table__th"}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, index) => (
                <tr key={`${row.commodity}-${row.origin}-${row.client}-${index}`} className="stocks-table__row">
                  <td className="stocks-table__td stocks-table__td--commodity">{displayCell(row.commodity)}</td>
                  <td className="stocks-table__td">{displayCell(row.origin)}</td>
                  <td className="stocks-table__td">{displayCell(row.client)}</td>
                  <td className="stocks-table__td stocks-table__td--numeric">{renderTableCell(row.silozChimpex)}</td>
                  <td className="stocks-table__td stocks-table__td--numeric">{renderTableCell(row.warehouseChimpex)}</td>
                  <td className="stocks-table__td stocks-table__td--numeric">{renderTableCell(row.bargesThirdParty)}</td>
                  <td className="stocks-table__td stocks-table__td--numeric">{renderTableCell(row.niva)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="stocks-table__empty" colSpan={chimpexColumns.length}>
                  No operational rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            {chimpexFooterRows.map((row) =>
              row.mergedValue ? (
                <tr key={row.label} className={`stocks-table__footer stocks-table__footer--${row.tone}`}>
                  <th className="stocks-table__footer-label" colSpan={3} scope="row">
                    {row.label}
                  </th>
                  <td className="stocks-table__footer-merged" colSpan={4}>
                    {row.mergedValue}
                  </td>
                </tr>
              ) : (
                <tr key={row.label} className={`stocks-table__footer stocks-table__footer--${row.tone}`}>
                  <th className="stocks-table__footer-label" colSpan={3} scope="row">
                    {row.label}
                  </th>
                  <td className="stocks-table__footer-value">{renderTableCell(row.values.silozChimpex, row.isPercent)}</td>
                  <td className="stocks-table__footer-value">{renderTableCell(row.values.warehouseChimpex, row.isPercent)}</td>
                  <td className="stocks-table__footer-value">{renderTableCell(row.values.bargesThirdParty, row.isPercent)}</td>
                  <td className="stocks-table__footer-value">{renderTableCell(row.values.niva, row.isPercent)}</td>
                </tr>
              )
            )}
          </tfoot>
        </table>
      </div>
    </article>
  );
}

export default function StocksPage() {
  return (
    <section className="stocks-page">
      <div className="stocks-page__toolbar">
        <div>
          <h2 className="stocks-page__heading">Stocks</h2>
          <p className="stocks-page__caption">Expanded operational reporting view for Motherboard stock positions.</p>
        </div>
      </div>

      <div className="stocks-page__stack">
        <ChimpexDetailedCard />
        <SummaryCard
          title="Inland Silos — Summary by Commodity"
          reportDate={CHIMPEX_REPORT_DATE}
          location="Multiple locations"
          data={inlandSummaryData}
        />
      </div>
    </section>
  );
}
