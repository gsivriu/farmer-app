const PRODUCT_LABELS_BY_KEY = {
  wheat: "Grâu",
  grau: "Grâu",
  barley: "Orz",
  orz: "Orz",
  corn: "Porumb",
  porumb: "Porumb",
  rapeseed: "Rapiță",
  rapita: "Rapiță",
  sunflower: "Floarea-soarelui",
  "floarea soarelui": "Floarea-soarelui",
  sfs: "Floarea-soarelui",
};

export const PRODUCT_FILTER_KEYS = [
  "wheat",
  "barley",
  "corn",
  "rapeseed",
  "sunflower",
];

export const normalizeProductKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const getProductLabel = (value) => {
  const key = normalizeProductKey(value);
  return PRODUCT_LABELS_BY_KEY[key] || null;
};

export const getProductLabelSafe = (...values) => {
  for (const value of values) {
    const label = getProductLabel(value);
    if (label) return label;
  }
  for (const value of values) {
    const raw = String(value || "").trim();
    if (raw) return raw;
  }
  return "-";
};
