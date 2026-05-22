"use client";
import { useMemo, useState } from "react";
import { Phase, T, getTaskHypothesis } from "../lib/constants";

interface Props { phase: Phase; completedTasks: Record<string, boolean>; toggleTask: (id: string) => void; }

export default function TasksTab({ phase, completedTasks, toggleTask }: Props) {
  const [selectedByPhase, setSelectedByPhase] = useState<Record<string, string>>({});
  const selectedTaskId = selectedByPhase[phase.id] ?? phase.tasks[0]?.id ?? "";
  const selectedTask = useMemo(
    () => phase.tasks.find((task) => task.id === selectedTaskId) ?? phase.tasks[0],
    [phase, selectedTaskId]
  );
  const selectedDone = selectedTask ? !!completedTasks[`${phase.id}-${selectedTask.id}`] : false;

  return (
    <div className="tasks-layout" style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) minmax(280px, 1fr)", gap:14, alignItems:"start" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {phase.tasks.map(task => {
          const done = !!completedTasks[`${phase.id}-${task.id}`];
          const selected = selectedTask?.id === task.id;
          return (
            <div key={task.id} onClick={() => setSelectedByPhase((prev) => ({ ...prev, [phase.id]: task.id }))}
              style={{ background:T.white, border:`1px solid ${selected?phase.band:done?phase.band+"55":T.border}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", display:"flex", gap:12, alignItems:"flex-start", transition:"all 0.15s", opacity:done?0.72:1, boxShadow:selected?"0 6px 18px rgba(0,0,0,0.06)":"none" }}>
              <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} aria-label={`${task.label}を${done ? "未完了" : "完了"}にする`}
                style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${done?phase.band:T.border}`, background:done?phase.band:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all 0.15s", cursor:"pointer", padding:0 }}>
                {done && <span style={{ color:T.white, fontSize:10, fontWeight:900 }}>✓</span>}
              </button>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:done?400:600, color:T.ink, textDecoration:done?"line-through":"none", lineHeight:1.45 }}>{task.label}</div>
                <div style={{ fontSize:11, color:T.inkMuted, marginTop:3, lineHeight:1.6 }}>{task.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <aside style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:10, padding:16, position:"sticky", top:0, boxShadow:"0 1px 0 rgba(0,0,0,0.03)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:4, height:18, background:phase.band, borderRadius:2 }} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:800, color:T.inkFaint, textTransform:"uppercase", letterSpacing:"0.06em" }}>タスク仮説</div>
              <div style={{ fontSize:14, fontWeight:800, color:T.ink, lineHeight:1.5 }}>{selectedTask.label}</div>
            </div>
          </div>
          <div style={{ padding:"12px 14px", background:T.offWhite, border:`1px solid ${T.borderLight}`, borderRadius:8, borderLeft:`3px solid ${phase.band}`, fontSize:13, color:T.inkLight, lineHeight:1.8 }}>
            {getTaskHypothesis(phase.id, selectedTask.id)}
          </div>
          <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
            <span style={{ fontSize:11, color:T.inkFaint }}>進捗状態</span>
            <button onClick={() => toggleTask(selectedTask.id)}
              style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${selectedDone?phase.band:T.border}`, background:selectedDone?`${phase.band}14`:T.offWhite, color:selectedDone?phase.band:T.inkMuted, cursor:"pointer", fontSize:12, fontWeight:700 }}>
              {selectedDone ? "完了済み" : "未完了"}
            </button>
          </div>
        </aside>
      )}

      <style>{`
        @media (max-width: 760px) {
          .tasks-layout { grid-template-columns: 1fr !important; }
          .tasks-layout aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}
