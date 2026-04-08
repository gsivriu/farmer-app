import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYMBOLS = [
  { symbol: "ZC=F",   market: "CBOT",  product: "Corn",  unit: "USX/bu" },
  { symbol: "ZW=F",   market: "CBOT",  product: "Wheat", unit: "USX/bu" },
  { symbol: "EBM.PA", market: "MATIF", product: "Wheat", unit: "EUR/t"  },
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );

  if (authError || !user) {
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
