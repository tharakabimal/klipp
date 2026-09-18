import assert from "node:assert/strict";
import { test } from "node:test";
import { streamPrompt } from "../dist/gemini.js";

import { collect, sse } from "./stream-helpers.js";
const sendPrompt = (...args) => collect(streamPrompt(...args));

const config = {
  provider: "gemini",
  apiKey: "fake-test-secret",
  model: "gemini-3.8-flash",
};
const completed = {
  candidates: [
    {
      content: { role: "model", parts: [{ text: "Hello from Gemini" }] },
      finishReason: "STOP",
    },
  ],
};

test("SDK sends the exact prompt and configured model with the API key header", async () => {
  let calls = 0;
  const prompt = "  Explain café ☕\nwith examples  ";
  const text = await sendPrompt(config, prompt, async (url, options) => {
    calls++;
    assert.equal(new URL(url).hostname, "generativelanguage.googleapis.com");
    assert.match(
      String(url),
      /gemini-3\.8-flash:streamGenerateContent\?alt=sse$/,
    );
    assert.equal(options.method, "POST");
    assert.equal(
      new Headers(options.headers).get("x-goog-api-key"),
      config.apiKey,
    );
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[0].text, prompt);
    return sse(completed);
  });
  assert.equal(calls, 1);
  assert.equal(text, "Hello from Gemini");
});

test("API failures are actionable, redact secrets, and do not retry", async () => {
  for (const [status, expected] of [
    [400, /rejected/],
    [401, /rejected/],
    [403, /rejected/],
    [404, /model not found/],
    [429, /quota or rate limit/],
    [408, /timed out \(HTTP 408\)/],
    [500, /service error \(HTTP 500\)/],
    [502, /service error \(HTTP 502\)/],
    [503, /service error \(HTTP 503\)/],
    [504, /timed out \(HTTP 504\)/],
    [418, /request failed \(HTTP 418\)/],
  ]) {
    let calls = 0;
    await assert.rejects(
      sendPrompt(config, "Hello", async () => {
        calls++;
        return Response.json(
          { error: { code: status, message: config.apiKey } },
          { status },
        );
      }),
      (error) => {
        assert.match(error.message, expected);
        assert.ok(!error.message.includes(config.apiKey));
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});

test("network failures do not expose raw error details", async () => {
  await assert.rejects(
    sendPrompt(config, "Hello", async () => {
      throw new Error(config.apiKey);
    }),
    (error) => {
      assert.match(error.message, /Check your connection/);
      assert.ok(!error.message.includes(config.apiKey));
      return true;
    },
  );
});

test("blocked, empty, and incomplete responses are reported as failures", async () => {
  for (const [body, expected] of [
    [{ promptFeedback: { blockReason: "SAFETY" } }, /blocked/],
    [{ candidates: [] }, /no text/],
    [
      {
        candidates: [
          {
            content: { parts: [{ text: "partial" }] },
            finishReason: "MAX_TOKENS",
          },
        ],
      },
      /did not complete/,
    ],
  ]) {
    await assert.rejects(
      sendPrompt(config, "Hello", async () => sse(body)),
      expected,
    );
  }
});
