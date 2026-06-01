"use client";
import { Phase, T } from "../lib/constants";

export default function PhaseHeader({ phase, progress }: { phase: Phase; progress: number }) {
  return (
    <div style={{ padding:"14px 20px", background:T.white, borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <div style={{ width:4, height:20, background:phase.band, borderRadius:2 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:800, color:T.ink, letterSpacing:"-0.02em" }}>{phase.label}</div>
          <div style={{ fontSize:13, color:T.inkMuted, marginTop:1 }}>{phase.description}</div>
        </div>
        <div style={{ fontSize:26, fontWeight:900, color:phase.band, letterSpacing:"-0.03em" }}>
          {progress}<span style={{ fontSize:15, fontWeight:500 }}>%</span>
        </div>
      </div>
      <div style={{ height:3, background:T.paper, borderRadius:2 }}>
        <div style={{ width:`${progress}%`, height:"100%", background:phase.band, borderRadius:2, transition:"width 0.4s" }} />
      </div>
    </div>
  );
}
