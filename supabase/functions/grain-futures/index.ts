const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ZCK26.CBT = CBOT Corn May 2026 | ZWK26.CBT = CBOT Wheat May 2026
const SYMBOLS = [
  { symbol: "ZCK26.CBT", market: "CBOT",  product: "Corn",  unit: "USX/bu", contract: "May 26" },
  { symbol: "ZWK26.CBT", market: "CBOT",  product: "Wheat", unit: "USX/bu", contract: "May 26" },
];

async function fetchQuote(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Yahoo Finance ${symbol}: HTTP ${res.status}`);

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta = result.meta;
  const price: number = meta.regularMarketPrice;
  const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change: number = meta.regularMarketChange ?? (price - prevClose);
  const changePercent: number = meta.regularMarketChangePercent ?? (prevClose > 0 ? (change / prevClose) * 100 : 0);

  return { price, change, changePercent, currency: meta.currency as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify the request comes from our own Supabase project via the apikey header.
  // Market data is public — no user JWT needed.
  const apikey = req.headers.get("apikey");
  const expectedKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!apikey || apikey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = await Promise.allSettled(
    SYMBOLS.map((s) => fetchQuote(s.symbol).then((q) => ({ ...s, ...q }))),
  );

  const futures = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`Failed ${SYMBOLS[i].symbol}:`, r.reason?.message);
    return { ...SYMBOLS[i], price: null, change: null, changePercent: null, currency: null };
  });

  return new Response(JSON.stringify({ futures, fetchedAt: new Date().toISOString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
