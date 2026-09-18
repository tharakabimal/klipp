import OpenAI from "openai";
import type { Config } from "./config.js";

export async function* streamPrompt(
  config: Config,
  prompt: string,
  fetchImplementation: typeof fetch = globalThis.fetch,
): AsyncGenerator<string> {
  let hasText = false;
  let completed = false;
  try {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.openai.com/v1",
      timeout: 60_000,
      maxRetries: 0,
      fetch: fetchImplementation,
    });
    const stream = await client.responses.create({
      model: config.model,
      input: prompt,
      store: false,
      stream: true,
    });
    for await (const event of stream) {
      if (event.type === "response.output_text.delta" && event.delta) {
        hasText ||= Boolean(event.delta.trim());
        yield event.delta;
      } else if (event.type === "response.completed") {
        completed = true;
      } else if (
        event.type === "response.failed" ||
        event.type === "response.incomplete" ||
        event.type === "error"
      ) {
        throw new ResponseError(
          "OpenAI did not complete the response. Try again or use a shorter prompt.",
        );
      }
    }
    if (!hasText)
      throw new ResponseError(
        "OpenAI returned no text or declined the request. Try rephrasing the prompt.",
      );
    if (!completed)
      throw new ResponseError(
        "OpenAI stream ended before the response completed.",
      );
  } catch (error) {
    if (error instanceof ResponseError) throw error;
    // Never print raw SDK errors or request details containing credentials.
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new Error("OpenAI request timed out. Try again shortly.");
    }
    if (error instanceof OpenAI.APIError && error.status !== undefined) {
      const status = error.status;
      if (status === 401 || status === 403) {
        throw new Error(
          `OpenAI rejected authentication or access (HTTP ${status}). Check OPENAI_API_KEY and project permissions.`,
        );
      }
      if (status === 429) {
        throw new Error(
          "OpenAI quota or rate limit reached (HTTP 429). Check API billing, credits, and rate limits.",
        );
      }
      if (status === 400 || status === 404) {
        throw new Error(
          `OpenAI rejected the request or model (HTTP ${status}). Check OPENAI_MODEL and model access.`,
        );
      }
      throw new Error(
        `OpenAI request failed (HTTP ${status}). Try again shortly.`,
      );
    }
    throw new Error(
      "Could not connect to OpenAI. Check your network connection.",
    );
  }
}

class ResponseError extends Error {}
