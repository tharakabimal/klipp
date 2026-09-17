import { ApiError, GoogleGenAI } from "@google/genai";
import type { Config } from "./config.js";

export async function sendPrompt(
  config: Config,
  prompt: string,
  fetchImplementation: typeof fetch = globalThis.fetch,
): Promise<string> {
  let response;
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
    response = await client.models.generateContent({
      model: config.model,
      contents: prompt,
    });
  } catch (error) {
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
        default:
          throw new Error("Gemini request failed. Please try again later.");
      }
    }
    throw new Error(
      "Could not complete the Gemini request. Check your connection; the request may have timed out.",
    );
  }

  if (response.promptFeedback?.blockReason) {
    throw new Error("Gemini blocked this prompt. Try rephrasing it.");
  }
  const candidate = response.candidates?.[0];
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(
      "Gemini did not complete a text response. Try a shorter or rephrased prompt.",
    );
  }
  const text = response.text;
  if (!text?.trim()) {
    throw new Error("Gemini returned no text. Try rephrasing the prompt.");
  }
  return text;
}
