// supabase/functions/gnews/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("--- START GNEWS FUNCTION ---");

    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      console.error("EROARE: Lipsește GNEWS_API_KEY din Secrets");
      throw new Error("Server configuration error: Missing API Key");
    }

    let body;
    try {
      body = await req.json();
    } catch (err) {
      console.error("Eroare la parsarea JSON:", err);
      throw new Error("Invalid JSON body");
    }

    const { q, lang, max } = body || {};
    console.log(`Cautare pentru: ${q}, Limba: ${lang}`);

    const queryTerm = encodeURIComponent(q || "agricultura");
    const url = `https://gnews.io/api/v4/search?q=${queryTerm}&lang=${
      lang || "ro"
    }&max=${max || 10}&apikey=${apiKey}`;

    const apiRes = await fetch(url);
    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error("GNews a returnat eroare:", data);
      return new Response(
        JSON.stringify({
          error: data.errors || "Eroare de la furnizorul de știri",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Succes! S-au găsit ${data.articles?.length || 0} articole.`);
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
