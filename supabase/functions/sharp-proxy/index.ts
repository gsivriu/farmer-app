const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARP_BASE_URL = "https://sharpwebapi.ameropa.ro";

async function getSharpToken(): Promise<string> {
  const userName = Deno.env.get("SHARP_API_USER");
  const password = Deno.env.get("SHARP_API_PASS");

  if (!userName || !password) {
    throw new Error("SHARP_API_USER or SHARP_API_PASS secrets not configured");
  }

  const response = await fetch(`${SHARP_BASE_URL}/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ userName, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sharp auth failed (${response.status}): ${body}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    // Common JWT response shapes
    const token = data?.token ?? data?.access_token ?? data?.Token ?? data?.accessToken;
    if (!token) throw new Error("Sharp token not found in response: " + JSON.stringify(data));
    return token;
  }

  // Plain text token
  return (await response.text()).trim().replace(/^"|"$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sharpPath = url.searchParams.get("path");

    if (!sharpPath) {
      return new Response(JSON.stringify({ error: 'Missing "path" query parameter' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ping: only test authentication, don't call any Sharp endpoint
    if (sharpPath === "/ping") {
      const token = await getSharpToken();
      return new Response(
        JSON.stringify({ ok: true, message: "Sharp authentication successful", tokenLength: token.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getSharpToken();

    // Forward any extra query params (except "path") to Sharp
    const forwardParams = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (key !== "path") forwardParams.append(key, value);
    }
    const sharpUrl =
      `${SHARP_BASE_URL}${sharpPath}` +
      (forwardParams.size > 0 ? `?${forwardParams.toString()}` : "");

    const sharpResponse = await fetch(sharpUrl, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    const responseText = await sharpResponse.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return new Response(JSON.stringify(responseData), {
      status: sharpResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sharp-proxy error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
