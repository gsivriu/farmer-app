import { Fragment, useMemo, useState } from "react";
import "./StocksPage.css";

const CHIMPEX_REPORT_DATE = "13 Mar 2026";
const INLAND_REPORT_DATE = "13 Mar 2026";
const INLAND_EXPORT_FILENAME = "inland-detailed-stocks-13-mar-2026";
const CHIMPEX_COMMODITY_FILTERS = ["Wheat", "Barley", "Rapeseed", "SFS", "Corn"];

const chimpexDetailedData = [
  { commodity: "BLY 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "RPS 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "WHT LP 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 311.04, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT HP 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 18127.34, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "CORN 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 5475.23, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "SFS 2025", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "RPS 2025 IMPORTED", origin: "MLD", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "BLY 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: 0 },
  { commodity: "RPS 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT LP 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 1005.8, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT HP 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 15028.97, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "SFS 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT 2025 TRANZIT", origin: "MLD", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "CORN 2025", origin: "RO", client: "AMS AMEROPA MARKETING AND SALES AG", silozChimpex: 7741.81, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
  { commodity: "WHT", origin: "RO", client: "AMEROPA GRAINS SA", silozChimpex: 0, warehouseChimpex: 0, bargesThirdParty: null, niva: null },
];

const chimpexColumns = [
  { key: "commodity", label: "COMMODITY", align: "left", width: "18%" },
  { key: "origin", label: "ORIGIN", align: "left", width: "9%" },
  { key: "client", label: "CLIENT", align: "left", width: "31%" },
  { key: "silozChimpex", label: "SILOZ CHIMPEX", align: "right", width: "14%" },
  { key: "warehouseChimpex", label: "WAREHOUSE CHIMPEX", align: "right", width: "16%" },
  { key: "niva", label: "NIVA", align: "right", width: "12%" },
];

const chimpexFooterRows = [
  {
    label: "TOTAL",
    tone: "neutral",
    values: {
      silozChimpex: 47690.19,
      warehouseChimpex: 0,
      niva: 0,
    },
  },
  {
    label: "STORAGE SPACES STATUS (% FULL)",
    tone: "success-strong",
    values: {
      silozChimpex: 22.28,
      warehouseChimpex: null,
      niva: 0,
    },
    isPercent: true,
  },
];

const inlandDetailedData = [
  { group: "Constanta Area", filiala: "Casicea", um: "To", totalCrop2025: 14447.58, stocCustodie: 0, stocProprietate: 0, spatiuTehnicUtil: 14400, spatiuDisponibil: 14400, stocRec2024: 0 },
  { group: "Constanta Area", filiala: "Ciocarlia", um: "To", totalCrop2025: 25268.32, stocCustodie: 0, stocProprietate: 1441.31, spatiuTehnicUtil: 22692, spatiuDisponibil: 21250.69, stocRec2024: 0 },
  { group: "Constanta Area", filiala: "Negru-Voda", um: "To", totalCrop2025: 24897.68, stocCustodie: 0, stocProprietate: 156.23, spatiuTehnicUtil: 30500, spatiuDisponibil: 30343.77, stocRec2024: 0 },
  { group: "Constanta Area", filiala: "Nicolae Balcescu", um: "To", totalCrop2025: 12954.14, stocCustodie: 229.24, stocProprietate: 2616.06, spatiuTehnicUtil: 46320, spatiuDisponibil: 45182.52, stocRec2024: 577.08 },
  { group: "Territory", filiala: "Carpinis", um: "To", totalCrop2025: 46723.26, stocCustodie: 0, stocProprietate: 0, spatiuTehnicUtil: 52200, spatiuDisponibil: 52200, stocRec2024: 0 },
  { group: "Territory", filiala: "Dor Marunt", um: "To", totalCrop2025: 36580.72, stocCustodie: 0, stocProprietate: 0, spatiuTehnicUtil: 11000, spatiuDisponibil: 11000, stocRec2024: 0 },
  { group: "Territory", filiala: "Plosca", um: "To", totalCrop2025: 63745.98, stocCustodie: 0, stocProprietate: 3039.73, spatiuTehnicUtil: 13000, spatiuDisponibil: 9960.27, stocRec2024: 0 },
  { group: "Territory", filiala: "Harsova", um: "To", totalCrop2025: 31947.94, stocCustodie: 1239.08, stocProprietate: 12.09, spatiuTehnicUtil: 29000, spatiuDisponibil: 27742.19, stocRec2024: 1.2 },
  { group: "Territory", filiala: "Macin", um: "To", totalCrop2025: 15049.12, stocCustodie: 0, stocProprietate: 744.71, spatiuTehnicUtil: 11000, spatiuDisponibil: 10255.29, stocRec2024: 0 },
  { group: "Territory", filiala: "Vladeni", um: "To", totalCrop2025: 39109.7, stocCustodie: 0, stocProprietate: 5717.99, spatiuTehnicUtil: 14000, spatiuDisponibil: 8271.53, stocRec2024: 10.48 },
  { group: "Territory", filiala: "Ciresu", um: "To", totalCrop2025: 56919.9, stocCustodie: 0, stocProprietate: 1.12, spatiuTehnicUtil: 10000, spatiuDisponibil: 9997.76, stocRec2024: 0 },
  { group: "Territory", filiala: "Adancata", um: "To", totalCrop2025: 35964.26, stocCustodie: 0, stocProprietate: 1171.65, spatiuTehnicUtil: 22000, spatiuDisponibil: 20828.35, stocRec2024: 0 },
  { group: "Territory", filiala: "Farcasele", um: "To", totalCrop2025: 57354.64, stocCustodie: 0, stocProprietate: 4555.35, spatiuTehnicUtil: 13500, spatiuDisponibil: 8944.65, stocRec2024: 0 },
  { group: "Territory", filiala: "Sarulesti", um: "To", totalCrop2025: 70969.5, stocCustodie: 0, stocProprietate: 5607.48, spatiuTehnicUtil: 50750, spatiuDisponibil: 45138.78, stocRec2024: 8.68 },
  { group: "Territory", filiala: "Mirosi", um: "To", totalCrop2025: 55213.44, stocCustodie: 0, stocProprietate: 3380.91, spatiuTehnicUtil: 28500, spatiuDisponibil: 24889.71, stocRec2024: 40.02 },
];

const inlandColumns = [
  { key: "filiala", label: "FILIALA", align: "left", width: "180px" },
  { key: "um", label: "U/M", align: "center", width: "60px" },
  { key: "totalCrop2025", label: "TOTAL RECEPTIONAT CROP 2025", align: "right", width: "170px" },
  { key: "stocCustodie", label: "STOC CUSTODIE", align: "right", width: "140px" },
  { key: "stocProprietate", label: "STOC PROPRIETATE", align: "right", width: "150px" },
  { key: "spatiuTehnicUtil", label: "SPATIU TEHNIC UTIL", align: "right", width: "160px" },
  { key: "spatiuDisponibil", label: "SPATIU DISPONIBIL", align: "right", width: "160px" },
  { key: "stocRec2024", label: "STOC REC.2024", align: "right", width: "140px" },
];

const inlandTotalsReference = {
  "Constanta Area": {
    label: "TOTAL CONSTANTA",
    um: "To",
    totalCrop2025: 77567.72,
    stocCustodie: 229.23,
    stocProprietate: 4213.61,
    spatiuTehnicUtil: 113912,
    spatiuDisponibil: 111176.98,
    stocRec2024: 577.08,
  },
  Territory: {
    label: "TOTAL TERITORIU",
    um: "To",
    totalCrop2025: 509578.46,
    stocCustodie: 1239.08,
    stocProprietate: 24231.04,
    spatiuTehnicUtil: 254950,
    spatiuDisponibil: 229228.53,
    stocRec2024: 60.38,
  },
  general: {
    label: "TOTAL GENERAL",
    um: "To",
    totalCrop2025: 587146.18,
    stocCustodie: 1468.31,
    stocProprietate: 28444.65,
    spatiuTehnicUtil: 368862,
    spatiuDisponibil: 340405.5,
    stocRec2024: 637.46,
  },
};

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

function formatAccountingNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function downloadCSV(filename, rows, columns) {
  const header = columns.map((column) => column.label).join(",");
  const content = rows.map((row) =>
    columns
      .map((column) => {
        const rawValue = typeof column.exportValue === "function" ? column.exportValue(row) : row[column.key];
        const escaped = String(rawValue ?? "—").replace(/"/g, '""');
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

function matchesCommodityFilter(commodity, filterValue) {
  if (filterValue === "All") return true;

  const normalizedCommodity = String(commodity || "").trim().toLowerCase();

  const filterMatchers = {
    Wheat: ["wht", "wheat"],
    Barley: ["bly", "barley"],
    Rapeseed: ["rps", "rapeseed", "rape"],
    SFS: ["sfs", "sunflower"],
    Corn: ["corn", "maize"],
  };

  return (filterMatchers[filterValue] || []).some((token) => normalizedCommodity.includes(token));
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

function ChimpexDetailedCard() {
  const [commodityFilter, setCommodityFilter] = useState("All");
  const [originFilter, setOriginFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");

  const commodityOptions = useMemo(() => CHIMPEX_COMMODITY_FILTERS, []);
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
        const matchesCommodity = matchesCommodityFilter(row.commodity, commodityFilter);
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

  return (
    <article className="mb-card stocks-page__card stocks-page__detailed-card">
      <div className="mb-card-head stocks-page__detailed-head">
        <div className="mb-card-title">
          <span className="stocks-page__title">
            <StorageIcon />
            Chimpex Siloz — Detailed Stocks Report
          </span>
          <span className="mb-head-meta">Report date: {CHIMPEX_REPORT_DATE}</span>
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
                  <td className="stocks-table__footer-merged" colSpan={3}>
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

function computeInlandTotals(rows, fallbackTotal) {
  if (!rows.length && fallbackTotal) return fallbackTotal;

  return {
    label: fallbackTotal?.label || "TOTAL",
    um: rows.length ? "To" : fallbackTotal?.um || "To",
    totalCrop2025: rows.reduce((sum, row) => sum + row.totalCrop2025, 0),
    stocCustodie: rows.reduce((sum, row) => sum + row.stocCustodie, 0),
    stocProprietate: rows.reduce((sum, row) => sum + row.stocProprietate, 0),
    spatiuTehnicUtil: rows.reduce((sum, row) => sum + row.spatiuTehnicUtil, 0),
    spatiuDisponibil: rows.reduce((sum, row) => sum + row.spatiuDisponibil, 0),
    stocRec2024: rows.reduce((sum, row) => sum + row.stocRec2024, 0),
  };
}

function renderInlandValueCell(value) {
  return (
    <span className={value === null || value === undefined ? "stocks-page__cell-empty" : "stocks-page__cell-value"}>
      {formatAccountingNumber(value)}
    </span>
  );
}

function InlandDetailedCard() {
  const [groupFilter, setGroupFilter] = useState("All");
  const [filialaFilter, setFilialaFilter] = useState("All");

  const groupOptions = useMemo(
    () => [...new Set(inlandDetailedData.map((row) => row.group))],
    []
  );

  const filialaOptions = useMemo(() => {
    const rows = inlandDetailedData.filter((row) => groupFilter === "All" || row.group === groupFilter);
    return [...new Set(rows.map((row) => row.filiala))].sort();
  }, [groupFilter]);

  const filteredRows = useMemo(
    () =>
      inlandDetailedData.filter((row) => {
        const matchesGroup = groupFilter === "All" || row.group === groupFilter;
        const matchesFiliala = filialaFilter === "All" || row.filiala === filialaFilter;
        return matchesGroup && matchesFiliala;
      }),
    [filialaFilter, groupFilter]
  );

  const groupedRows = useMemo(
    () =>
      groupOptions
        .map((group) => {
          const rows = filteredRows.filter((row) => row.group === group);
          if (!rows.length) return null;

          const useReferenceTotal = groupFilter === "All" && filialaFilter === "All";
          return {
            group,
            rows,
            total: useReferenceTotal
              ? inlandTotalsReference[group]
              : { ...computeInlandTotals(rows), label: inlandTotalsReference[group].label },
          };
        })
        .filter(Boolean),
    [filialaFilter, filteredRows, groupFilter, groupOptions]
  );

  const generalTotal = useMemo(() => {
    if (groupFilter === "All" && filialaFilter === "All") return inlandTotalsReference.general;
    return { ...computeInlandTotals(filteredRows), label: "TOTAL GENERAL" };
  }, [filteredRows, filialaFilter, groupFilter]);

  const exportRows = useMemo(
    () =>
      filteredRows.map((row) => ({
        ...row,
        totalCrop2025: formatAccountingNumber(row.totalCrop2025),
        stocCustodie: formatAccountingNumber(row.stocCustodie),
        stocProprietate: formatAccountingNumber(row.stocProprietate),
        spatiuTehnicUtil: formatAccountingNumber(row.spatiuTehnicUtil),
        spatiuDisponibil: formatAccountingNumber(row.spatiuDisponibil),
        stocRec2024: formatAccountingNumber(row.stocRec2024),
      })),
    [filteredRows]
  );

  const handleReset = () => {
    setGroupFilter("All");
    setFilialaFilter("All");
  };

  return (
    <article className="mb-card stocks-page__card stocks-page__detailed-card">
      <div className="mb-card-head stocks-page__detailed-head">
        <div className="mb-card-title">
          <span className="stocks-page__title">
            <StorageIcon />
            Inland Silos — Detailed Stocks Report
          </span>
          <div className="stocks-page__header-meta">
            <span className="mb-head-meta">Report date: {INLAND_REPORT_DATE}</span>
            <button
              type="button"
              className="stocks-page__action-button"
              onClick={() => downloadCSV(INLAND_EXPORT_FILENAME, exportRows, inlandColumns)}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="stocks-page__subhead stocks-page__subhead--tight">
          <span className="stocks-page__location">Branch-level inland custody, ownership and storage capacity visibility.</span>
        </div>
      </div>

      <div className="stocks-page__filters stocks-page__filters--inland">
        <FilterSelect
          label="Group"
          value={groupFilter}
          options={groupOptions}
          onChange={(event) => {
            setGroupFilter(event.target.value);
            setFilialaFilter("All");
          }}
        />
        <FilterSelect
          label="Filiala"
          value={filialaFilter}
          options={filialaOptions}
          onChange={(event) => setFilialaFilter(event.target.value)}
        />
        <div className="stocks-page__filter-group stocks-page__filter-group--action">
          <span className="stocks-page__filter-label">Reset</span>
          <button type="button" className="stocks-page__reset-button" onClick={handleReset}>
            Clear filters
          </button>
        </div>
      </div>

      <div className="stocks-table-wrap">
        <table className="stocks-table inland-detailed-table">
          <colgroup>
            {inlandColumns.map((column) => (
              <col key={column.key} style={{ width: column.width, minWidth: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {inlandColumns.map((column) => (
                <th
                  key={column.key}
                  className={[
                    "stocks-table__th",
                    column.align === "right" ? "stocks-table__th--numeric" : "",
                    column.align === "center" ? "stocks-table__th--center" : "",
                  ].join(" ").trim()}
                  scope="col"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows.length ? (
              groupedRows.map(({ group, rows, total }) => (
                <Fragment key={group}>
                  <tr className="stocks-table__group-row">
                    <td className="stocks-table__group-cell" colSpan={inlandColumns.length}>
                      {group}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr key={`${row.group}-${row.filiala}`} className="stocks-table__row">
                      <td className="stocks-table__td stocks-table__td--commodity">{row.filiala}</td>
                      <td className="stocks-table__td stocks-table__td--center">{row.um}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.totalCrop2025)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.stocCustodie)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.stocProprietate)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.spatiuTehnicUtil)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.spatiuDisponibil)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.stocRec2024)}</td>
                    </tr>
                  ))}
                  <tr className="stocks-table__total-row stocks-table__total-row--group">
                    <th className="stocks-table__total-label" scope="row">
                      {total.label}
                    </th>
                    <td className="stocks-table__total-value stocks-table__td--center">{total.um}</td>
                    <td className="stocks-table__total-value">{formatAccountingNumber(total.totalCrop2025)}</td>
                    <td className="stocks-table__total-value">{formatAccountingNumber(total.stocCustodie)}</td>
                    <td className="stocks-table__total-value">{formatAccountingNumber(total.stocProprietate)}</td>
                    <td className="stocks-table__total-value">{formatAccountingNumber(total.spatiuTehnicUtil)}</td>
                    <td className="stocks-table__total-value">{formatAccountingNumber(total.spatiuDisponibil)}</td>
                    <td className="stocks-table__total-value">{formatAccountingNumber(total.stocRec2024)}</td>
                  </tr>
                </Fragment>
              ))
            ) : (
              <tr>
                <td className="stocks-table__empty" colSpan={inlandColumns.length}>
                  No inland rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="stocks-table__total-row stocks-table__total-row--general">
              <th className="stocks-table__total-label" scope="row">
                {generalTotal.label}
              </th>
              <td className="stocks-table__total-value stocks-table__td--center">{generalTotal.um}</td>
              <td className="stocks-table__total-value">{formatAccountingNumber(generalTotal.totalCrop2025)}</td>
              <td className="stocks-table__total-value">{formatAccountingNumber(generalTotal.stocCustodie)}</td>
              <td className="stocks-table__total-value">{formatAccountingNumber(generalTotal.stocProprietate)}</td>
              <td className="stocks-table__total-value">{formatAccountingNumber(generalTotal.spatiuTehnicUtil)}</td>
              <td className="stocks-table__total-value">{formatAccountingNumber(generalTotal.spatiuDisponibil)}</td>
              <td className="stocks-table__total-value">{formatAccountingNumber(generalTotal.stocRec2024)}</td>
            </tr>
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
        <InlandDetailedCard />
      </div>
    </section>
  );
}
