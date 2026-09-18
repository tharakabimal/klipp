#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import { printResponse } from "./output.js";
import { parsePrompt } from "./prompt.js";
import { streamPrompt } from "./provider.js";

const help = `Klipp — a terminal coding agent

Usage: klipp [options] ["prompt"]

Options:
  -h, --help     Show this help message
  -v, --version  Show the installed version
  --check-config Check provider credentials are configured (no API request)

Examples:
  klipp "Explain what this repository does"
  klipp -- "--explain this flag"

Sends one prompt to the selected provider and prints response chunks as they arrive.
Default: Gemini, gemini-3.8-flash. Set GEMINI_API_KEY; optionally GEMINI_MODEL.
To use OpenAI, set KLIPP_PROVIDER=openai and OPENAI_API_KEY.
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
    await printResponse(streamPrompt(loadConfig(), prompt));
    return;
  }

  if (values["check-config"] && !values.version) {
    const config = loadConfig();
    process.stdout.write(
      `${config.provider === "openai" ? "OpenAI" : "Gemini"} API key is configured. No API request was made; key validity and quota have not been checked.\n`,
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
