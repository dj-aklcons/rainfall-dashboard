import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt: string };
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return Response.json({ text });
  } catch (err) {
    console.error("AI briefing error:", err);
    return Response.json({ error: "Summary unavailable — check connection." }, { status: 500 });
  }
}
