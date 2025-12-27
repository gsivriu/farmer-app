/// <reference path="./deno.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let q = url.searchParams.get("q") ?? "";
    let lang = url.searchParams.get("lang") ?? "ro";
    let max = Number(url.searchParams.get("max") ?? "10");

    if (!q && req.method !== "GET") {
      try {
        const body = await req.json();
        if (body && typeof body.q === "string") q = body.q;
        if (body && typeof body.lang === "string") lang = body.lang;
        if (body && body.max != null) max = Number(body.max);
      } catch {
        // ignore JSON parse errors, fall back to query params
      }
    }

    if (!q || typeof q !== "string") {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("GNEWS_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing GNEWS_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxClamped = Number.isFinite(max) ? Math.min(Math.max(max, 1), 10) : 10;
    const apiUrl = new URL("https://gnews.io/api/v4/search");
    apiUrl.searchParams.set("q", q);
    apiUrl.searchParams.set("lang", lang);
    apiUrl.searchParams.set("max", String(maxClamped));
    apiUrl.searchParams.set("token", token);

    const res = await fetch(apiUrl.toString());
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
