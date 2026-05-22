"use client";
import { TaskSlide, SlideDesignProfile, T } from "../lib/constants";
interface Props { slide: TaskSlide; design: SlideDesignProfile; cleanDesignName: (name: string) => string; }
export default function SlideRenderer({ slide, design, cleanDesignName }: Props) {
  const dark = !["#ffffff","#fbfbfd","#fbfaf8","#fffdf2"].includes(design.colors.canvas.toLowerCase());
  const isIBM = design.id === "ibm-carbon";
  const isLinear = design.id === "linear";
  const isMiro = design.id === "miro";
  const radius = isIBM ? 0 : 10;
  return (
    <div style={{ background:design.colors.canvas, borderRadius:radius, border:`1px solid ${dark?"rgba(255,255,255,0.08)":T.border}`, overflow:"hidden", boxShadow:dark?"0 8px 32px rgba(0,0,0,0.4)":"0 2px 16px rgba(0,0,0,0.06)" }}>
      <div style={{ padding:"20px 24px 16px", background:isLinear?"linear-gradient(135deg,#13131A,#1C1C2A)":isMiro?"#FFD02F":isIBM?"#0F62FE":design.colors.canvas, borderBottom:`1px solid ${dark?"rgba(255,255,255,0.07)":design.colors.accent+"33"}`, position:"relative" }}>
        <div style={{ position:"absolute", top:16, right:18, padding:"4px 10px", background:dark||isMiro?"rgba(255,255,255,0.15)":design.colors.surface, color:isMiro?design.colors.ink:dark?"rgba(255,255,255,0.7)":design.colors.accent, borderRadius:isIBM?0:999, fontSize:12, fontWeight:700, letterSpacing:"0.04em", border:`1px solid ${dark||isMiro?"rgba(255,255,255,0.2)":design.colors.accent+"44"}` }}>{cleanDesignName(slide.designName)}</div>
        <div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:isIBM||isLinear?"rgba(255,255,255,0.55)":isMiro?design.colors.ink+"99":design.colors.muted, marginBottom:8 }}>{slide.subtitle}</div>
        <div style={{ fontSize:22, fontWeight:900, lineHeight:1.3, paddingRight:90, color:isIBM||isLinear?"#FFFFFF":isMiro?design.colors.ink:design.colors.ink, letterSpacing:isLinear?"-0.03em":"-0.01em" }}>{slide.title}</div>
      </div>
      <div style={{ margin:"18px 24px 0", padding:"14px 18px", background:design.colors.surface, borderRadius:radius, borderLeft:`4px solid ${design.colors.accent}` }}>
        <div style={{ fontSize:12, fontWeight:700, color:design.colors.accent, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>KEY MESSAGE</div>
        <div style={{ fontSize:16, fontWeight:700, color:design.colors.ink, lineHeight:1.6 }}>{slide.keyMessage}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:slide.sections.length>=3?"1fr 1fr":"1fr", gap:12, padding:"16px 24px" }}>
        {slide.sections.map((section, i) => (
          <div key={i} style={{ background:dark?"rgba(255,255,255,0.04)":design.colors.surface, borderRadius:radius, padding:"14px 16px", position:"relative", overflow:"hidden", border:`1px solid ${dark?"rgba(255,255,255,0.08)":T.borderLight}` }}>
            <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:[design.colors.accent,design.colors.accent+"88",design.colors.accent+"55",design.colors.accent+"33"][i%4], borderRadius:`${radius}px 0 0 ${radius}px` }}/>
            <div style={{ paddingLeft:10 }}>
              <div style={{ fontSize:13, fontWeight:800, color:design.colors.accent, letterSpacing:"0.03em", marginBottom:10, lineHeight:1.3 }}>{section.heading}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {(section.bullets||[]).map((bullet,j) => (
                  <div key={j} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:design.colors.accent, flexShrink:0, marginTop:7 }}/>
                    <div style={{ fontSize:14, color:design.colors.muted, lineHeight:1.65 }}>{bullet}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slide.speakerNote && (
        <div style={{ margin:"0 24px 18px", padding:"12px 16px", background:dark?"rgba(255,255,255,0.03)":T.paper, borderRadius:radius, border:`1px dashed ${dark?"rgba(255,255,255,0.1)":T.border}`, display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:14, color:design.colors.muted, flexShrink:0 }}>💬</span>
          <div style={{ fontSize:13, color:design.colors.muted, lineHeight:1.6 }}>{slide.speakerNote}</div>
        </div>
      )}
      <div style={{ padding:"12px 24px", borderTop:`1px solid ${dark?"rgba(255,255,255,0.06)":T.borderLight}`, fontSize:12, color:design.colors.muted, lineHeight:1.5 }}>
        <span style={{ fontWeight:700 }}>Design rationale: </span>{slide.designRationale}
      </div>
    </div>
  );
}
