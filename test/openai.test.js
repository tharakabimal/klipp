import assert from "node:assert/strict";
import { test } from "node:test";
import { streamPrompt } from "../dist/provider.js";
import { loadConfig } from "../dist/config.js";
import { collect, sse } from "./stream-helpers.js";
const sendPrompt = (...args) => collect(streamPrompt(...args));

const config = loadConfig({
  KLIPP_PROVIDER: "openai",
  OPENAI_API_KEY: "fake-secret",
});
const completed = {
  id: "resp_test",
  object: "response",
  status: "completed",
  output: [
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text: "Connected", annotations: [] }],
    },
  ],
};

test("OpenAI selection sends exact prompt with isolated credentials", async () => {
  const text = await sendPrompt(
    config,
    " Hello\nworld ",
    async (url, options) => {
      assert.equal(String(url), "https://api.openai.com/v1/responses");
      assert.equal(
        new Headers(options.headers).get("authorization"),
        "Bearer fake-secret",
      );
      assert.deepEqual(JSON.parse(options.body), {
        model: "gpt-4.1-mini",
        input: " Hello\nworld ",
        store: false,
        stream: true,
      });
      return sse(
        { type: "response.output_text.delta", delta: "Connected" },
        { type: "response.completed", response: completed },
      );
    },
  );
  assert.equal(text, "Connected");
});

test("OpenAI errors expose status but not credentials and do not retry", async () => {
  for (const status of [400, 401, 403, 404, 429, 500, 503]) {
    let calls = 0;
    await assert.rejects(
      sendPrompt(config, "Hello", async () => {
        calls++;
        return Response.json({ error: { message: "fake-secret" } }, { status });
      }),
      (error) => {
        assert.ok(error.message.includes(String(status)));
        assert.ok(!error.message.includes("fake-secret"));
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});

test("OpenAI rejects incomplete and empty results", async () => {
  for (const response of [
    { status: "incomplete", output: [] },
    { status: "completed", output: [] },
  ]) {
    await assert.rejects(
      sendPrompt(config, "Hello", async () =>
        sse({ type: "response." + response.status, response }),
      ),
      /did not complete|no text/,
    );
  }
});

test("provider configuration selects only its own key and model", async () => {
  const env = {
    OPENAI_API_KEY: "openai-secret",
    GEMINI_API_KEY: "gemini-secret",
    GEMINI_MODEL: "custom-gemini",
  };
  assert.equal(
    loadConfig({ ...env, KLIPP_PROVIDER: "openai" }).apiKey,
    "openai-secret",
  );
  const gemini = loadConfig({ ...env, KLIPP_PROVIDER: "gemini" });
  assert.equal(gemini.apiKey, "gemini-secret");
  assert.equal(gemini.model, "custom-gemini");
  assert.throws(
    () =>
      loadConfig({ KLIPP_PROVIDER: "openai", GEMINI_API_KEY: "gemini-secret" }),
    /OPENAI_API_KEY/,
  );
  assert.throws(
    () => loadConfig({ ...env, KLIPP_PROVIDER: "invalid" }),
    /KLIPP_PROVIDER/,
  );
  const result = await sendPrompt(gemini, "hello", async (url) => {
    assert.equal(new URL(url).hostname, "generativelanguage.googleapis.com");
    return sse({
      candidates: [
        {
          content: { parts: [{ text: "Gemini works" }] },
          finishReason: "STOP",
        },
      ],
    });
  });
  assert.equal(result, "Gemini works");
});
