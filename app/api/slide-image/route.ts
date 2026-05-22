import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";
import { TaskSlide, SlideDesignProfile } from "../../lib/constants";

function buildImagePrompt(slide: TaskSlide, design: SlideDesignProfile): string {
  const sectionDescriptions = slide.sections.map((section) => {
    if (section.type === "table" && section.table) {
      const { headers, rows } = section.table;
      return `【${section.heading}】表形式: 列=${headers.join("/")} / データ=${rows.map(r => r.join("|")).join("; ")}`;
    }
    if (section.type === "comparison" && section.comparison) {
      const { criteria, items } = section.comparison;
      return `【${section.heading}】比較表: 評価軸=${criteria.join("/")} / 比較対象=${items.map(i => i.label).join(" vs ")}`;
    }
    if (section.type === "flow" && section.flow) {
      const steps = section.flow.steps.map((s, i) => `${i + 1}.${s.label}`).join(" → ");
      return `【${section.heading}】フロー図: ${steps}`;
    }
    if (section.type === "kpi" && section.kpi) {
      const metrics = section.kpi.metrics.map(m => `${m.label}:${m.value}${m.unit ?? ""}`).join(", ");
      return `【${section.heading}】KPI指標: ${metrics}`;
    }
    if (section.type === "matrix" && section.matrix) {
      return `【${section.heading}】2×2マトリクス: X軸=${section.matrix.xLabel}, Y軸=${section.matrix.yLabel}`;
    }
    const bullets = section.bullets ?? [];
    return `【${section.heading}】${bullets.join(" / ")}`;
  }).join("\n");

  return `
プロフェッショナルな日本語ビジネスプレゼンテーションスライド（16:9）を作成してください。

【デザインスタイル】
- テーマ: ${design.name}
- 背景色: ${design.colors.canvas}
- アクセントカラー: ${design.colors.accent}
- テキスト色: ${design.colors.ink}
- デザイン方針: ${design.designMd}

【スライド内容】
タイトル: ${slide.title}
サブタイトル: ${slide.subtitle}
キーメッセージ（強調表示）: ${slide.keyMessage}

【セクション（箇条書きは禁止 — 図・表・チャート・ダイアグラムで表現）】
${sectionDescriptions}

【要件】
- 16:9の横長フォーマット
- タイトルを左上または中央上部に大きく表示
- キーメッセージをハイライトボックスで強調
- 各セクションを表・フロー図・マトリクス・KPIカード・比較チャートなどのビジュアルで表現
- 箇条書き（bullet points）は一切使わない
- プロフェッショナルでクリーンなデザイン
- 日本語テキストを正確に表示
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { slide, design } = await req.json() as { slide: TaskSlide; design: SlideDesignProfile };

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_AI_API_KEY not set" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-preview-image-generation",
    });

    const prompt = buildImagePrompt(slide, design);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      } as GenerationConfig & { responseModalities: string[] },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "画像が生成されませんでした" }, { status: 500 });
    }

    return NextResponse.json({
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? "image/png",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
