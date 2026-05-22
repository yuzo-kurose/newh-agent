"use client";
import { Phase, T } from "../lib/constants";

interface Props { phase: Phase; completedTasks: Record<string, boolean>; toggleTask: (id: string) => void; }

export default function TasksTab({ phase, completedTasks, toggleTask }: Props) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {phase.tasks.map(task => {
        const done = !!completedTasks[`${phase.id}-${task.id}`];
        return (
          <div key={task.id} onClick={() => toggleTask(task.id)}
            style={{ background:T.white, border:`1px solid ${done?phase.band+"55":T.border}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", display:"flex", gap:12, alignItems:"flex-start", transition:"all 0.15s", opacity:done?0.65:1 }}>
            <div style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${done?phase.band:T.border}`, background:done?phase.band:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all 0.15s" }}>
              {done && <span style={{ color:T.white, fontSize:10, fontWeight:900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:done?400:600, color:T.ink, textDecoration:done?"line-through":"none" }}>{task.label}</div>
              <div style={{ fontSize:11, color:T.inkMuted, marginTop:3, lineHeight:1.6 }}>{task.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
