import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { system, userContent, maxTokens = 1000 } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = message.content.find((b) => b.type === "text")?.text ?? "";

    // Extract JSON robustly
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return NextResponse.json({ text: raw });
    }
    const jsonStr = raw.slice(start, end + 1);

    // Validate JSON is parseable before returning
    try {
      JSON.parse(jsonStr);
    } catch {
      // Return raw text if JSON is malformed, client will handle
      return NextResponse.json({ text: raw });
    }

    return NextResponse.json({ text: jsonStr });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
