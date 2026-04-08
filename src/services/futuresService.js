import { supabase } from "../supabaseClient";

// Static fallback — used when the Edge Function is unreachable
const FALLBACK = [
  { symbol: "ZCK26.CBT", market: "CBOT", product: "Corn",  unit: "USX/bu", contract: "May 26", price: null, change: null, changePercent: null },
  { symbol: "ZWK26.CBT", market: "CBOT", product: "Wheat", unit: "USX/bu", contract: "May 26", price: null, change: null, changePercent: null },
];

export async function getGrainFutures() {
  try {
    const { data, error } = await supabase.functions.invoke("grain-futures");
    if (error) throw error;
    if (!data?.futures?.length) throw new Error("No futures data");
    return data.futures;
  } catch (err) {
    console.error("Eroare grain-futures:", err);
    return FALLBACK;
  }
}
