import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Fetches agricultural news via the gnews Supabase edge function.
 * Only fetches when `active` is true (e.g. when the News tab is visible).
 *
 * @param {boolean} active - trigger fetch when true
 */
export function useNewsData(active) {
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();

    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);

      try {
        const { data, error } = await supabase.functions.invoke("gnews", {
          body: {
            q: "agricultura OR cereale OR preturi",
            lang: "ro",
            max: 10,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const rawArticles = Array.isArray(data?.articles) ? data.articles : [];
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
        setNewsItems(deduped);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("News error:", err);
          setNewsError(err?.message || "Loading error");
        }
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();

    return () => controller.abort();
  }, [active]);

  return { newsItems, newsLoading, newsError };
}
