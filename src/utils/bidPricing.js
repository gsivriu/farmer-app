// Price a single bid was contracted at, for display.
//
// Aggregate statistics do NOT go through here — they are computed by the
// bid_stats() RPC (supabase/migrations/20260716120000_bid_stats_rpc.sql),
// which mirrors this expression in SQL. Keep the two in step.

import { hasPositiveNumber } from "./numberFormat";

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
