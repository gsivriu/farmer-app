// Shared formatting utilities used across FarmerDashboard, AdminDashboard, BidForm

export const formatDateDMY = (value) => {
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

export const formatDeliveryRange = (start, end) => {
  if (!start || !end) return "-";
  return `${formatDateDMY(start)} - ${formatDateDMY(end)}`;
};

export const formatLocationDisplay = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === "-") return raw || "-";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  // Normalize variants to canonical Romanian form
  if (normalized === "port constanta" || normalized === "constanta port") {
    return "Port Constanța";
  }
  return raw;
};

export const isFreightParity = (parity) => {
  const p = String(parity || "").toUpperCase();
  return p === "FCA" || p === "FOR" || p === "FOB";
};
