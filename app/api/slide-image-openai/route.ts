import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TaskSlide, SlideDesignProfile } from "../../lib/constants";

// Truncate Japanese text to avoid garbled rendering
function shorten(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen - 1) + "…";
}

function buildImagePrompt(slide: TaskSlide, design: SlideDesignProfile): string {
  // Collect all Japanese text elements for the explicit rendering list
  const textElements: string[] = [];
  const title = shorten(slide.title, 24);
  const subtitle = shorten(slide.subtitle, 20);
  const keyMsg = shorten(slide.keyMessage, 36);
  textElements.push(`TITLE: 「${title}」`);
  textElements.push(`SUBTITLE: 「${subtitle}」`);
  textElements.push(`KEY MESSAGE: 「${keyMsg}」`);

  const sectionVisuals = slide.sections.map((section, idx) => {
    const heading = shorten(section.heading, 16);
    textElements.push(`SECTION ${idx + 1} HEADING: 「${heading}」`);

    if (section.type === "table" && section.table) {
      const { headers, rows } = section.table;
      const shortHeaders = headers.map(h => shorten(h, 10));
      const shortRows = rows.slice(0, 5).map(r => r.map(c => shorten(c, 12)));
      shortHeaders.forEach(h => textElements.push(`TABLE HEADER: 「${h}」`));
      shortRows.forEach(r => r.forEach(c => textElements.push(`TABLE CELL: 「${c}」`)));
      return `Section ${idx + 1} "${heading}": clean data table with headers [${shortHeaders.join(" | ")}] and ${shortRows.length} rows. Large readable font for each cell.`;
    }

    if (section.type === "comparison" && section.comparison) {
      const { criteria, items } = section.comparison;
      const shortItems = items.slice(0, 3).map(i => shorten(i.label, 10));
      const shortCriteria = criteria.slice(0, 4).map(c => shorten(c, 10));
      shortItems.forEach(i => textElements.push(`COMPARE LABEL: 「${i}」`));
      shortCriteria.forEach(c => textElements.push(`COMPARE AXIS: 「${c}」`));
      return `Section ${idx + 1} "${heading}": side-by-side comparison table, columns [${shortItems.join(" vs ")}], rows [${shortCriteria.join(", ")}].`;
    }

    if (section.type === "flow" && section.flow) {
      const steps = section.flow.steps.slice(0, 5).map((s, i) => {
        const label = shorten(s.label, 10);
        textElements.push(`FLOW STEP ${i + 1}: 「${label}」`);
        return `${i + 1}.${label}`;
      });
      return `Section ${idx + 1} "${heading}": horizontal flow diagram with numbered steps: ${steps.join(" → ")}. Large circle for each step number, bold step label below.`;
    }

    if (section.type === "kpi" && section.kpi) {
      const metrics = section.kpi.metrics.slice(0, 4).map(m => {
        const label = shorten(m.label, 10);
        textElements.push(`KPI LABEL: 「${label}」`);
        textElements.push(`KPI VALUE: 「${m.value}${m.unit ?? ""}」`);
        return `${label}: ${m.value}${m.unit ?? ""}`;
      });
      return `Section ${idx + 1} "${heading}": KPI metric cards side by side. Each card: small label at top, very large bold number value. Metrics: [${metrics.join(", ")}].`;
    }

    if (section.type === "matrix" && section.matrix) {
      const { xLabel, yLabel, cells } = section.matrix;
      textElements.push(`MATRIX X-AXIS: 「${shorten(xLabel, 10)}」`);
      textElements.push(`MATRIX Y-AXIS: 「${shorten(yLabel, 10)}」`);
      cells.slice(0, 4).forEach(c => textElements.push(`MATRIX CELL: 「${shorten(c.label, 8)}」`));
      return `Section ${idx + 1} "${heading}": 2×2 matrix grid. X-axis label "${xLabel}", Y-axis label "${yLabel}". Four quadrants, each with a short label.`;
    }

    const bullets = (section.bullets ?? []).slice(0, 4).map(b => shorten(b, 18));
    bullets.forEach(b => textElements.push(`BULLET: 「${b}」`));
    return `Section ${idx + 1} "${heading}": icon list, each item on its own row with a colored dot, max 4 items: [${bullets.join(" / ")}].`;
  }).join("\n");

  return `
██ JAPANESE TEXT RENDERING INSTRUCTION — HIGHEST PRIORITY ██
This slide contains Japanese text. You MUST render every Japanese character (kanji, hiragana, katakana) with perfect accuracy. Do NOT substitute, distort, mirror, or invent characters. Each character must match exactly what is specified below. Use a clean, modern Japanese sans-serif typeface (e.g. Noto Sans JP or equivalent). Render text at large, legible size.

EXACT TEXT TO RENDER (copy character by character — zero errors allowed):
${textElements.join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE LAYOUT — 16:9 widescreen professional business presentation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Design style: ${design.name}
Visual direction: ${design.designMd}
Background color: ${design.colors.canvas}
Accent color: ${design.colors.accent}
Primary text color: ${design.colors.ink}

── LAYOUT ZONES ──

TOP BAR (full width, accent-colored strip):
  Left: SUBTITLE text in small caps — "${subtitle}"
  Center: TITLE in large bold — "${title}"

HIGHLIGHT BOX (below title, full width, rounded, accent background):
  Label: "KEY MESSAGE" in tiny caps
  Body: "${keyMsg}" in bold

VISUAL SECTIONS (grid below highlight box):
${sectionVisuals}

── DESIGN RULES ──
- Minimum font size 16pt for any text; title 40pt+; KPI values 56pt+
- NO bullet-point lists — charts, tables, diagrams only
- Strong color contrast between text and background
- Generous padding around all text elements
- Clean white space between sections

██ REMINDER: Render all Japanese text exactly as listed above. Every character must be correct. ██
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
