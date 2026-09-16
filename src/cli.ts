#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const help = `Klipp — a terminal coding agent

Usage: klipp [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show the installed version

This is the initial CLI scaffold. Model conversations are coming next.
`;

function main(): void {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help || !values.version) {
    process.stdout.write(help);
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
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`klipp: ${message}\nRun klipp --help for usage.\n`);
  process.exitCode = 1;
}
