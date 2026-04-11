import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
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
