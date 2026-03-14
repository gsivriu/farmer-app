# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## TestFlight Live Mode (Capacitor)

This project includes a toggle for loading the app from a remote HTTPS URL in Capacitor, so you can update code without making a new iOS build each time.

1. Enable live mode with your deployed web URL:

```bash
npm run cap:live:on -- https://your-live-url.example
npm run cap:sync:ios
```

2. Create one new TestFlight build with this config (only once to switch to live mode).
3. After that, keep deploying web changes to the same URL; the TestFlight app will pick them up on relaunch.
4. When you finish editing, switch back to bundled assets and create the final build:

```bash
npm run cap:live:off
npm run build
npm run cap:sync:ios
```

## Instant Dev Mode On iPhone (Hot Reload, No Deploy)

Use this when you want local code changes to appear instantly on iPhone while developing.

1. Enable dev mode (auto-detects your local network IP):

```bash
npm run cap:dev:on
npm run cap:sync:ios
```

2. Start local Vite server (must stay running):

```bash
npm run dev:host:5173
```

3. Open iOS project and run from Xcode on your iPhone:

```bash
npm run cap:open:ios
```

4. Keep Mac and iPhone on the same Wi-Fi network.
5. Edit and save files in `src/*`; app updates instantly via HMR.

When you finish local dev and want TestFlight mode back:

```bash
npm run cap:live:on -- https://farmer-app-six.vercel.app
npm run cap:sync:ios
```
