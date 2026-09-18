import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { loadConfig } from "../dist/config.js";

const entry = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

test("configuration rejects missing and blank keys", () => {
  for (const env of [{}, { GEMINI_API_KEY: "" }, { GEMINI_API_KEY: "  " }]) {
    assert.throws(() => loadConfig(env), /GEMINI_API_KEY is missing or empty/);
  }
});

test("configuration reads the Gemini key and trims surrounding whitespace", () => {
  assert.deepEqual(loadConfig({ GEMINI_API_KEY: " fake-test-key \n" }), {
    provider: "gemini",
    apiKey: "fake-test-key",
    model: "gemini-3.8-flash",
  });
});

test("model can be overridden through the environment", () => {
  assert.equal(
    loadConfig({ GEMINI_API_KEY: "fake", GEMINI_MODEL: " custom-model " })
      .model,
    "custom-model",
  );
});

test("CLI loads an explicit env file without printing its key", () => {
  const directory = mkdtempSync(join(tmpdir(), "klipp-config-"));
  try {
    writeFileSync(join(directory, ".env"), "GEMINI_API_KEY=fake-file-secret\n");
    const env = { ...process.env, KLIPP_PROVIDER: "gemini" };
    delete env.GEMINI_API_KEY;
    const result = spawnSync(
      process.execPath,
      ["--env-file=.env", entry, "--check-config"],
      { cwd: directory, env, encoding: "utf8", timeout: 5000 },
    );
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Gemini API key is configured/);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout + result.stderr, /fake-file-secret/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("missing credentials fail config checks but do not block help or version", () => {
  const env = { ...process.env, KLIPP_PROVIDER: "gemini", GEMINI_API_KEY: "" };
  for (const flag of ["--check-config", "--help", "--version"]) {
    const result = spawnSync(process.execPath, [entry, flag], {
      env,
      encoding: "utf8",
      timeout: 5000,
    });
    assert.equal(result.status, flag === "--check-config" ? 1 : 0);
    if (flag === "--check-config") {
      assert.match(result.stderr, /GEMINI_API_KEY is missing or empty/);
    }
  }
});
