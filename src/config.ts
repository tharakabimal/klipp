export interface Config {
  provider: "gemini" | "openai";
  apiKey: string;
  model: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const provider = env.KLIPP_PROVIDER?.trim() || "gemini";
  if (provider !== "openai" && provider !== "gemini") {
    throw new Error("KLIPP_PROVIDER must be openai or gemini.");
  }
  const keyName = provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
  const apiKey = env[keyName]?.trim();
  if (!apiKey) {
    throw new Error(
      `${keyName} is missing or empty. Set it in your environment or load a .env file with node --env-file=.env dist/cli.js --check-config.`,
    );
  }
  const model =
    provider === "openai"
      ? env.OPENAI_MODEL?.trim() || "gpt-4.1-mini"
      : env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  return { provider, apiKey, model };
}
