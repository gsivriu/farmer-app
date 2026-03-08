#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [mode, maybeUrl] = process.argv.slice(2);
const configPath = path.resolve(process.cwd(), "capacitor.config.json");

function printUsageAndExit() {
  console.error(
    [
      "Usage:",
      "  npm run cap:live:on -- https://your-live-url.example",
      "  npm run cap:live:off",
    ].join("\n")
  );
  process.exit(1);
}

function normalizeHttpsUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error("Missing URL. Pass a HTTPS URL after `cap:live:on --`.");
  }

  const trimmed = String(rawUrl).trim();
  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Only HTTPS URLs are allowed for TestFlight live mode. Received: ${trimmed}`
    );
  }

  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

async function readConfig() {
  const content = await readFile(configPath, "utf8");
  return JSON.parse(content);
}

async function writeConfig(config) {
  const serialized = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, serialized, "utf8");
}

async function main() {
  if (!mode || (mode !== "enable" && mode !== "disable")) {
    printUsageAndExit();
  }

  const config = await readConfig();

  if (mode === "enable") {
    const liveUrl = normalizeHttpsUrl(maybeUrl);
    config.server = {
      url: liveUrl,
      cleartext: false,
    };
    await writeConfig(config);
    console.log(`Live mode enabled with URL: ${liveUrl}`);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(config, "server")) {
    delete config.server;
  }

  await writeConfig(config);
  console.log("Live mode disabled. App will load bundled web assets.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
