import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { TaskSlide, SlideDesignProfile } from "../../lib/constants";

function buildImagePrompt(slide: TaskSlide, design: SlideDesignProfile): string {
  const sectionDescriptions = slide.sections.map((section) => {
    if (section.type === "table" && section.table) {
      const { headers, rows } = section.table;
      return `[${section.heading}] Table: columns=${headers.join("/")} / rows=${rows.map(r => r.join("|")).join("; ")}`;
    }
    if (section.type === "comparison" && section.comparison) {
      const { criteria, items } = section.comparison;
      return `[${section.heading}] Comparison: criteria=${criteria.join("/")} / options=${items.map(i => i.label).join(" vs ")}`;
    }
    if (section.type === "flow" && section.flow) {
      const steps = section.flow.steps.map((s, i) => `${i + 1}.${s.label}`).join(" → ");
      return `[${section.heading}] Flow: ${steps}`;
    }
    if (section.type === "kpi" && section.kpi) {
      const metrics = section.kpi.metrics.map(m => `${m.label}: ${m.value}${m.unit ?? ""}`).join(", ");
      return `[${section.heading}] KPI: ${metrics}`;
    }
    if (section.type === "matrix" && section.matrix) {
      return `[${section.heading}] 2x2 Matrix: X=${section.matrix.xLabel}, Y=${section.matrix.yLabel}`;
    }
    return `[${section.heading}] ${(section.bullets ?? []).join(" / ")}`;
  }).join("\n");

  return `
Professional Japanese business presentation slide, 16:9 widescreen format.

Design: ${design.name} — ${design.designMd}
Colors: background=${design.colors.canvas}, accent=${design.colors.accent}, text=${design.colors.ink}

Title: ${slide.title}
Subtitle: ${slide.subtitle}
Key Message (highlight box): ${slide.keyMessage}

Sections — NO bullet points, use charts/tables/diagrams:
${sectionDescriptions}

Requirements:
- 16:9 widescreen professional slide
- Title prominently at top
- Key message in highlighted accent box
- Visualize each section as table / flow chart / matrix / KPI cards / comparison chart
- Clean layout, strong hierarchy, consulting presentation style
`.trim();
}

const CANDIDATE_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
  "gemini-2.5-flash-preview-image-generation",
];

export async function POST(req: NextRequest) {
  try {
    const { slide, design } = await req.json() as { slide: TaskSlide; design: SlideDesignProfile };

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_AI_API_KEY not set" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildImagePrompt(slide, design);

    let lastError = "";
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseModalities: ["IMAGE", "TEXT"] },
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p) => p.inlineData?.data);
        if (!imagePart?.inlineData) continue;

        return NextResponse.json({
          imageData: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType ?? "image/png",
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        continue;
      }
    }

    return NextResponse.json({ error: `利用可能なGeminiモデルが見つかりませんでした: ${lastError}` }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
