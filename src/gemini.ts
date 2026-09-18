import { ApiError, GoogleGenAI } from "@google/genai";
import type { Config } from "./config.js";

export async function* streamPrompt(
  config: Config,
  prompt: string,
  fetchImplementation: typeof fetch = globalThis.fetch,
): AsyncGenerator<string> {
  let hasText = false;
  let completed = false;
  try {
    const client = new GoogleGenAI({
      apiKey: config.apiKey,
      vertexai: false,
      httpOptions: {
        timeout: 60_000,
        retryOptions: { attempts: 1 },
        fetch: fetchImplementation,
      },
    });
    const stream = await client.models.generateContentStream({
      model: config.model,
      contents: prompt,
    });
    for await (const response of stream) {
      if (response.promptFeedback?.blockReason) {
        throw new ResponseError(
          "Gemini blocked this prompt. Try rephrasing it.",
        );
      }
      const candidate = response.candidates?.[0];
      const text = response.text;
      if (text) {
        hasText ||= Boolean(text.trim());
        yield text;
      }
      if (candidate?.finishReason) {
        if (candidate.finishReason !== "STOP") {
          throw new ResponseError(
            "Gemini did not complete a text response. Try a shorter or rephrased prompt.",
          );
        }
        completed = true;
      }
    }
    if (!hasText)
      throw new ResponseError(
        "Gemini returned no text. Try rephrasing the prompt.",
      );
    if (!completed)
      throw new ResponseError(
        "Gemini stream ended before the response completed.",
      );
  } catch (error) {
    if (error instanceof ResponseError) throw error;
    // Do not expose raw SDK errors: they can include request details or secrets.
    if (error instanceof ApiError) {
      switch (error.status) {
        case 400:
        case 401:
        case 403:
          throw new Error(
            "Gemini rejected the request. Check GEMINI_API_KEY, model access, and account eligibility.",
          );
        case 404:
          throw new Error("Gemini model not found. Check GEMINI_MODEL.");
        case 429:
          throw new Error(
            "Gemini quota or rate limit reached. Check your AI Studio limits before retrying.",
          );
        case 408:
        case 504:
          throw new Error(
            `Gemini request timed out (HTTP ${error.status}). Try again or use a shorter prompt.`,
          );
        case 500:
        case 502:
        case 503:
          throw new Error(
            `Gemini service error (HTTP ${error.status}). The service may be temporarily unavailable or overloaded; try again shortly.`,
          );
        default:
          throw new Error(
            `Gemini request failed (HTTP ${error.status}). Please try again later.`,
          );
      }
    }
    throw new Error(
      "Could not complete the Gemini request. Check your connection; the request may have timed out.",
    );
  }
}

class ResponseError extends Error {}
