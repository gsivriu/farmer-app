import { Fragment, useMemo, useState } from "react";
import "./StocksPage.css";

// ── Report metadata ───────────────────────────────────────────────────────────

const CHIMPEX_COMMODITY_FILTERS = ["Wheat", "Barley", "Rapeseed", "SFS", "Corn"];

// Chimpex overview totals (for header fill bar)
const CHIMPEX_TOTAL    = 112300;
const CHIMPEX_CAPACITY = 235000;

// Inland overview totals (for header fill bar)
const INLAND_TOTAL    = 93800;
const INLAND_CAPACITY = 302000;

// ── Chimpex detailed data ─────────────────────────────────────────────────────

// silozChimpex total:    105,839.02 t  (90% din warehouse mutat în siloz)
// warehouseChimpex total:  6,460.98 t  (10% rămas în warehouse)
// Grand total:            112,300.00 t  ← matches CHIMPEX_TOTAL / Overview
const chimpexDetailedData = [
  { commodity: "BLY 2025",           origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 4410.00,   warehouseChimpex: 490.00,  bargesThirdParty: null, niva: 0    },
  { commodity: "RPS 2025",           origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 4860.00,   warehouseChimpex: 540.00,  bargesThirdParty: null, niva: 0    },
  { commodity: "WHT LP 2025",        origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 311.04,    warehouseChimpex: 0,       bargesThirdParty: null, niva: null },
  { commodity: "WHT HP 2025",        origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 21751.51,  warehouseChimpex: 402.68,  bargesThirdParty: null, niva: 0    },
  { commodity: "CORN 2025",          origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 13845.23,  warehouseChimpex: 930.00,  bargesThirdParty: null, niva: null },
  { commodity: "SFS 2025",           origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 8820.00,   warehouseChimpex: 980.00,  bargesThirdParty: null, niva: null },
  { commodity: "RPS 2025 IMPORTED",  origin: "MLD", client: "AMEROPA GRAINS SA",                    silozChimpex: 0,         warehouseChimpex: 0,       bargesThirdParty: null, niva: null },
  { commodity: "BLY 2025",           origin: "RO",  client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 4410.00,   warehouseChimpex: 490.00,  bargesThirdParty: null, niva: 0    },
  { commodity: "RPS 2025",           origin: "RO",  client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 6210.00,   warehouseChimpex: 690.00,  bargesThirdParty: null, niva: null },
  { commodity: "WHT LP 2025",        origin: "RO",  client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 1005.80,   warehouseChimpex: 0,       bargesThirdParty: null, niva: null },
  { commodity: "WHT HP 2025",        origin: "RO",  client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 15028.97,  warehouseChimpex: 0,       bargesThirdParty: null, niva: null },
  { commodity: "SFS 2025",           origin: "RO",  client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 8820.00,   warehouseChimpex: 980.00,  bargesThirdParty: null, niva: null },
  { commodity: "WHT 2025 TRANZIT",   origin: "MLD", client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 0,         warehouseChimpex: 0,       bargesThirdParty: null, niva: null },
  { commodity: "CORN 2025",          origin: "RO",  client: "AMS AMEROPA MARKETING AND SALES AG",   silozChimpex: 16366.47,  warehouseChimpex: 958.30,  bargesThirdParty: null, niva: null },
  { commodity: "WHT",                origin: "RO",  client: "AMEROPA GRAINS SA",                    silozChimpex: 0,         warehouseChimpex: 0,       bargesThirdParty: null, niva: null },
];

const chimpexColumns = [
  { key: "commodity",        label: "COMMODITY",         align: "left",  width: "18%" },
  { key: "origin",           label: "ORIGIN",            align: "left",  width: "9%"  },
  { key: "client",           label: "CLIENT",            align: "left",  width: "31%" },
  { key: "silozChimpex",     label: "SILOZ CHIMPEX",     align: "right", width: "14%" },
  { key: "warehouseChimpex", label: "WAREHOUSE CHIMPEX", align: "right", width: "16%" },
  { key: "niva",             label: "NIVA",              align: "right", width: "12%" },
];

const chimpexFooterRows = [
  {
    label: "TOTAL",
    tone: "neutral",
    values: { silozChimpex: 105839.02, warehouseChimpex: 6460.98, niva: 0 },
  },
  {
    label: "STORAGE SPACES STATUS (% FULL)",
    tone: "success-strong",
    values: { silozChimpex: 47.79, warehouseChimpex: null, niva: 0 },
    isPercent: true,
  },
];

// ── Inland detailed data ──────────────────────────────────────────────────────

const inlandDetailedData = [
  { group: "Constanta Area", filiala: "Ciocarlia",        um: "To", totalCrop2025: 25268.32,  stocCustodie: 0,       stocProprietate: 1441.31,  spatiuTehnicUtil: 22692,  spatiuDisponibil: 21250.69, stocRec2024: 0     },
  { group: "Constanta Area", filiala: "Negru-Voda",       um: "To", totalCrop2025: 24897.68,  stocCustodie: 0,       stocProprietate: 156.23,   spatiuTehnicUtil: 30500,  spatiuDisponibil: 30343.77, stocRec2024: 0     },
  { group: "Constanta Area", filiala: "Nicolae Balcescu", um: "To", totalCrop2025: 12954.14,  stocCustodie: 229.24,  stocProprietate: 2616.06,  spatiuTehnicUtil: 46320,  spatiuDisponibil: 45182.52, stocRec2024: 577.08 },
  { group: "Territory",      filiala: "Dor Marunt",       um: "To", totalCrop2025: 36580.72,  stocCustodie: 0,       stocProprietate: 0,        spatiuTehnicUtil: 11000,  spatiuDisponibil: 11000,    stocRec2024: 0     },
  { group: "Territory",      filiala: "Plosca",           um: "To", totalCrop2025: 63745.98,  stocCustodie: 0,       stocProprietate: 3039.73,  spatiuTehnicUtil: 13000,  spatiuDisponibil: 9960.27,  stocRec2024: 0     },
  { group: "Territory",      filiala: "Harsova",          um: "To", totalCrop2025: 31947.94,  stocCustodie: 1239.08, stocProprietate: 12.09,    spatiuTehnicUtil: 29000,  spatiuDisponibil: 27742.19, stocRec2024: 1.2   },
  { group: "Territory",      filiala: "Macin",            um: "To", totalCrop2025: 15049.12,  stocCustodie: 0,       stocProprietate: 744.71,   spatiuTehnicUtil: 11000,  spatiuDisponibil: 10255.29, stocRec2024: 0     },
  { group: "Territory",      filiala: "Vladeni",          um: "To", totalCrop2025: 39109.7,   stocCustodie: 0,       stocProprietate: 5717.99,  spatiuTehnicUtil: 14000,  spatiuDisponibil: 8271.53,  stocRec2024: 10.48 },
  { group: "Territory",      filiala: "Ciresu",           um: "To", totalCrop2025: 56919.9,   stocCustodie: 0,       stocProprietate: 1.12,     spatiuTehnicUtil: 10000,  spatiuDisponibil: 9997.76,  stocRec2024: 0     },
  { group: "Territory",      filiala: "Adancata",         um: "To", totalCrop2025: 35964.26,  stocCustodie: 0,       stocProprietate: 1171.65,  spatiuTehnicUtil: 22000,  spatiuDisponibil: 20828.35, stocRec2024: 0     },
  { group: "Territory",      filiala: "Farcasele",        um: "To", totalCrop2025: 57354.64,  stocCustodie: 0,       stocProprietate: 4555.35,  spatiuTehnicUtil: 13500,  spatiuDisponibil: 8944.65,  stocRec2024: 0     },
  { group: "Territory",      filiala: "Sarulesti",        um: "To", totalCrop2025: 70969.5,   stocCustodie: 0,       stocProprietate: 5607.48,  spatiuTehnicUtil: 50750,  spatiuDisponibil: 45138.78, stocRec2024: 8.68  },
  { group: "Territory",      filiala: "Mirosi",           um: "To", totalCrop2025: 55213.44,  stocCustodie: 0,       stocProprietate: 3380.91,  spatiuTehnicUtil: 28500,  spatiuDisponibil: 24889.71, stocRec2024: 40.02 },
];

const inlandColumns = [
  { key: "filiala",          label: "SILO",               align: "left",  width: "180px" },
  { key: "stocCustodie",     label: "CUSTODY STOCK",      align: "right", width: "140px" },
  { key: "stocProprietate",  label: "OWNED STOCK",        align: "right", width: "150px" },
  { key: "spatiuTehnicUtil", label: "TECHNICAL CAPACITY", align: "right", width: "160px" },
  { key: "spatiuDisponibil", label: "AVAILABLE SPACE",    align: "right", width: "160px" },
  { key: "stocRec2024",      label: "2024 CROP STOCK",    align: "right", width: "140px" },
];

const inlandTotalsReference = {
  general: {
    label: "TOTAL GENERAL",
    um: "To",
    totalCrop2025:    587146.18,
    stocCustodie:       1468.31,
    stocProprietate:   28444.65,
    spatiuTehnicUtil:  368862,
    spatiuDisponibil:  340405.5,
    stocRec2024:         637.46,
  },
};

// ── KPI summary data (Chimpex overview + Inland overview totals) ──────────────

const KPI_DATA = [
  { key: "wheat",     label: "Wheat",     total: 70100 },
  { key: "barley",    label: "Barley",    total: 16200 },
  { key: "corn",      label: "Corn",      total: 54600 },
  { key: "sunflower", label: "Sunflower", total: 31400 },
  { key: "rapeseed",  label: "Rapeseed",  total: 33800 },
];

// ── Utility functions (unchanged) ─────────────────────────────────────────────

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


function matchesCommodityFilter(commodity, filterValue) {
  if (filterValue === "All") return true;
  const normalizedCommodity = String(commodity || "").trim().toLowerCase();
  const filterMatchers = {
    Wheat:    ["wht", "wheat"],
    Barley:   ["bly", "barley"],
    Rapeseed: ["rps", "rapeseed", "rape"],
    SFS:      ["sfs", "sunflower"],
    Corn:     ["corn", "maize"],
  };
  return (filterMatchers[filterValue] || []).some((token) => normalizedCommodity.includes(token));
}

function computeInlandTotals(rows, fallbackTotal) {
  if (!rows.length && fallbackTotal) return fallbackTotal;
  return {
    label: fallbackTotal?.label || "TOTAL",
    um:    rows.length ? "To" : fallbackTotal?.um || "To",
    totalCrop2025:    rows.reduce((s, r) => s + r.totalCrop2025,    0),
    stocCustodie:     rows.reduce((s, r) => s + r.stocCustodie,     0),
    stocProprietate:  rows.reduce((s, r) => s + r.stocProprietate,  0),
    spatiuTehnicUtil: rows.reduce((s, r) => s + r.spatiuTehnicUtil, 0),
    spatiuDisponibil: rows.reduce((s, r) => s + r.spatiuDisponibil, 0),
    stocRec2024:      rows.reduce((s, r) => s + r.stocRec2024,      0),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────




function renderTableCell(value, isPercent = false) {
  const content = isPercent ? formatPercent(value) : formatNumber(value);
  const isEmpty = content === "—";
  return (
    <span className={isEmpty ? "stocks-page__cell-empty" : "stocks-page__cell-value"}>
      {content}
    </span>
  );
}

function renderInlandValueCell(value) {
  return (
    <span className={value === null || value === undefined ? "stocks-page__cell-empty" : "stocks-page__cell-value"}>
      {formatAccountingNumber(value)}
    </span>
  );
}


// ── A) KPI Summary Bar ────────────────────────────────────────────────────────

function KpiSummaryBar() {
  const fmt = (n) => n.toLocaleString("en-US");
  return (
    <div className="stocks-kpi-row">
      {KPI_DATA.map(({ key, label, total }) => (
        <div key={key} className="stocks-kpi-card">
          <span className="stocks-kpi-label">{label}</span>
          <span className="stocks-kpi-value">{fmt(total)} t</span>
          <span className="stocks-kpi-sub">Chimpex + Inland</span>
        </div>
      ))}
    </div>
  );
}

// ── B) Toolbar ────────────────────────────────────────────────────────────────

function StocksToolbar({
  searchText, onSearch,
  commodityFilter, onCommodity,
  originFilter, onOrigin,
  clientFilter, onClient,
}) {
  const originOptions = useMemo(
    () => [...new Set(chimpexDetailedData.map((r) => r.origin))].sort(),
    []
  );
  const clientOptions = useMemo(
    () => [...new Set(chimpexDetailedData.map((r) => r.client))].sort(),
    []
  );

  return (
    <div className="stocks-toolbar">
      <div className="stocks-toolbar__search-wrap">
        <input
          type="search"
          className="stocks-toolbar__search"
          placeholder="Search commodity, origin, client…"
          value={searchText}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <select className="stocks-toolbar__select" value={commodityFilter} onChange={(e) => onCommodity(e.target.value)}>
        <option value="All">All Commodities</option>
        {CHIMPEX_COMMODITY_FILTERS.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <select className="stocks-toolbar__select" value={originFilter} onChange={(e) => onOrigin(e.target.value)}>
        <option value="All">All Origins</option>
        {originOptions.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <select className="stocks-toolbar__select" value={clientFilter} onChange={(e) => onClient(e.target.value)}>
        <option value="All">All Clients</option>
        {clientOptions.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── C) Chimpex Detailed Card ──────────────────────────────────────────────────

function ChimpexDetailedCard({ filteredRows }) {
  const pct = Math.min(Math.round((CHIMPEX_TOTAL / CHIMPEX_CAPACITY) * 100), 100);
  const fmt = (n) => n.toLocaleString("en-US");

  const sortedRows = useMemo(
    () => [...filteredRows].sort((a, b) => a.commodity.localeCompare(b.commodity)),
    [filteredRows]
  );

  return (
    <article className="stocks-page__card">
      {/* Card header */}
      <div className="stocks-card-head">
        <div className="stocks-head-left">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#b9101e" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="stocks-head-title">Chimpex Siloz</span>
          <span className="stocks-head-meta">Constanța</span>
        </div>
        <div className="stocks-head-right">
          <span className="stocks-head-total">{fmt(CHIMPEX_TOTAL)} t</span>
          <span className="stocks-head-capacity">/ {fmt(CHIMPEX_CAPACITY)} t</span>
        </div>
      </div>
      <div className="stocks-head-bar">
        <div className="stocks-head-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Table */}
      <div className="stocks-table-wrap">
        <table className="stocks-table chimpex-detailed-table">
          <colgroup>
            {chimpexColumns.map((col) => (
              <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {chimpexColumns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === "right" ? "stocks-table__th stocks-table__th--numeric" : "stocks-table__th"}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length > 0 ? (
              sortedRows.map((row, i) => (
                <tr key={`${row.commodity}-${row.origin}-${row.client}-${i}`} className="stocks-table__row">
                  <td className="stocks-table__td stocks-td-commodity">
                    {row.commodity}
                  </td>
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
                  <th className="stocks-table__footer-label" colSpan={3} scope="row">{row.label}</th>
                  <td className="stocks-table__footer-merged" colSpan={3}>{row.mergedValue}</td>
                </tr>
              ) : (
                <tr key={row.label} className={`stocks-table__footer stocks-table__footer--${row.tone}`}>
                  <th className="stocks-table__footer-label" colSpan={3} scope="row">{row.label}</th>
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

// ── D) Inland Detailed Card ───────────────────────────────────────────────────

function InlandDetailedCard() {
  const [groupFilter,   setGroupFilter]   = useState("All");
  const [filialaFilter, setFilialaFilter] = useState("All");

  const pct = Math.min(Math.round((INLAND_TOTAL / INLAND_CAPACITY) * 100), 100);
  const fmt = (n) => n.toLocaleString("en-US");

  const groupOptions = useMemo(
    () => [...new Set(inlandDetailedData.map((r) => r.group))],
    []
  );
  const filialaOptions = useMemo(() => {
    const rows = inlandDetailedData.filter((r) => groupFilter === "All" || r.group === groupFilter);
    return [...new Set(rows.map((r) => r.filiala))].sort();
  }, [groupFilter]);

  const filteredRows = useMemo(
    () => inlandDetailedData.filter((r) => {
      const matchesGroup   = groupFilter   === "All" || r.group   === groupFilter;
      const matchesFiliala = filialaFilter === "All" || r.filiala === filialaFilter;
      return matchesGroup && matchesFiliala;
    }),
    [filialaFilter, groupFilter]
  );

  const groupedRows = useMemo(
    () => groupOptions
      .map((group) => {
        const rows = filteredRows.filter((r) => r.group === group);
        return rows.length ? { group, rows } : null;
      })
      .filter(Boolean),
    [filteredRows, groupOptions]
  );

  const generalTotal = useMemo(() => {
    if (groupFilter === "All" && filialaFilter === "All") return inlandTotalsReference.general;
    return { ...computeInlandTotals(filteredRows), label: "TOTAL GENERAL" };
  }, [filteredRows, filialaFilter, groupFilter]);

  const handleReset = () => { setGroupFilter("All"); setFilialaFilter("All"); };

  return (
    <article className="stocks-page__card">
      {/* Card header */}
      <div className="stocks-card-head">
        <div className="stocks-head-left">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#b9101e" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="stocks-head-title">Inland Silos</span>
          <span className="stocks-head-meta">Multiple locations</span>
        </div>
        <div className="stocks-head-right">
          <span className="stocks-head-total">{fmt(INLAND_TOTAL)} t</span>
          <span className="stocks-head-capacity">/ {fmt(INLAND_CAPACITY)} t</span>
        </div>
      </div>
      <div className="stocks-head-bar">
        <div className="stocks-head-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Inline filters for inland (Group + Filiala) */}
      <div className="stocks-toolbar stocks-toolbar--inline">
        <select
          className="stocks-toolbar__select"
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setFilialaFilter("All"); }}
        >
          <option value="All">All Groups</option>
          {groupOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          className="stocks-toolbar__select"
          value={filialaFilter}
          onChange={(e) => setFilialaFilter(e.target.value)}
        >
          <option value="All">All Silos</option>
          {filialaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button type="button" className="stocks-toolbar__reset" onClick={handleReset}>
          Clear filters
        </button>
      </div>

      {/* Table */}
      <div className="stocks-table-wrap">
        <table className="stocks-table inland-detailed-table">
          <colgroup>
            {inlandColumns.map((col) => (
              <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {inlandColumns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    "stocks-table__th",
                    col.align === "right"  ? "stocks-table__th--numeric" : "",
                    col.align === "center" ? "stocks-table__th--center"  : "",
                  ].join(" ").trim()}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows.length ? (
              groupedRows.map(({ group, rows }) => (
                <Fragment key={group}>
                  <tr className="stocks-table__group-row">
                    <td className="stocks-table__group-cell" colSpan={inlandColumns.length}>{group}</td>
                  </tr>
                  {rows.map((row) => (
                    <tr key={`${row.group}-${row.filiala}`} className="stocks-table__row">
                      <td className="stocks-table__td stocks-table__td--commodity">{row.filiala}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.stocCustodie)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.stocProprietate)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.spatiuTehnicUtil)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.spatiuDisponibil)}</td>
                      <td className="stocks-table__td stocks-table__td--numeric">{renderInlandValueCell(row.stocRec2024)}</td>
                    </tr>
                  ))}
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
              <th className="stocks-table__total-label" scope="row">{generalTotal.label}</th>
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

// ── Main StocksPage ───────────────────────────────────────────────────────────

export default function StocksPage() {
  const [searchText,       setSearchText]       = useState("");
  const [commodityFilter,  setCommodityFilter]  = useState("All");
  const [originFilter,     setOriginFilter]     = useState("All");
  const [clientFilter,     setClientFilter]     = useState("All");

  const filteredChimpexRows = useMemo(
    () => chimpexDetailedData.filter((row) => {
      const matchesCommodity = matchesCommodityFilter(row.commodity, commodityFilter);
      const matchesOrigin    = originFilter === "All" || row.origin === originFilter;
      const matchesClient    = clientFilter === "All" || row.client === clientFilter;
      const q = searchText.trim().toLowerCase();
      const matchesSearch    = !q || [row.commodity, row.origin, row.client]
        .some((v) => String(v || "").toLowerCase().includes(q));
      return matchesCommodity && matchesOrigin && matchesClient && matchesSearch;
    }),
    [searchText, commodityFilter, originFilter, clientFilter]
  );

  return (
    <section className="stocks-page">
      {/* A) KPI bar */}
      <KpiSummaryBar />

      {/* B) Toolbar (filters Chimpex table) */}
      <StocksToolbar
        searchText={searchText}           onSearch={setSearchText}
        commodityFilter={commodityFilter} onCommodity={setCommodityFilter}
        originFilter={originFilter}       onOrigin={setOriginFilter}
        clientFilter={clientFilter}       onClient={setClientFilter}
      />

      {/* C) Chimpex card */}
      <ChimpexDetailedCard filteredRows={filteredChimpexRows} />

      {/* D) Inland card */}
      <InlandDetailedCard />
    </section>
  );
}
