// supabase/functions/gnews/index.ts

// Definim headerele CORS manual
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Folosim Deno.serve nativ (fără importuri externe care pot eșua)
Deno.serve(async (req) => {
  // 1. Logăm imediat ce primim cererea pentru a confirma că serverul e viu
  console.log("REQUEST PRIMIT - Funcția a pornit!");

  // 2. Gestionăm cererile de tip OPTIONS (verificarea browserului)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 3. Verificăm cheia API
    const apiKey = Deno.env.get("GNEWS_API_KEY");
    if (!apiKey) {
      console.error("Lipsește GNEWS_API_KEY!");
      throw new Error("Serverul nu are cheia API configurată.");
    }

    // 4. Citim datele trimise (cu protecție la erori de parsare)
    let requestBody = {};
    try {
      const text = await req.text();
      if (text) requestBody = JSON.parse(text);
    } catch (err) {
      console.warn("Nu s-a putut parsa JSON-ul, folosim parametri default.");
    }

    const { q, lang, max } = requestBody;

    // 5. Construim URL-ul și apelăm GNews
    const searchTerm = encodeURIComponent(q || "agricultura");
    const url = `https://gnews.io/api/v4/search?q=${searchTerm}&lang=${
      lang || "ro"
    }&max=${max || 10}&apikey=${apiKey}`;

    console.log(`Apelăm GNews: ${url.replace(apiKey, "HIDDEN_KEY")}`);

    const gnewsRes = await fetch(url);
    const data = await gnewsRes.json();

    // 6. Returnăm rezultatul
    if (!gnewsRes.ok) {
      console.error("Eroare GNews:", data);
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
    // Prindem orice eroare internă și o afișăm clar
    console.error("EROARE CRITICĂ:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
