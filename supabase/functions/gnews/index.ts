// supabase/functions/gnews/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  console.log("REQUEST RECEIVED - function started.");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ✅ HEALTH CHECK — public, fără auth
  const requestUrl = new URL(req.url);
  if (req.method === "HEAD" || requestUrl.pathname.endsWith("/health")) {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ✅ AUTH CHECK — verifică că request-ul vine de la un user autentificat
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.warn("Unauthorized request — missing Authorization header.");
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
    console.warn("Unauthorized request — invalid token.");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // ✅ END AUTH CHECK

  try {
    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      console.error("Missing GNEWS_API_KEY.");
      throw new Error("Server configuration error: missing API key.");
    }

    let requestBody = {};
    try {
      const text = await req.text();
      if (text) requestBody = JSON.parse(text);
    } catch (err) {
      console.warn("JSON parsing failed, using default params.");
    }

    const { q, lang, max } = requestBody;

    const searchTerm = encodeURIComponent(q || "agricultura");
    const url = `https://gnews.io/api/v4/search?q=${searchTerm}&lang=${
      lang || "ro"
    }&max=${max || 10}&apikey=${apiKey}`;

    console.log(`Calling GNews: ${url.replace(apiKey, "HIDDEN_KEY")}`);

    const gnewsRes = await fetch(url);
    const data = await gnewsRes.json();

    if (!gnewsRes.ok) {
      console.error("GNews error:", data);
      return new Response(JSON.stringify(data), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("CRITICAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});