import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const host = Deno.env.get("AMEROPA_DB_HOST");
  const username = Deno.env.get("AMEROPA_DB_USER");
  const password = Deno.env.get("AMEROPA_DB_PASS");
  const db = Deno.env.get("AMEROPA_DB_NAME");

  try {
    const client = await new Client().connect({
      hostname: host,
      username,
      password,
      db,
    });

    const result = await client.execute("SELECT 1 AS connected");
    await client.close();

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
