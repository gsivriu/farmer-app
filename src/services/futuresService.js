import { supabase } from "../supabaseClient";

const FALLBACK = [
  {
    market: "CBOT", product: "Corn", unit: "USX/bu",
    contracts: [
      { label: "May 26", price: null, change: null, changePercent: null, prevClose: null },
      { label: "Jul 26", price: null, change: null, changePercent: null, prevClose: null },
      { label: "Sep 26", price: null, change: null, changePercent: null, prevClose: null },
    ],
  },
  {
    market: "CBOT", product: "Wheat", unit: "USX/bu",
    contracts: [
      { label: "May 26", price: null, change: null, changePercent: null, prevClose: null },
      { label: "Jul 26", price: null, change: null, changePercent: null, prevClose: null },
      { label: "Sep 26", price: null, change: null, changePercent: null, prevClose: null },
    ],
  },
];

export async function getGrainFutures() {
  try {
    const { data, error } = await supabase.functions.invoke("grain-futures");
    if (error) throw error;
    if (!data?.products?.length) throw new Error("No futures data");
    return data.products;
  } catch (err) {
    console.error("Eroare grain-futures:", err);
    return FALLBACK;
  }
}
