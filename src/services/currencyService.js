import { supabase } from "../supabaseClient";

const FALLBACK = {
  ronToEur: 4.97,
  ronToUsd: 4.58,
  eurToUsd: 1.08,
  lastUpdated: "Offline/Error",
};

export const getExchangeRates = async () => {
  try {
    const { data, error } = await supabase.functions.invoke("exchange-rates");

    if (error) throw error;
    if (!data?.ronToEur || !data?.ronToUsd) throw new Error("Date incomplete");

    return data;
  } catch (error) {
    console.error("Eroare exchange rates:", error);
    return FALLBACK;
  }
};
