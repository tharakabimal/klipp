export function parsePrompt(positionals: string[]): string {
  if (positionals.length !== 1) {
    throw new Error(
      'Provide one prompt wrapped in quotes: klipp "Your prompt"',
    );
  }

  const prompt = positionals[0];
  if (prompt === undefined || prompt.trim().length === 0) {
    throw new Error("The prompt cannot be empty or whitespace only.");
  }

  return prompt;
}
