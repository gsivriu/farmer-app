import { useMemo, useState } from "react";
import "./StocksPage.css";

const REPORT_DATE = "14/03/2026";

const STOCKS_COLUMNS = [
  {
    key: "commodity",
    label: "Produs",
    align: "left",
    cellClassName: "stocks-page__commodity-cell",
    render: (row, { wheatMatcher }) => (
      <div className="stocks-page__commodity-wrap">
        <span className="mb-row-label">{displayCell(row.commodity)}</span>
        {wheatMatcher(row) ? <span className="stocks-page__tag">Grau</span> : null}
      </div>
    ),
  },
  {
    key: "stock",
    label: "Stoc (t)",
    align: "right",
    render: (row) => <span className="mb-row-value">{formatNumber(row.stock)}</span>,
  },
  {
    key: "share",
    label: "% Total",
    align: "right",
    render: (row) => <span className="mb-row-value">{formatPercent(row.share)}</span>,
  },
];

const STOCKS_DATA = [
  {
    id: "chimpex",
    title: "Chimpex Siloz — Stocuri Detaliate",
    reportDate: REPORT_DATE,
    exportFilename: "chimpex-stocuri-detaliate",
    storageFooterConfig: {
      label: "Total stoc Chimpex",
      capacity: 235000,
      location: "Constanta",
    },
    wheatMatcher: (row) => String(row.commodity || "").toLowerCase().includes("wheat"),
    data: [
      { commodity: "Wheat", stock: 38500 },
      { commodity: "Corn", stock: 32100 },
      { commodity: "Sunflower", stock: 19600 },
      { commodity: "Rapeseed", stock: 12300 },
      { commodity: "Barley", stock: 9800 },
    ],
  },
  {
    id: "inland",
    title: "Inland Silos — Stocuri Detaliate",
    reportDate: REPORT_DATE,
    exportFilename: "inland-silos-stocuri-detaliate",
    storageFooterConfig: {
      label: "Total stoc Inland Silos",
      capacity: 302000,
      location: "Multiple locations",
    },
    wheatMatcher: (row) => String(row.commodity || "").toLowerCase().includes("wheat"),
    data: [
      { commodity: "Wheat", stock: 31600 },
      { commodity: "Corn", stock: 22500 },
      { commodity: "Sunflower", stock: 11800 },
      { commodity: "Rapeseed", stock: 21500 },
      { commodity: "Barley", stock: 6400 },
    ],
  },
];

export function formatNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return numericValue.toLocaleString("ro-RO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function formatPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  return `${numericValue.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function displayCell(value) {
  if (value === null || value === undefined || value === "") return "-";
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

function FillBar({ percentage }) {
  const width = Math.max(0, Math.min(percentage, 100));
  const color = width >= 85 ? "#b9101e" : width >= 60 ? "#ca8a04" : "#10b981";

  return (
    <div className="mb-fill-bar stocks-page__fill-bar">
      <div className="mb-fill-inner" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

function StocksCard({
  title,
  reportDate,
  data,
  columns,
  exportFilename,
  storageFooterConfig,
  wheatMatcher,
  highlightWheatOnly,
}) {
  const normalizedRows = useMemo(() => {
    const totalStock = data.reduce((sum, row) => sum + Number(row.stock || 0), 0);

    return data
      .map((row) => ({
        ...row,
        share: totalStock > 0 ? (Number(row.stock || 0) / totalStock) * 100 : 0,
      }))
      .filter((row) => !highlightWheatOnly || wheatMatcher(row));
  }, [data, highlightWheatOnly, wheatMatcher]);

  const totalStock = useMemo(
    () => normalizedRows.reduce((sum, row) => sum + Number(row.stock || 0), 0),
    [normalizedRows]
  );

  const utilization = useMemo(() => {
    if (!storageFooterConfig?.capacity) return 0;
    return (totalStock / storageFooterConfig.capacity) * 100;
  }, [storageFooterConfig, totalStock]);

  const gridTemplateColumns = useMemo(
    () =>
      columns
        .map((column, index) => {
          if (index === 0) return "minmax(0, 1.4fr)";
          return "minmax(112px, auto)";
        })
        .join(" "),
    [columns]
  );

  return (
    <article className="mb-card stocks-page__card">
      <div className="mb-card-head">
        <div className="mb-card-title">
          <span className="stocks-page__title">
            <StorageIcon />
            {title}
          </span>
          <span className="mb-head-meta">{displayCell(reportDate)}</span>
        </div>
        {storageFooterConfig?.location ? (
          <div className="stocks-page__subhead">
            <span className="stocks-page__location">{storageFooterConfig.location}</span>
            <button
              type="button"
              className="stocks-page__export-button"
              onClick={() => downloadCSV(exportFilename, normalizedRows, columns)}
            >
              Export CSV
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-col-headers">
        <div className="mb-col-row" style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <span
              key={column.key}
              className={`mb-col-cell stocks-page__align-${column.align || "left"}`}
            >
              {column.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-card-body stocks-page__body">
        {normalizedRows.map((row) => (
          <div key={`${title}-${row.commodity}`} className="mb-row" style={{ gridTemplateColumns }}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={`stocks-page__cell stocks-page__align-${column.align || "left"} ${column.cellClassName || ""}`.trim()}
              >
                {typeof column.render === "function"
                  ? column.render(row, { wheatMatcher })
                  : <span className="mb-row-value">{displayCell(row[column.key])}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mb-card-foot stocks-page__footer">
        <div className="stocks-page__footer-top">
          <span className="mb-foot-label">{displayCell(storageFooterConfig?.label)}</span>
          <span className="mb-foot-val">
            {formatNumber(totalStock)} t
            {storageFooterConfig?.capacity ? (
              <span className="stocks-page__capacity"> / {formatNumber(storageFooterConfig.capacity)} t</span>
            ) : null}
          </span>
        </div>
        <FillBar percentage={utilization} />
        <div className="stocks-page__footer-bottom">
          <span className="mb-row-meta">
            {highlightWheatOnly ? "Filtru activ: grau" : `${normalizedRows.length} pozitii`}
          </span>
          <span className="mb-row-meta">{formatPercent(utilization)} utilizare</span>
        </div>
      </div>
    </article>
  );
}

export default function StocksPage() {
  const [showWheatOnly, setShowWheatOnly] = useState(false);

  const cards = useMemo(
    () =>
      STOCKS_DATA.map((card) => ({
        ...card,
        columns: STOCKS_COLUMNS,
      })),
    []
  );

  return (
    <section className="stocks-page">
      <div className="stocks-page__toolbar">
        <div>
          <h2 className="stocks-page__heading">Stocks</h2>
          <p className="stocks-page__caption">Situatie detaliata a stocurilor disponibile in Motherboard.</p>
        </div>
        <button
          type="button"
          className={`stocks-page__filter-button ${showWheatOnly ? "is-active" : ""}`}
          onClick={() => setShowWheatOnly((current) => !current)}
        >
          {showWheatOnly ? "Afiseaza toate produsele" : "Afiseaza doar grau"}
        </button>
      </div>

      <div className="stocks-page__stack">
        {cards.map((card) => (
          <StocksCard
            key={card.id}
            title={card.title}
            reportDate={card.reportDate}
            data={card.data}
            columns={card.columns}
            exportFilename={card.exportFilename}
            storageFooterConfig={card.storageFooterConfig}
            wheatMatcher={card.wheatMatcher}
            highlightWheatOnly={showWheatOnly}
          />
        ))}
      </div>
    </section>
  );
}
