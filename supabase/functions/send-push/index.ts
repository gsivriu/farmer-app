import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// APNs JWT — generated once per cold start, refreshed before 55-min expiry
// ---------------------------------------------------------------------------
let apnsTokenCache: { token: string; generatedAt: number } | null = null;

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (apnsTokenCache && now - apnsTokenCache.generatedAt < 55 * 60) {
    return apnsTokenCache.token;
  }

  const teamId  = Deno.env.get("APNS_TEAM_ID")!;
  const keyId   = Deno.env.get("APNS_KEY_ID")!;
  const p8      = Deno.env.get("APNS_PRIVATE_KEY")!;

  // Build header + payload
  const header  = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const encode  = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import the ES256 private key from PEM
  const pem = p8
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const token = `${signingInput}.${sig64}`;
  apnsTokenCache = { token, generatedAt: now };
  return token;
}

// ---------------------------------------------------------------------------
// Send one notification to one device token
// Returns true on success, "gone" if token is stale, false on other error
// ---------------------------------------------------------------------------
async function sendToToken(
  deviceToken: string,
  bundleId: string,
  jwt: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ outcome: "ok" | "gone" | "error"; apnsStatus?: number; apnsError?: string }> {
  const apnsHost = "https://api.push.apple.com";
  const url = `${apnsHost}/3/device/${deviceToken}`;

  const apnsPayload = {
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
    ...data,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-id": crypto.randomUUID(),
      "content-type": "application/json",
    },
    body: JSON.stringify(apnsPayload),
  });

  if (res.status === 200) return { outcome: "ok" };
  if (res.status === 410) return { outcome: "gone" }; // token no longer valid
  const errBody = await res.text().catch(() => "");
  console.error(`APNs ${res.status} for token ${deviceToken.slice(0, 8)}…: ${errBody}`);
  return { outcome: "error", apnsStatus: res.status, apnsError: errBody };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const bundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "com.gsivriu.farmerapp";

    const { user_ids, title, body, data = {} } = await req.json() as {
      user_ids: string[];
      title: string;
      body: string;
      data?: Record<string, string>;
    };

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: "user_ids required" }), { status: 400 });
    }

    // Fetch device tokens for the requested users
    const { data: rows, error: dbErr } = await supabaseAdmin
      .from("device_tokens")
      .select("user_id, token")
      .in("user_id", user_ids);

    if (dbErr) throw dbErr;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: "no_tokens" }), { status: 200 });
    }

    const jwt = await getApnsJwt();

    // Fan-out — one push per token, failures isolated
    const results = await Promise.allSettled(
      rows.map(async (row: { user_id: string; token: string }) => {
        const result = await sendToToken(row.token, bundleId, jwt, title, body, data);

        if (result.outcome === "gone") {
          // Stale token — remove from DB so we don't keep sending
          await supabaseAdmin
            .from("device_tokens")
            .delete()
            .eq("user_id", row.user_id)
            .eq("token", row.token);
        }

        return { user_id: row.user_id, ...result };
      }),
    );

    const errors: Array<{ apnsStatus?: number; apnsError?: string }> = [];
    const summary = results.reduce(
      (acc, r) => {
        if (r.status === "fulfilled") {
          acc[r.value.outcome] = (acc[r.value.outcome] ?? 0) + 1;
          if (r.value.outcome === "error") {
            errors.push({ apnsStatus: r.value.apnsStatus, apnsError: r.value.apnsError });
          }
        } else {
          acc["error"] = (acc["error"] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const responseBody: Record<string, unknown> = { sent: summary.ok ?? 0, ...summary };
    if (errors.length > 0) responseBody.apns_errors = errors;
    return new Response(JSON.stringify(responseBody), { status: 200 });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
