export async function collect(chunks) {
  let text = "";
  for await (const chunk of chunks) text += chunk;
  return text;
}
export function sse(...events) {
  return new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    {
      headers: { "content-type": "text/event-stream" },
    },
  );
}
