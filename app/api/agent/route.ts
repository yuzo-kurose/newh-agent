import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

function extractJSON(raw: string): { success: boolean; text: string } {
  // Remove markdown code blocks first
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return { success: false, text: raw };

  let json = cleaned.slice(start, end + 1);

  // Fix unescaped control characters inside strings
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      if (ch.charCodeAt(0) < 32) continue;
    }
    result += ch;
  }

  try {
    JSON.parse(result);
    return { success: true, text: result };
  } catch {
    const fixed = result.replace(/,(\s*[}\]])/g, "$1");
    try {
      JSON.parse(fixed);
      return { success: true, text: fixed };
    } catch {
      return { success: false, text: `JSONパースエラー: ${result.slice(0, 300)}` };
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { system, userContent, maxTokens = 1000 } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const enhancedSystem = system + "\n\n厳守事項: JSONのみを返すこと。```json などのMarkdownコードブロックは絶対に使わないこと。文字列値の中に改行を入れないこと。";

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: enhancedSystem,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = message.content.find((b) => b.type === "text")?.text ?? "";
    const { success, text } = extractJSON(raw);

    if (!success) {
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
