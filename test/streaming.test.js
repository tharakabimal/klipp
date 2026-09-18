import assert from "node:assert/strict";
import { test } from "node:test";
import { streamPrompt } from "../dist/provider.js";
import { printResponse } from "../dist/output.js";
import { collect, sse } from "./stream-helpers.js";

for (const provider of ["gemini", "openai"]) {
  const config = { provider, apiKey: "fake-secret", model: "test-model" };
  const delta = (text) =>
    provider === "gemini"
      ? { candidates: [{ content: { parts: [{ text }] } }] }
      : { type: "response.output_text.delta", delta: text };
  const done =
    provider === "gemini"
      ? { candidates: [{ finishReason: "STOP" }] }
      : { type: "response.completed" };

  test(
    provider + " emits text while the network stream is still open",
    async () => {
      let controller;
      const response = new Response(
        new ReadableStream({
          start(value) {
            controller = value;
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      );
      const push = (event) =>
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      const chunks = streamPrompt(config, "hello", async () => response);
      push(delta("Hello"));
      assert.deepEqual(await chunks.next(), { value: "Hello", done: false });
      push(delta(""));
      push(delta(" café ☕"));
      push(done);
      controller.close();
      assert.equal(await collect(chunks), " café ☕");
    },
  );

  test(
    provider + " rejects truncated streams and redacts midstream failures",
    async () => {
      await assert.rejects(
        collect(
          streamPrompt(config, "hello", async () => sse(delta("partial"))),
        ),
        /ended before/,
      );
      let controller;
      const response = new Response(
        new ReadableStream({
          start(value) {
            controller = value;
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      );
      const chunks = streamPrompt(config, "hello", async () => response);
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify(delta("partial"))}\n\n`,
        ),
      );
      assert.equal((await chunks.next()).value, "partial");
      controller.error(new Error("fake-secret"));
      await assert.rejects(
        chunks.next(),
        (error) => !error.message.includes("fake-secret"),
      );
    },
  );
}

test("terminal writes chunks immediately and adds only a final newline", async () => {
  const writes = [];
  async function* chunks() {
    yield "Hello";
    assert.deepEqual(writes, ["Hello"]);
    yield "";
    yield " world";
  }
  await printResponse(chunks(), (text) => writes.push(text));
  assert.deepEqual(writes, ["Hello", " world", "\n"]);
});

test("terminal preserves partial output and reports an interrupted response", async () => {
  const writes = [];
  async function* chunks() {
    yield "partial";
    throw new Error("private transport details");
  }
  await assert.rejects(
    printResponse(chunks(), (text) => writes.push(text)),
    /interrupted/,
  );
  assert.deepEqual(writes, ["partial", "\n"]);
});

test("failure before text preserves the provider error without stdout output", async () => {
  const writes = [];
  async function* chunks() {
    throw new Error("Gemini service error (HTTP 503)");
  }
  await assert.rejects(
    printResponse(chunks(), (text) => writes.push(text)),
    /HTTP 503/,
  );
  assert.deepEqual(writes, []);
});
