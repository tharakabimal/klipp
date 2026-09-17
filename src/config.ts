export interface Config {
  provider: "gemini";
  apiKey: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing or empty. Set it in your environment or load a .env file with node --env-file=.env dist/cli.js --check-config.",
    );
  }
  return { provider: "gemini", apiKey };
}
