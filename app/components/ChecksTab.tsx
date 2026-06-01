"use client";
import { Phase, T } from "../lib/constants";

export default function ChecksTab({ phase, onOpenChat }: { phase: Phase; onOpenChat: () => void }) {
  return (
    <div>
      <div style={{ marginBottom:14, padding:"10px 14px", background:T.white, border:`1px solid ${T.border}`, borderRadius:8, fontSize:14, color:T.inkMuted, lineHeight:1.7 }}>
        次のフェーズに進む前に、以下の問いすべてに「Yes」と答えられるか確認してください。
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {phase.checks.map((check, i) => (
          <div key={i} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ width:22, height:22, borderRadius:"50%", border:`1.5px solid ${phase.band}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13, color:phase.band, fontWeight:700 }}>{i+1}</div>
            <div style={{ fontSize:15, color:T.ink, lineHeight:1.7 }}>{check}</div>
          </div>
        ))}
      </div>
      <button onClick={onOpenChat} style={{ marginTop:16, width:"100%", padding:"11px", background:T.offWhite, border:`1px solid ${T.border}`, borderRadius:8, color:T.inkMuted, cursor:"pointer", fontSize:15, fontWeight:600 }}>
        このフェーズのポイントをAIに聞く →
      </button>
    </div>
  );
}
