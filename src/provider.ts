import type { Config } from "./config.js";
import { streamPrompt as sendGeminiPrompt } from "./gemini.js";
import { streamPrompt as sendOpenAIPrompt } from "./openai.js";

export function streamPrompt(
  config: Config,
  prompt: string,
  transport: typeof fetch = globalThis.fetch,
): AsyncGenerator<string> {
  return config.provider === "openai"
    ? sendOpenAIPrompt(config, prompt, transport)
    : sendGeminiPrompt(config, prompt, transport);
}
