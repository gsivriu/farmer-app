import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

// Ştirile vin dintr-un cache partajat pe server (vezi Edge Function-ul gnews),
// dar nu are rost să re-cerem la fiecare comutare de tab: ţinem rezultatul cât
// timp trăieşte sesiunea din browser/WKWebView şi îl reîmprospătăm doar după
// ce s-a învechit. Modulul e importat o singură dată, deci cache-ul e comun
// tuturor montărilor componentei.
const CLIENT_TTL_MS = 15 * 60 * 1000;
let cachedItems = null;
let cachedAt = 0;
let inFlight = null;

function dedupeArticles(rawArticles) {
  const seen = new Set();
  const deduped = [];
  for (const item of rawArticles) {
    const title = (item?.title || "").trim().toLowerCase();
    const url = (item?.url || "").trim().toLowerCase();
    const key = url || title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

// O singură cerere în zbor la un moment dat. Fără asta, două montări apropiate
// (comutare rapidă de tab, StrictMode în dev) trimit două apeluri care consumă
// dublu din cota GNews şi declanşează exact protecţia anti-burst care a spart
// tabul pe 2026-09-13.
function fetchNewsOnce() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("gnews", {
        body: { q: "agricultura OR cereale OR preturi", lang: "ro", max: 10 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const items = dedupeArticles(Array.isArray(data?.articles) ? data.articles : []);
      cachedItems = items;
      cachedAt = Date.now();
      return items;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Fetches agricultural news via the gnews Supabase edge function.
 * Only fetches when `active` is true (e.g. when the News tab is visible).
 *
 * @param {boolean} active - trigger fetch when true
 */
export function useNewsData(active) {
  const [newsItems, setNewsItems] = useState(cachedItems ?? []);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const loadNews = async () => {
      if (cachedItems && Date.now() - cachedAt < CLIENT_TTL_MS) {
        if (cancelled) return;
        setNewsItems(cachedItems);
        setNewsError(null);
        return;
      }

      setNewsLoading(true);
      setNewsError(null);

      try {
        const items = await fetchNewsOnce();
        if (cancelled) return;
        setNewsItems(items);
      } catch (err) {
        if (cancelled) return;
        console.error("News error:", err);
        // Dacă avem ştiri mai vechi, mai bine le arătăm decât un ecran gol.
        if (cachedItems?.length) {
          setNewsItems(cachedItems);
        } else {
          setNewsError("Ştirile nu pot fi încărcate momentan. Încearcă din nou mai târziu.");
        }
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    };

    loadNews();

    return () => {
      cancelled = true;
    };
  }, [active]);

  return { newsItems, newsLoading, newsError };
}
