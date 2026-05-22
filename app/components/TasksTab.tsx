"use client";
import { useMemo, useState } from "react";
import { Phase, T, TaskHypothesis, TaskHypothesisMap, TaskSlide, TaskSlideMap, SLIDE_DESIGN_PROFILES, getSlideDesignProfile, getTaskHypothesis } from "../lib/constants";

interface Props {
  phase: Phase;
  completedTasks: Record<string, boolean>;
  generatedHypotheses: TaskHypothesisMap;
  taskSlides: TaskSlideMap;
  projectContext: string;
  toggleTask: (id: string) => void;
  updateHypothesis: (key: string, hypothesis: TaskHypothesis) => void;
  updateTaskSlide: (key: string, slide: TaskSlide) => void;
}

async function callJSON<T>(system: string, userContent: string, maxTokens = 1800): Promise<T> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userContent, maxTokens, responseFormat: "json" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.json as T;
}

const SLIDE_SYSTEM = `あなたはNEWhの事業開発資料を作るシニアストラテジストです。
指定タスクの仮説と成果物をもとに、1枚スライドの内容を作ってください。
awesome-design-mdのDESIGN.md思想に従い、クライアント文脈に最も合うdesign profileを1つ選び、内容とデザインが整合するようにしてください。
JSONのみ返してください。
形式: {"title":"スライドタイトル","subtitle":"補足見出し","keyMessage":"一番伝えたい主張","designId":"選択したdesign profile id","designName":"選択したdesign profile名","designRationale":"このクライアントにこのデザインが合う理由","sections":[{"heading":"見出し","bullets":["箇条書き"]}],"speakerNote":"話す時の補足"}`;

export default function TasksTab({ phase, completedTasks, generatedHypotheses, taskSlides, projectContext, toggleTask, updateHypothesis, updateTaskSlide }: Props) {
  const [selectedByPhase, setSelectedByPhase] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskHypothesis | null>(null);
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState<string | null>(null);
  const selectedTaskId = selectedByPhase[phase.id] ?? phase.tasks[0]?.id ?? "";
  const selectedTask = useMemo(
    () => phase.tasks.find((task) => task.id === selectedTaskId) ?? phase.tasks[0],
    [phase, selectedTaskId]
  );
  const selectedDone = selectedTask ? !!completedTasks[`${phase.id}-${selectedTask.id}`] : false;
  const selectedHypothesis = selectedTask ? getTaskHypothesis(phase.id, selectedTask.id, generatedHypotheses) : null;
  const selectedKey = selectedTask ? `${phase.id}-${selectedTask.id}` : "";
  const selectedSlide = selectedKey ? taskSlides[selectedKey] : null;

  const startEdit = () => {
    if (!selectedHypothesis) return;
    setDraft(selectedHypothesis);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selectedKey || !draft) return;
    updateHypothesis(selectedKey, draft);
    setEditing(false);
  };

  const generateSlide = async () => {
    if (!selectedTask || !selectedHypothesis || !selectedKey || slideLoading) return;
    setSlideLoading(true);
    setSlideError(null);
    try {
      const slide = await callJSON<TaskSlide>(SLIDE_SYSTEM, `プロジェクトコンテキスト:\n${projectContext || "未入力"}\n\nフェーズ:\n${phase.label}\n${phase.description}\n\nタスク:\n${selectedTask.label}\n${selectedTask.desc}\n\n仮説情報:\n${JSON.stringify(selectedHypothesis, null, 2)}\n\n利用可能なdesign profiles:\n${JSON.stringify(SLIDE_DESIGN_PROFILES.map(({ id, name, bestFor, designMd }) => ({ id, name, bestFor, designMd })), null, 2)}\n\nこのタスクの成果物として、意思決定者に見せられる1枚スライドを作成してください。`, 2800);
      const profile = getSlideDesignProfile(slide.designId);
      updateTaskSlide(selectedKey, {
        title: slide.title || selectedTask.label,
        subtitle: slide.subtitle || phase.label,
        keyMessage: slide.keyMessage || selectedHypothesis.hypothesis,
        designId: profile.id,
        designName: slide.designName || profile.name,
        designRationale: slide.designRationale || "プロジェクト文脈に合わせて自動選択しました。",
        sections: Array.isArray(slide.sections) ? slide.sections.slice(0, 4) : [],
        speakerNote: slide.speakerNote || "",
      });
    } catch (e) {
      setSlideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSlideLoading(false);
    }
  };

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
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button onClick={startEdit} style={{ padding:"7px 11px", borderRadius:8, border:`1px solid ${T.border}`, background:T.offWhite, color:T.inkMuted, cursor:"pointer", fontSize:12, fontWeight:700 }}>仮説を編集</button>
            <button onClick={generateSlide} disabled={slideLoading} style={{ padding:"7px 11px", borderRadius:8, border:"none", background:slideLoading?T.paper:phase.band, color:slideLoading?T.inkFaint:T.white, cursor:slideLoading?"not-allowed":"pointer", fontSize:12, fontWeight:800 }}>{slideLoading ? "生成中..." : "スライド生成"}</button>
          </div>

          {editing && draft ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {([
                ["hypothesis", "仮説"],
                ["rationale", "根拠"],
                ["validation", "確認ポイント"],
                ["output", "成果物"],
              ] as const).map(([key, label]) => (
                <label key={key} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <span style={{ fontSize:10, fontWeight:800, color:T.inkFaint, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
                  <textarea value={draft[key]} onChange={(e) => setDraft((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                    style={{ width:"100%", minHeight:64, padding:"9px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.offWhite, color:T.ink, fontSize:12, lineHeight:1.6, resize:"vertical", fontFamily:"inherit", outline:"none" }} />
                </label>
              ))}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={() => setEditing(false)} style={{ padding:"7px 11px", borderRadius:8, border:`1px solid ${T.border}`, background:T.white, color:T.inkMuted, cursor:"pointer", fontSize:12, fontWeight:700 }}>キャンセル</button>
                <button onClick={saveEdit} style={{ padding:"7px 11px", borderRadius:8, border:"none", background:T.ink, color:T.white, cursor:"pointer", fontSize:12, fontWeight:800 }}>保存</button>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
              { label:"仮説", value:selectedHypothesis?.hypothesis, color:phase.band },
              { label:"根拠", value:selectedHypothesis?.rationale, color:T.blue },
              { label:"確認ポイント", value:selectedHypothesis?.validation, color:T.orange },
              { label:"成果物", value:selectedHypothesis?.output, color:T.green },
            ].map((item) => (
              <div key={item.label} style={{ padding:"11px 12px", background:T.offWhite, border:`1px solid ${T.borderLight}`, borderRadius:8, borderLeft:`3px solid ${item.color}` }}>
                <div style={{ fontSize:10, fontWeight:800, color:item.color, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:13, color:T.inkLight, lineHeight:1.75 }}>{item.value}</div>
              </div>
            ))}
            </div>
          )}
          {generatedHypotheses[`${phase.id}-${selectedTask.id}`] && (
            <div style={{ marginTop:8, fontSize:11, color:phase.band, fontWeight:700 }}>生成済み仮説</div>
          )}
          {slideError && <div style={{ marginTop:10, padding:"8px 10px", background:T.redLight, border:`1px solid #FCCACA`, borderRadius:8, color:T.red, fontSize:11 }}>{slideError}</div>}
          {selectedSlide && (
            <div style={{ marginTop:14 }}>
              {(() => {
                const design = getSlideDesignProfile(selectedSlide.designId);
                const dark = design.colors.canvas.toLowerCase() !== "#ffffff" && design.colors.canvas.toLowerCase() !== "#fbfbfd" && design.colors.canvas.toLowerCase() !== "#fbfaf8" && design.colors.canvas.toLowerCase() !== "#fffdf2";
                return (
            <div style={{ padding:16, background:design.colors.canvas, border:`1px solid ${dark ? "#333640" : T.border}`, borderRadius:design.id==="ibm-carbon"?2:10, color:design.colors.ink }}>
              <div style={{ fontSize:10, fontWeight:800, color:T.inkFaint, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>Slide Draft</div>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:900, color:design.colors.ink, lineHeight:1.4 }}>{selectedSlide.title}</div>
                  <div style={{ fontSize:12, color:design.colors.muted, marginTop:3 }}>{selectedSlide.subtitle}</div>
                </div>
                <div style={{ padding:"3px 7px", background:design.colors.surface, color:design.colors.accent, border:`1px solid ${dark ? "#333640" : T.border}`, borderRadius:design.id==="ibm-carbon"?0:999, fontSize:10, fontWeight:800, whiteSpace:"nowrap" }}>{selectedSlide.designName}</div>
              </div>
              <div style={{ marginTop:10, padding:"9px 11px", background:design.colors.surface, borderRadius:design.id==="ibm-carbon"?0:8, borderLeft:`3px solid ${design.colors.accent}`, fontSize:12, color:design.colors.ink, lineHeight:1.7 }}>{selectedSlide.keyMessage}</div>
              <div style={{ marginTop:8, fontSize:10, color:design.colors.muted, lineHeight:1.5 }}>Design: {selectedSlide.designRationale}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:10 }}>
                {selectedSlide.sections.map((section, i) => (
                  <div key={i}>
                    <div style={{ fontSize:12, fontWeight:800, color:design.colors.accent, marginBottom:3 }}>{section.heading}</div>
                    {(section.bullets || []).map((bullet, j) => <div key={j} style={{ fontSize:11, color:design.colors.muted, lineHeight:1.6 }}>- {bullet}</div>)}
                  </div>
                ))}
              </div>
              {selectedSlide.speakerNote && <div style={{ marginTop:10, fontSize:11, color:design.colors.muted, lineHeight:1.6 }}>Speaker note: {selectedSlide.speakerNote}</div>}
            </div>
                );
              })()}
            </div>
          )}
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
