import { checkRateLimit, clientIdentity, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTS = [
  {
    market: "CBOT", product: "Corn", unit: "USX/bu",
    contracts: [
      { symbol: "ZCK26.CBT", label: "May 26" },
      { symbol: "ZCN26.CBT", label: "Jul 26" },
      { symbol: "ZCU26.CBT", label: "Sep 26" },
    ],
  },
  {
    market: "CBOT", product: "Wheat", unit: "USX/bu",
    contracts: [
      { symbol: "ZWK26.CBT", label: "May 26" },
      { symbol: "ZWN26.CBT", label: "Jul 26" },
      { symbol: "ZWU26.CBT", label: "Sep 26" },
    ],
  },
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

  return {
    price,
    change,
    changePercent,
    prevClose: prevClose,
    high: meta.regularMarketDayHigh ?? null,
    low:  meta.regularMarketDayLow  ?? null,
    volume: meta.regularMarketVolume ?? null,
    currency: meta.currency as string,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // No auth check needed — this function returns public market data only.
  if (!(await checkRateLimit("grain-futures", clientIdentity(req), 30, 60))) {
    return rateLimitResponse(corsHeaders);
  }

  const products = await Promise.all(
    PRODUCTS.map(async (p) => {
      const rows = await Promise.allSettled(
        p.contracts.map((c) => fetchQuote(c.symbol).then((q) => ({ label: c.label, symbol: c.symbol, ...q }))),
      );
      return {
        market: p.market,
        product: p.product,
        unit: p.unit,
        contracts: rows.map((r, i) => {
          if (r.status === "fulfilled") return r.value;
          console.error(`Failed ${p.contracts[i].symbol}:`, r.reason?.message);
          return { label: p.contracts[i].label, symbol: p.contracts[i].symbol, price: null, change: null, changePercent: null, prevClose: null, high: null, low: null, volume: null, currency: null };
        }),
      };
    }),
  );

  return new Response(JSON.stringify({ products, fetchedAt: new Date().toISOString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
