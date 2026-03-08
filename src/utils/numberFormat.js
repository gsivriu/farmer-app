export const formatCompactNumber = (value, decimals = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";

  const safeDecimals =
    Number.isInteger(decimals) && decimals >= 0 ? decimals : 2;

  const fixed = num.toFixed(safeDecimals);
  const compact = fixed
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?[1-9])0+$/, "$1");

  return compact === "-0" ? "0" : compact;
};

export const hasPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
};
