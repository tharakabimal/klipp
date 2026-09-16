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
  for (const argument of ["--unknown", "hello"]) {
    const result = run(argument);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Run klipp --help/);
    assert.doesNotMatch(result.stderr, /at main/);
  }
});
