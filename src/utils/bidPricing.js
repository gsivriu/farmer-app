// Single source of truth for contracted price and bid statistics.
//
// Statistics answer one question: what was actually contracted, and at what
// price. Only bids with status 'accepted' count. Pending, countered and
// rejected bids are proposals — blending their asking prices into an average
// yields a figure that matches no real transaction.

import { hasPositiveNumber } from "./numberFormat";

export const isContracted = (bid) => bid?.status === "accepted";

// final_price is written only when a farmer accepts a counter-offer; when an
// admin accepts directly it stays null, so fall back to the standing
// counter-offer and then to the farmer's original asking price.
export const getAcceptedPrice = (bid) => {
  if (!bid) return null;
  const raw = bid.final_price != null ? bid.final_price
    : hasPositiveNumber(bid.counter_price) ? bid.counter_price
    : bid.price;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

// Volume-weighted average price per product, over accepted contracts only.
export const computeAcceptedStats = (bids) => {
  const map = new Map();

  (bids || []).filter(isContracted).forEach((bid) => {
    const product = bid.product || "unknown";
    const qty = Number(bid.quantity || 0);
    const price = Number(getAcceptedPrice(bid) || 0);
    const current = map.get(product) || { product, totalQty: 0, totalValue: 0 };
    current.totalQty += qty;
    current.totalValue += qty * price;
    map.set(product, current);
  });

  return Array.from(map.values()).map((row) => ({
    product: row.product,
    totalQty: row.totalQty,
    avgPrice: row.totalQty ? row.totalValue / row.totalQty : 0,
  }));
};
