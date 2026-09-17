#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import { parsePrompt } from "./prompt.js";
import { sendPrompt } from "./gemini.js";

const help = `Klipp — a terminal coding agent

Usage: klipp [options] ["prompt"]

Options:
  -h, --help     Show this help message
  -v, --version  Show the installed version
  --check-config Check that a Gemini API key is configured (no API request)

Examples:
  klipp "Explain what this repository does"
  klipp -- "--explain this flag"

Sends one prompt to Gemini and prints the completed response.
Set GEMINI_API_KEY; optionally set GEMINI_MODEL (default: gemini-3.8-flash).
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      "check-config": { type: "boolean" },
    },
    strict: true,
    allowPositionals: true,
  });

  if (
    values.help ||
    (!values.version && !values["check-config"] && positionals.length === 0)
  ) {
    process.stdout.write(help);
    return;
  }

  if (!values.version && !values["check-config"]) {
    const prompt = parsePrompt(positionals);
    const response = await sendPrompt(loadConfig(), prompt);
    process.stdout.write(`${response}\n`);
    return;
  }

  if (values["check-config"] && !values.version) {
    loadConfig();
    process.stdout.write(
      "Gemini API key is configured. No API request was made; key validity and quota have not been checked.\n",
    );
    return;
  }

  const metadata: unknown = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("version" in metadata) ||
    typeof metadata.version !== "string"
  ) {
    throw new Error("Package metadata does not contain a valid version.");
  }
  process.stdout.write(`${metadata.version}\n`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`klipp: ${message}\nRun klipp --help for usage.\n`);
  process.exitCode = 1;
}
