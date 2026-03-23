import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const client = new Client();

  try {
    await client.connect({
      hostname: Deno.env.get("AMEROPA_DB_HOST")!,
      username: Deno.env.get("AMEROPA_DB_USER")!,
      password: Deno.env.get("AMEROPA_DB_PASS")!,
      db:       Deno.env.get("AMEROPA_DB_NAME")!,
    });

    await client.execute("SELECT 1");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    try { await client.close(); } catch (_) { /* ignore */ }
  }
});
