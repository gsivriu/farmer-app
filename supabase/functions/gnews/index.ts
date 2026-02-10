// supabase/functions/gnews/index.ts

// Define CORS headers manually.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use native Deno.serve (no external imports required).
Deno.serve(async (req) => {
  // 1. Log request start for quick diagnostics.
  console.log("REQUEST RECEIVED - function started.");

  // 2. Handle browser preflight requests.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 3. Validate API key.
    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      console.error("Missing GNEWS_API_KEY.");
      throw new Error("Server configuration error: missing API key.");
    }

    // 4. Parse request body safely.
    let requestBody = {};
    try {
      const text = await req.text();
      if (text) requestBody = JSON.parse(text);
    } catch (err) {
      console.warn("JSON parsing failed, using default params.");
    }

    const { q, lang, max } = requestBody;

    // 5. Build URL and call GNews.
    const searchTerm = encodeURIComponent(q || "agricultura");
    const url = `https://gnews.io/api/v4/search?q=${searchTerm}&lang=${
      lang || "ro"
    }&max=${max || 10}&apikey=${apiKey}`;

    console.log(`Calling GNews: ${url.replace(apiKey, "HIDDEN_KEY")}`);

    const gnewsRes = await fetch(url);
    const data = await gnewsRes.json();

    // 6. Return response.
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
    // Catch any internal error and return a clear message.
    console.error("CRITICAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
