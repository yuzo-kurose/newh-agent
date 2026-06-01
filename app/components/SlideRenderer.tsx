"use client";
import { TaskSlide, SlideSection, SlideDesignProfile, T } from "../lib/constants";

interface Props { slide: TaskSlide; design: SlideDesignProfile; cleanDesignName: (name: string) => string; }

function SectionContent({ section, design, dark, radius }: { section: SlideSection; design: SlideDesignProfile; dark: boolean; radius: number }) {
  const accent = design.colors.accent;
  const ink = design.colors.ink;
  const muted = design.colors.muted;
  const surface = design.colors.surface;

  if (section.type === "table" && section.table) {
    const { headers, rows } = section.table;
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: "7px 10px", background: accent, color: "#fff", fontWeight: 800, fontSize: 15, textAlign: "left", borderRadius: i === 0 ? `${radius}px 0 0 0` : i === headers.length - 1 ? `0 ${radius}px 0 0` : 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? (dark ? "rgba(255,255,255,0.03)" : surface) : "transparent" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "7px 10px", fontSize: 16, color: ci === 0 ? ink : muted, fontWeight: ci === 0 ? 700 : 400, borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : T.borderLight}` }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section.type === "comparison" && section.comparison) {
    const { criteria, items } = section.comparison;
    return (
      <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${items.length}, 1fr)`, gap: 0, fontSize: 15, borderRadius: radius, overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : T.border}` }}>
        <div style={{ background: accent, padding: "8px 10px", fontWeight: 800, color: "#fff", fontSize: 14 }}></div>
        {items.map((item, i) => (
          <div key={i} style={{ background: accent + (i === 0 ? "EE" : i === 1 ? "99" : "55"), padding: "8px 10px", fontWeight: 800, color: "#fff", fontSize: 15, textAlign: "center", borderLeft: `1px solid rgba(255,255,255,0.2)` }}>{item.label}</div>
        ))}
        {criteria.map((criterion, ci) => (
          <>
            <div key={`c-${ci}`} style={{ padding: "7px 10px", background: dark ? "rgba(255,255,255,0.04)" : surface, color: muted, fontWeight: 700, fontSize: 15, borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : T.borderLight}` }}>{criterion}</div>
            {items.map((item, ii) => (
              <div key={`v-${ci}-${ii}`} style={{ padding: "7px 10px", color: ink, fontSize: 16, textAlign: "center", borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : T.borderLight}`, borderLeft: `1px solid ${dark ? "rgba(255,255,255,0.06)" : T.borderLight}` }}>{item.values[ci] ?? "—"}</div>
            ))}
          </>
        ))}
      </div>
    );
  }

  if (section.type === "flow" && section.flow) {
    const { steps } = section.flow;
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap" }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90, maxWidth: 120 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 15, color: ink, textAlign: "center", lineHeight: 1.3 }}>{step.label}</div>
              {step.desc && <div style={{ marginTop: 4, fontSize: 14, color: muted, textAlign: "center", lineHeight: 1.4 }}>{step.desc}</div>}
            </div>
            {i < steps.length - 1 && (
              <div style={{ padding: "6px 4px 0", color: accent, fontSize: 22, fontWeight: 900, flexShrink: 0 }}>→</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === "kpi" && section.kpi) {
    const { metrics } = section.kpi;
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`, gap: 10 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: dark ? "rgba(255,255,255,0.05)" : surface, borderRadius: radius, padding: "12px 14px", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : T.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: "-0.02em" }}>{m.value}<span style={{ fontSize: 16, fontWeight: 700, color: muted, marginLeft: 3 }}>{m.unit}</span></div>
            {m.trend && (
              <div style={{ marginTop: 6, fontSize: 15, color: m.trend === "up" ? T.green : m.trend === "down" ? T.red : muted, fontWeight: 700 }}>
                {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (section.type === "matrix" && section.matrix) {
    const { xLabel, yLabel, cells } = section.matrix;
    const quadrants = [
      { x: "high", y: "high", label: "" },
      { x: "low", y: "high", label: "" },
      { x: "high", y: "low", label: "" },
      { x: "low", y: "low", label: "" },
    ];
    return (
      <div style={{ position: "relative" }}>
        <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: muted, marginBottom: 4 }}>{xLabel} →</div>
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", marginRight: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: muted, writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>↑ {yLabel}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 4, flex: 1, minHeight: 120 }}>
            {quadrants.map((q, qi) => {
              const matching = cells.filter(c => c.x === q.x && c.y === q.y);
              const bg = qi === 0 ? accent + "22" : dark ? "rgba(255,255,255,0.04)" : surface;
              const borderColor = qi === 0 ? accent : dark ? "rgba(255,255,255,0.08)" : T.borderLight;
              return (
                <div key={qi} style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: radius, padding: "8px 10px", minHeight: 56 }}>
                  {matching.map((c, ci) => (
                    <div key={ci} style={{ marginBottom: ci < matching.length - 1 ? 4 : 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: qi === 0 ? accent : ink }}>{c.label}</div>
                      {c.desc && <div style={{ fontSize: 14, color: muted, lineHeight: 1.4 }}>{c.desc}</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // fallback: bullets
  const bullets = section.bullets ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {bullets.map((bullet, j) => (
        <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0, marginTop: 7 }} />
          <div style={{ fontSize: 18, color: muted, lineHeight: 1.65 }}>{bullet}</div>
        </div>
      ))}
    </div>
  );
}

export default function SlideRenderer({ slide, design, cleanDesignName }: Props) {
  const dark = !["#ffffff","#fbfbfd","#fbfaf8","#fffdf2"].includes(design.colors.canvas.toLowerCase());
  const isIBM = design.id === "ibm-carbon";
  const isLinear = design.id === "linear";
  const isMiro = design.id === "miro";
  const radius = isIBM ? 0 : 10;
  return (
    <div style={{ background: design.colors.canvas, borderRadius: radius, border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : T.border}`, overflow: "hidden", boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 16px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "20px 24px 16px", background: isLinear ? "linear-gradient(135deg,#13131A,#1C1C2A)" : isMiro ? "#FFD02F" : isIBM ? "#0F62FE" : design.colors.canvas, borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.07)" : design.colors.accent + "33"}`, position: "relative" }}>
        <div style={{ position: "absolute", top: 16, right: 18, padding: "4px 10px", background: dark || isMiro ? "rgba(255,255,255,0.15)" : design.colors.surface, color: isMiro ? design.colors.ink : dark ? "rgba(255,255,255,0.7)" : design.colors.accent, borderRadius: isIBM ? 0 : 999, fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", border: `1px solid ${dark || isMiro ? "rgba(255,255,255,0.2)" : design.colors.accent + "44"}` }}>{cleanDesignName(slide.designName)}</div>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isIBM || isLinear ? "rgba(255,255,255,0.55)" : isMiro ? design.colors.ink + "99" : design.colors.muted, marginBottom: 8 }}>{slide.subtitle}</div>
        <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.3, paddingRight: 90, color: isIBM || isLinear ? "#FFFFFF" : isMiro ? design.colors.ink : design.colors.ink, letterSpacing: isLinear ? "-0.03em" : "-0.01em" }}>{slide.title}</div>
      </div>
      <div style={{ margin: "18px 24px 0", padding: "14px 18px", background: design.colors.surface, borderRadius: radius, borderLeft: `4px solid ${design.colors.accent}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: design.colors.accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>KEY MESSAGE</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: design.colors.ink, lineHeight: 1.6 }}>{slide.keyMessage}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 24px" }}>
        {slide.sections.map((section, i) => (
          <div key={i} style={{ background: dark ? "rgba(255,255,255,0.04)" : design.colors.surface, borderRadius: radius, padding: "14px 16px", position: "relative", overflow: "hidden", border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : T.borderLight}` }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: [design.colors.accent, design.colors.accent + "88", design.colors.accent + "55", design.colors.accent + "33"][i % 4], borderRadius: `${radius}px 0 0 ${radius}px` }} />
            <div style={{ paddingLeft: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: design.colors.accent, letterSpacing: "0.03em", marginBottom: 10, lineHeight: 1.3 }}>{section.heading}</div>
              <SectionContent section={section} design={design} dark={dark} radius={radius} />
            </div>
          </div>
        ))}
      </div>
      {slide.speakerNote && (
        <div style={{ margin: "0 24px 18px", padding: "12px 16px", background: dark ? "rgba(255,255,255,0.03)" : T.paper, borderRadius: radius, border: `1px dashed ${dark ? "rgba(255,255,255,0.1)" : T.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 17, color: design.colors.muted, flexShrink: 0 }}>💬</span>
          <div style={{ fontSize: 17, color: design.colors.muted, lineHeight: 1.6 }}>{slide.speakerNote}</div>
        </div>
      )}
      <div style={{ padding: "12px 24px", borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : T.borderLight}`, fontSize: 15, color: design.colors.muted, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700 }}>Design rationale: </span>{slide.designRationale}
      </div>
    </div>
  );
}
