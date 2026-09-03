// Shared rate-limit helper for Edge Functions. Backed by the `rate_limits`
// Postgres table + `check_rate_limit()` RPC — a single source of truth
// across all function instances, unlike an in-memory Map (which does not
// sync between concurrently running instances).
//
// `check_rate_limit` is not exposed to anon/authenticated — this always
// calls it through a service_role client, so key/limit/window can't be
// spoofed by an untrusted caller. Folders prefixed with `_` (like this one)
// are not deployed as their own function; only imported by others.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Returns true if the call is allowed, false if the bucket is over limit.
 * Fails open (returns true) if the rate limiter itself is unreachable —
 * an infra hiccup on `rate_limits` should not take down the feature it's
 * protecting.
 */
export async function checkRateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: `${bucket}:${identity}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error(`rate limit check failed for ${bucket}:${identity}:`, error.message);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error(`rate limit check threw for ${bucket}:${identity}:`, (err as Error).message);
    return true;
  }
}

/** Best-effort caller IP for functions with no authenticated user to key by. */
export function clientIdentity(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Prea multe cereri. Încearcă din nou peste puțin timp." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
