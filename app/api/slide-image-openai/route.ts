import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TaskSlide, SlideDesignProfile } from "../../lib/constants";

function buildImagePrompt(slide: TaskSlide, design: SlideDesignProfile): string {
  const sectionDescriptions = slide.sections.map((section) => {
    if (section.type === "table" && section.table) {
      const { headers, rows } = section.table;
      return `[${section.heading}] Table: columns=${headers.join("/")} / rows=${rows.map(r => r.join("|")).join("; ")}`;
    }
    if (section.type === "comparison" && section.comparison) {
      const { criteria, items } = section.comparison;
      return `[${section.heading}] Comparison chart: criteria=${criteria.join("/")} / options=${items.map(i => i.label).join(" vs ")}`;
    }
    if (section.type === "flow" && section.flow) {
      const steps = section.flow.steps.map((s, i) => `${i + 1}.${s.label}`).join(" → ");
      return `[${section.heading}] Flow diagram: ${steps}`;
    }
    if (section.type === "kpi" && section.kpi) {
      const metrics = section.kpi.metrics.map(m => `${m.label}: ${m.value}${m.unit ?? ""}`).join(", ");
      return `[${section.heading}] KPI metrics: ${metrics}`;
    }
    if (section.type === "matrix" && section.matrix) {
      return `[${section.heading}] 2x2 Matrix: X-axis=${section.matrix.xLabel}, Y-axis=${section.matrix.yLabel}`;
    }
    const bullets = section.bullets ?? [];
    return `[${section.heading}] ${bullets.join(" / ")}`;
  }).join("\n");

  return `
Professional Japanese business presentation slide, 16:9 widescreen format.

Design style: ${design.name} — ${design.designMd}
Color scheme: background=${design.colors.canvas}, accent=${design.colors.accent}, text=${design.colors.ink}

SLIDE CONTENT:
Title (large, prominent): ${slide.title}
Subtitle: ${slide.subtitle}
Key Message (highlighted box): ${slide.keyMessage}

SECTIONS — use charts, tables, diagrams, infographics. NO bullet points:
${sectionDescriptions}

Requirements:
- 16:9 widescreen professional slide layout
- Title prominently displayed at top
- Key message in a highlighted accent-colored box
- Each section visualized as table / flow diagram / matrix / KPI card / comparison chart
- Clean white space, strong visual hierarchy
- Japanese text clearly readable
- High-end consulting presentation aesthetic
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { slide, design } = await req.json() as { slide: TaskSlide; design: SlideDesignProfile };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const prompt = buildImagePrompt(slide, design);

    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      return NextResponse.json({ error: "画像が生成されませんでした" }, { status: 500 });
    }

    return NextResponse.json({
      imageData: imageBase64,
      mimeType: "image/png",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
