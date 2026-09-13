import { execSync } from 'node:child_process'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Identifies exactly which commit a running client was built from. The
// TestFlight login loop cost three days because there was no way to tell
// "the fix isn't deployed" apart from "the device is running a bundle from
// before the fix" — a device on stale cached HTML (or on assets frozen into
// an old IPA) looks identical to a broken deploy from the server side.
function resolveBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  }
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'import.meta.env.APP_BUILD_ID': JSON.stringify(resolveBuildId()),
    'import.meta.env.APP_BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      // @capacitor/push-notifications is a native-only package — not available
      // on Vercel (web build). Externalizing it prevents Rollup from trying to
      // resolve it. The hook guards all usage with Capacitor.isNativePlatform()
      // so this import is never reached in the web environment.
      external: ['@capacitor/push-notifications'],
    },
  },
})
