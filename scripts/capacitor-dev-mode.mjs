#!/usr/bin/env node

import os from "node:os";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const [mode, maybeUrl] = process.argv.slice(2);
const configPath = path.resolve(process.cwd(), "capacitor.config.json");
const defaultPort = 5173;

function printUsageAndExit() {
  console.error(
    [
      "Usage:",
      "  npm run cap:dev:on",
      "  npm run cap:dev:on -- http://192.168.1.10:5173",
      "  npm run cap:dev:off",
    ].join("\n")
  );
  process.exit(1);
}

function pickLocalIPv4() {
  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    for (const address of iface || []) {
      if (
        address &&
        address.family === "IPv4" &&
        !address.internal &&
        (
          address.address.startsWith("192.168.") ||
          address.address.startsWith("10.") ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(address.address)
        )
      ) {
        return address.address;
      }
    }
  }

  throw new Error(
    "Could not detect a private IPv4 address. Pass URL manually: npm run cap:dev:on -- http://<your-ip>:5173"
  );
}

function normalizeDevUrl(rawUrl) {
  if (!rawUrl) {
    const ip = pickLocalIPv4();
    return `http://${ip}:${defaultPort}`;
  }

  const trimmed = String(rawUrl).trim();
  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  parsed.hash = "";
  parsed.search = "";
  if (!parsed.port) {
    parsed.port = String(defaultPort);
  }

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
    const devUrl = normalizeDevUrl(maybeUrl);
    config.server = {
      url: devUrl,
      cleartext: devUrl.startsWith("http://"),
    };
    await writeConfig(config);
    console.log(`Dev mode enabled with URL: ${devUrl}`);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(config, "server")) {
    delete config.server;
  }

  await writeConfig(config);
  console.log("Dev mode disabled.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
