"use client";
import { useMemo, useState } from "react";
import { Phase, T, TaskHypothesis, TaskHypothesisMap, TaskSlide, TaskSlideMap, SLIDE_DESIGN_PROFILES, getSlideDesignProfile, getTaskHypothesis } from "../lib/constants";
import SlideRenderer from "./SlideRenderer";

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
クライアント文脈に最も合うdesign profileを1つ選び、内容とデザインが整合するようにしてください。

【重要】箇条書き（bullets）ではなく、内容に最適なビジュアル表現を選んでください：
- table: 構造化データ、比較マトリクス、要件一覧
- comparison: A vs B vs C の並列比較（案件比較、オプション選択）
- flow: プロセス・ステップ・因果関係の流れ
- kpi: 重要指標・数値・ターゲット値のハイライト
- matrix: 2軸マトリクス（優先度×影響度、横軸×縦軸の分類）
- bullets: 上記に当てはまらない場合のみ使用

JSONのみ返してください。前置き不要。
形式:
{
  "title": "スライドタイトル",
  "subtitle": "補足見出し",
  "keyMessage": "一番伝えたい主張（1文）",
  "designId": "選択したdesign profile id",
  "designName": "社名ではなくデザイントーン名",
  "designRationale": "このクライアントにこのデザインが合う理由（会社名不要）",
  "sections": [
    各sectionは以下のいずれかのtype形式で:
    {"heading":"見出し","type":"bullets","bullets":["項目"]},
    {"heading":"見出し","type":"table","table":{"headers":["列名"],"rows":[["セル"]]}},
    {"heading":"見出し","type":"comparison","comparison":{"criteria":["評価軸"],"items":[{"label":"案名","values":["値"]}]}},
    {"heading":"見出し","type":"flow","flow":{"steps":[{"label":"ステップ名","desc":"説明"}]}},
    {"heading":"見出し","type":"kpi","kpi":{"metrics":[{"label":"指標名","value":"数値","unit":"単位","trend":"up|down|flat"}]}},
    {"heading":"見出し","type":"matrix","matrix":{"xLabel":"X軸ラベル","yLabel":"Y軸ラベル","cells":[{"x":"high|low","y":"high|low","label":"項目名","desc":"説明"}]}}
  ],
  "speakerNote": "話す時の補足"
}`;

export default function TasksTab({ phase, completedTasks, generatedHypotheses, taskSlides, projectContext, toggleTask, updateHypothesis, updateTaskSlide }: Props) {
  const [selectedByPhase, setSelectedByPhase] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskHypothesis | null>(null);
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [slideView, setSlideView] = useState<"preview" | "image">("preview");
  const selectedTaskId = selectedByPhase[phase.id] ?? phase.tasks[0]?.id ?? "";
  const selectedTask = useMemo(
    () => phase.tasks.find((task) => task.id === selectedTaskId) ?? phase.tasks[0],
    [phase, selectedTaskId]
  );
  const selectedDone = selectedTask ? !!completedTasks[`${phase.id}-${selectedTask.id}`] : false;
  const selectedHypothesis = selectedTask ? getTaskHypothesis(phase.id, selectedTask.id, generatedHypotheses) : null;
  const selectedKey = selectedTask ? `${phase.id}-${selectedTask.id}` : "";
  const selectedSlide = selectedKey ? taskSlides[selectedKey] : null;
  const cleanDesignName = (name: string) => name.replace(/^(IBM|Apple|Stripe|Notion|Linear|Miro)\s*/i, "");

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
    setSlideView("preview");
    try {
      const slide = await callJSON<TaskSlide>(SLIDE_SYSTEM, `プロジェクトコンテキスト:\n${projectContext || "未入力"}\n\nフェーズ:\n${phase.label}\n${phase.description}\n\nタスク:\n${selectedTask.label}\n${selectedTask.desc}\n\n仮説情報:\n${JSON.stringify(selectedHypothesis, null, 2)}\n\n利用可能なdesign profiles:\n${JSON.stringify(SLIDE_DESIGN_PROFILES.map(({ id, name, bestFor, designMd }) => ({ id, name, bestFor, designMd })), null, 2)}\n\nこのタスクの成果物として、意思決定者に見せられる1枚スライドを作成してください。`, 2800);
      const profile = getSlideDesignProfile(slide.designId);
      updateTaskSlide(selectedKey, {
        title: slide.title || selectedTask.label,
        subtitle: slide.subtitle || phase.label,
        keyMessage: slide.keyMessage || selectedHypothesis.currentHypothesis,
        designId: profile.id,
        designName: cleanDesignName(slide.designName || profile.name),
        designRationale: slide.designRationale || "プロジェクト文脈に合わせて自動選択しました。",
        sections: Array.isArray(slide.sections) ? slide.sections : [],
        speakerNote: slide.speakerNote || "",
      });
    } catch (e) {
      setSlideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSlideLoading(false);
    }
  };

  const generateImage = async (provider: "gemini" | "openai") => {
    if (!selectedSlide || !selectedKey || imageLoading) return;
    setImageLoading(true);
    setImageError(null);
    try {
      const design = getSlideDesignProfile(selectedSlide.designId);
      const endpoint = provider === "openai" ? "/api/slide-image-openai" : "/api/slide-image";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide: selectedSlide, design }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      updateTaskSlide(selectedKey, { ...selectedSlide, imageData: data.imageData, imageMimeType: data.mimeType });
      setSlideView("image");
    } catch (e) {
      setImageError(e instanceof Error ? e.message : String(e));
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="tasks-layout" style={{ display:"grid", gridTemplateColumns:"3fr 7fr", gap:14, alignItems:"start" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {phase.tasks.map(task => {
          const done = !!completedTasks[`${phase.id}-${task.id}`];
          const selected = selectedTask?.id === task.id;
          return (
            <div key={task.id} onClick={() => setSelectedByPhase((prev) => ({ ...prev, [phase.id]: task.id }))}
              style={{ background:T.white, border:`1px solid ${selected?phase.band:done?phase.band+"55":T.border}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", display:"flex", gap:12, alignItems:"flex-start", transition:"all 0.15s", opacity:done?0.72:1, boxShadow:selected?"0 6px 18px rgba(0,0,0,0.06)":"none" }}>
              <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} aria-label={`${task.label}を${done ? "未完了" : "完了"}にする`}
                style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${done?phase.band:T.border}`, background:done?phase.band:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all 0.15s", cursor:"pointer", padding:0 }}>
                {done && <span style={{ color:T.white, fontSize:12, fontWeight:900 }}>✓</span>}
              </button>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:done?400:600, color:T.ink, textDecoration:done?"line-through":"none", lineHeight:1.45 }}>{task.label}</div>
                <div style={{ fontSize:13, color:T.inkMuted, marginTop:3, lineHeight:1.6 }}>{task.desc}</div>
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
              <div style={{ fontSize:13, fontWeight:800, color:T.inkFaint, textTransform:"uppercase", letterSpacing:"0.06em" }}>タスク仮説</div>
              <div style={{ fontSize:16, fontWeight:800, color:T.ink, lineHeight:1.5 }}>{selectedTask.label}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <button onClick={startEdit} style={{ padding:"7px 11px", borderRadius:8, border:`1px solid ${T.border}`, background:T.offWhite, color:T.inkMuted, cursor:"pointer", fontSize:14, fontWeight:700 }}>仮説を編集</button>
            <button onClick={generateSlide} disabled={slideLoading} style={{ padding:"7px 11px", borderRadius:8, border:"none", background:slideLoading?T.paper:phase.band, color:slideLoading?T.inkFaint:T.white, cursor:slideLoading?"not-allowed":"pointer", fontSize:14, fontWeight:800 }}>{slideLoading ? "生成中..." : "スライド生成"}</button>
            {selectedSlide && (
              <>
                <button onClick={() => generateImage("gemini")} disabled={imageLoading} style={{ padding:"7px 11px", borderRadius:8, border:"none", background:imageLoading?T.paper:"#4285F4", color:imageLoading?T.inkFaint:T.white, cursor:imageLoading?"not-allowed":"pointer", fontSize:14, fontWeight:800 }}>{imageLoading ? "生成中..." : "🎨 Gemini"}</button>
                <button onClick={() => generateImage("openai")} disabled={imageLoading} style={{ padding:"7px 11px", borderRadius:8, border:"none", background:imageLoading?T.paper:"#10A37F", color:imageLoading?T.inkFaint:T.white, cursor:imageLoading?"not-allowed":"pointer", fontSize:14, fontWeight:800 }}>{imageLoading ? "生成中..." : "🖼 gpt-image"}</button>
              </>
            )}
          </div>

          {editing && draft ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {([
                ["currentHypothesis", "現状仮説"],
                ["missingInfo", "不足情報"],
                ["discussionPoints", "議論ポイント"],
                ["conclusion", "結論"],
              ] as const).map(([key, label]) => (
                <label key={key} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <span style={{ fontSize:12, fontWeight:800, color:T.inkFaint, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
                  <textarea value={draft[key]} onChange={(e) => setDraft((prev) => prev ? { ...prev, [key]: e.target.value } : prev)}
                    style={{ width:"100%", minHeight:64, padding:"9px 10px", borderRadius:8, border:`1px solid ${T.border}`, background:T.offWhite, color:T.ink, fontSize:14, lineHeight:1.6, resize:"vertical", fontFamily:"inherit", outline:"none" }} />
                </label>
              ))}
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={() => setEditing(false)} style={{ padding:"7px 11px", borderRadius:8, border:`1px solid ${T.border}`, background:T.white, color:T.inkMuted, cursor:"pointer", fontSize:14, fontWeight:700 }}>キャンセル</button>
                <button onClick={saveEdit} style={{ padding:"7px 11px", borderRadius:8, border:"none", background:T.ink, color:T.white, cursor:"pointer", fontSize:14, fontWeight:800 }}>保存</button>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
              { label:"現状仮説", value:selectedHypothesis?.currentHypothesis, color:phase.band },
              { label:"不足情報", value:selectedHypothesis?.missingInfo, color:T.blue },
              { label:"議論ポイント", value:selectedHypothesis?.discussionPoints, color:T.orange },
              { label:"結論", value:selectedHypothesis?.conclusion, color:T.green },
            ].map((item) => (
              <div key={item.label} style={{ padding:"11px 12px", background:T.offWhite, border:`1px solid ${T.borderLight}`, borderRadius:8, borderLeft:`3px solid ${item.color}` }}>
                <div style={{ fontSize:12, fontWeight:800, color:item.color, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:15, color:T.inkLight, lineHeight:1.75 }}>{item.value}</div>
              </div>
            ))}
            </div>
          )}
          {generatedHypotheses[`${phase.id}-${selectedTask.id}`] && (
            <div style={{ marginTop:8, fontSize:13, color:phase.band, fontWeight:700 }}>生成済み仮説</div>
          )}
          {slideError && <div style={{ marginTop:10, padding:"8px 10px", background:T.redLight, border:`1px solid #FCCACA`, borderRadius:8, color:T.red, fontSize:14 }}>{slideError}</div>}
          {imageError && <div style={{ marginTop:10, padding:"8px 10px", background:T.redLight, border:`1px solid #FCCACA`, borderRadius:8, color:T.red, fontSize:14 }}>AI画像エラー: {imageError}</div>}
          {selectedSlide && (
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                <button onClick={() => setSlideView("preview")} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${slideView==="preview"?phase.band:T.border}`, background:slideView==="preview"?`${phase.band}18`:T.offWhite, color:slideView==="preview"?phase.band:T.inkMuted, cursor:"pointer", fontSize:14, fontWeight:700 }}>スライド</button>
                {selectedSlide.imageData && (
                  <button onClick={() => setSlideView("image")} style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${slideView==="image"?"#4285F4":T.border}`, background:slideView==="image"?"#EAF1FF":T.offWhite, color:slideView==="image"?"#4285F4":T.inkMuted, cursor:"pointer", fontSize:14, fontWeight:700 }}>🎨 AI 画像</button>
                )}
              </div>
              {slideView === "image" && selectedSlide.imageData ? (
                <img
                  src={`data:${selectedSlide.imageMimeType ?? "image/png"};base64,${selectedSlide.imageData}`}
                  alt={selectedSlide.title}
                  style={{ width:"100%", borderRadius:10, border:`1px solid ${T.border}`, display:"block" }}
                />
              ) : (
                <SlideRenderer slide={selectedSlide} design={getSlideDesignProfile(selectedSlide.designId)} cleanDesignName={cleanDesignName} />
              )}
            </div>
          )}
          <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
            <span style={{ fontSize:13, color:T.inkFaint }}>進捗状態</span>
            <button onClick={() => toggleTask(selectedTask.id)}
              style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${selectedDone?phase.band:T.border}`, background:selectedDone?`${phase.band}14`:T.offWhite, color:selectedDone?phase.band:T.inkMuted, cursor:"pointer", fontSize:14, fontWeight:700 }}>
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
