/** Print chunks immediately; preserve partial output if generation fails. */
export async function printResponse(
  chunks: AsyncIterable<string>,
  write: (text: string) => void = (text) => {
    process.stdout.write(text);
  },
): Promise<void> {
  let printed = false;
  try {
    for await (const chunk of chunks) {
      if (!chunk) continue;
      write(chunk);
      printed = true;
    }
  } catch (error) {
    if (printed) {
      write("\n");
      throw new Error("Response interrupted; the text above is incomplete.", {
        cause: error,
      });
    }
    throw error;
  }
  write("\n");
}
