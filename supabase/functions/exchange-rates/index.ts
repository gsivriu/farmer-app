import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  try {
    const [resEur, resUsd] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/EUR"),
      fetch("https://open.er-api.com/v6/latest/USD"),
    ]);

    if (!resEur.ok || !resUsd.ok) {
      throw new Error(`API error: EUR=${resEur.status} USD=${resUsd.status}`);
    }

    const [dataEur, dataUsd] = await Promise.all([
      resEur.json(),
      resUsd.json(),
    ]);

    if (!dataEur?.rates || !dataUsd?.rates) {
      throw new Error("Date incomplete de la API");
    }

    const result = {
      ronToEur: dataEur.rates.RON,
      ronToUsd: dataUsd.rates.RON,
      eurToUsd: dataEur.rates.USD,
      lastUpdated: dataEur.time_last_update_utc?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Eroare fetch exchange rates:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
