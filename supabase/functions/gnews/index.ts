// supabase/functions/gnews/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cât timp e considerat proaspăt un răspuns cache-uit. Ştirile agricole nu se
// schimbă de la minut la minut, iar planul gratuit GNews are cotă zilnică mică
// plus protecţie anti-burst — 30 de minute ţine consumul upstream la ~48
// apeluri/zi indiferent de câţi utilizatori deschid tabul.
const CACHE_TTL_MS = 30 * 60 * 1000;

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ✅ HEALTH CHECK — public, fără auth
  const requestUrl = new URL(req.url);
  if (req.method === "HEAD" || requestUrl.pathname.endsWith("/health")) {
    return jsonResponse({ status: "ok" });
  }

  // ✅ AUTH CHECK — verifică că request-ul vine de la un user autentificat
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn("Unauthorized request — missing Authorization header.");
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );

  if (authError || !user) {
    console.warn("Unauthorized request — invalid token.");
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  // ✅ END AUTH CHECK

  if (!(await checkRateLimit("gnews", user.id, 20, 60))) {
    return rateLimitResponse(corsHeaders);
  }

  let requestBody: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) requestBody = JSON.parse(text);
  } catch {
    console.warn("JSON parsing failed, using default params.");
  }

  const q = String(requestBody.q ?? "agricultura");
  const lang = String(requestBody.lang ?? "ro");
  const max = Number(requestBody.max) || 10;
  const cacheKey = `${lang}|${max}|${q}`;

  // Clientul de cache foloseşte service_role: news_cache are RLS pornit şi
  // nicio politică, deci e inaccesibil oricui altcuiva (inclusiv clientului).
  const cacheDb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Un rând expirat rămâne util: dacă GNews pică sau ne limitează, îl servim
  // în loc să spargem tabul cu o eroare.
  let stalePayload: unknown = null;
  try {
    const { data, error } = await cacheDb
      .from("news_cache")
      .select("payload, fetched_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error) {
      console.error("news_cache read failed:", error.message);
    } else if (data) {
      const age = Date.now() - new Date(data.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return jsonResponse(data.payload, 200, { "X-Cache": "hit" });
      }
      stalePayload = data.payload;
    }
  } catch (err) {
    // Cache-ul e o optimizare, nu o dependenţă — dacă pică, mergem upstream.
    console.error("news_cache read threw:", (err as Error).message);
  }

  try {
    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      console.error("Missing GNEWS_API_KEY.");
      throw new Error("Server configuration error: missing API key.");
    }

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=${
      encodeURIComponent(lang)
    }&max=${max}&apikey=${apiKey}`;

    console.log(`Calling GNews: ${url.replace(apiKey, "HIDDEN_KEY")}`);

    const gnewsRes = await fetch(url);
    const data = await gnewsRes.json();

    if (!gnewsRes.ok) {
      console.error("GNews error:", data);
      if (stalePayload) {
        // Cotă depăşită / GNews indisponibil, dar avem conţinut vechi: mai bine
        // ştiri de acum câteva ore decât un ecran de eroare.
        console.log("Serving stale news_cache entry after upstream failure.");
        return jsonResponse(stalePayload, 200, { "X-Cache": "stale" });
      }
      return jsonResponse(data, 400);
    }

    const { error: writeError } = await cacheDb
      .from("news_cache")
      .upsert({ cache_key: cacheKey, payload: data, fetched_at: new Date().toISOString() });
    if (writeError) console.error("news_cache write failed:", writeError.message);

    return jsonResponse(data, 200, { "X-Cache": "miss" });
  } catch (error) {
    console.error("CRITICAL ERROR:", (error as Error).message);
    if (stalePayload) {
      return jsonResponse(stalePayload, 200, { "X-Cache": "stale" });
    }
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
