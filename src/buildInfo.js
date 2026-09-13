// Build stamp injected by vite.config.js at build time. Read it to answer
// "which code is this device actually running?" without a debugger — see the
// version line on the login screen and the auth_debug_logs rows.
export const BUILD_ID = import.meta.env.APP_BUILD_ID ?? "dev";
export const BUILD_TIME = import.meta.env.APP_BUILD_TIME ?? null;

// Short, human-readable stamp for the login screen, e.g. "47ff0d8 · 10.09".
export function buildStamp() {
  if (!BUILD_TIME) return BUILD_ID;
  const d = new Date(BUILD_TIME);
  if (Number.isNaN(d.getTime())) return BUILD_ID;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${BUILD_ID} · ${dd}.${mm}`;
}
