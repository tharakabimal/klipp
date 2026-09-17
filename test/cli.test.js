import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const entry = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

function run(...args) {
  return spawnSync(process.execPath, [entry, ...args], {
    encoding: "utf8",
    cwd: tmpdir(),
    timeout: 5000,
    env: { ...process.env, GEMINI_API_KEY: "" },
  });
}

test("help works outside the installation directory", () => {
  for (const args of [[], ["--help"], ["-h"]]) {
    const result = run(...args);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: klipp/);
    assert.equal(result.stderr, "");
  }
});

test("version matches package metadata", () => {
  for (const flag of ["--version", "-v"]) {
    const result = run(flag);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), version);
    assert.equal(result.stderr, "");
  }
});

test("unsupported arguments fail clearly without a stack trace", () => {
  for (const argument of ["--unknown", "-x"]) {
    const result = run(argument);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Run klipp --help/);
    assert.doesNotMatch(result.stderr, /at main/);
  }
});

test("a valid prompt requires credentials before making a model request", () => {
  for (const prompt of [
    "hello",
    "Explain this repository",
    "  Keep\nthis spacing  ",
    "Explain café ☕",
  ]) {
    const result = run(prompt);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /GEMINI_API_KEY is missing or empty/);
  }
});

test("blank prompts are rejected", () => {
  for (const prompt of ["", " \t\n "]) {
    const result = run(prompt);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /prompt cannot be empty/);
  }
});

test("multiple arguments explain how to quote the prompt", () => {
  const result = run("Explain", "this", "repository");
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /one prompt wrapped in quotes/);
});

test("option terminator allows a prompt starting with a dash", () => {
  const result = run("--", "--explain this flag");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GEMINI_API_KEY is missing or empty/);
});

test("help and version take precedence over prompt input", () => {
  const help = run("--help", "hello");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: klipp/);
  assert.doesNotMatch(help.stdout, /Prompt received:/);
  const result = run("--version", "hello");
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), version);
});
