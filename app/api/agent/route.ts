import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJSONText } from "../../lib/json";

export async function POST(req: NextRequest) {
  try {
    const { system, userContent, maxTokens = 1000, responseFormat = "json" } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const wantsJSON = responseFormat === "json";
    const enhancedSystem = wantsJSON
      ? system + "\n\n厳守事項: JSONのみを返すこと。```json などのMarkdownコードブロックは絶対に使わないこと。文字列値の中に改行を入れないこと。"
      : system;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: enhancedSystem,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = message.content.find((b) => b.type === "text")?.text ?? "";
    if (!wantsJSON) {
      return NextResponse.json({ text: raw.trim() });
    }

    const { success, text } = extractJSONText(raw);

    if (!success) {
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ json: JSON.parse(text) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
