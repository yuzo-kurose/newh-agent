"use client";
import { useRef, useState } from "react";
import { AGENTS, T, ReviewResult, ConceptResult, ConceptElementKey, CONCEPT_ELEMENTS } from "../lib/constants";
import { runBlock, BlockPhase } from "../lib/generate";
import { Field, RenderValue } from "./conceptParts";
import ConceptStudio from "./ConceptStudio";
import VdsCanvas from "./VdsCanvas";

export interface VdsBlockResult {
  data: unknown;
  review: ReviewResult | null;
  attempts: number;
  confirmedElements?: ConceptElementKey[]; // コンセプトの確定済み要素
}
export type VdsResults = Record<string, VdsBlockResult>;

interface Props {
  projectId: string;
  projectContext: string;
  results: VdsResults;
  onPersist: (results: VdsResults) => void;
}

const DOWNSTREAM = ["strategy", "sustainability", "revenue", "project"];

const BLOCK_FIELD_LABELS: Record<string, Record<string, string>> = {
  strategy: { competitor: "競合代替品", chosenReason: "選ばれる理由", keepChosenReason: "選ばれ続ける理由", activity: "活動・機能・仕組み", ownResource: "自社リソース", partnerResource: "パートナーリソース", channel: "チャネル・提供手段" },
  sustainability: { accumulated: "蓄積されるもの", strengthened: "成長・強化されるもの", sustainabilityReason: "継続性の理由" },
  revenue: { recoveryEngine: "回収エンジン", pricingModel: "料金モデル", costStructure: "コスト構造", profitability: "採算成立" },
};

type RuntimePhase = BlockPhase | "idle" | "error";
interface BlockRuntime { phase: RuntimePhase; attempt: number; streamText?: string; error?: string }

const PHASE_LABEL: Record<RuntimePhase, string> = {
  idle: "未生成", generating: "生成中…", reviewing: "レビュー中…", retry: "再生成中…", done: "完了", error: "エラー",
};

function ReviewBadge({ review }: { review: ReviewResult }) {
  const pass = review.passOrRetry === "pass" || review.score >= 60;
  const c = pass ? T.green : T.red;
  const bg = pass ? T.greenLight : T.redLight;
  return (
    <div style={{ background: bg, border: `1px solid ${c}33`, borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: c }}>レビュー {review.grade} / {review.score}点</span>
        <span style={{ fontSize: 12, color: c }}>{pass ? "合格" : "要改善"}</span>
      </div>
      {review.goodPoint && <div style={{ fontSize: 13, color: T.inkLight }}>👍 {review.goodPoint}</div>}
      {Array.isArray(review.issues) && review.issues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {review.issues.map((iss, i) => <li key={i} style={{ fontSize: 13, color: T.inkLight, lineHeight: 1.5 }}>{iss}</li>)}
        </ul>
      )}
      {review.mustFix && <div style={{ fontSize: 13, color: c, fontWeight: 600 }}>最重要: {review.mustFix}</div>}
    </div>
  );
}

export default function VdsTab({ projectId, projectContext, results, onPersist }: Props) {
  const briefKey = `newh-agent.p.${projectId}.vdsBrief`;
  const [brief, setBrief] = useState<string>(() => {
    if (typeof window === "undefined") return projectContext;
    return window.localStorage.getItem(briefKey) ?? projectContext;
  });

  const updateBrief = (value: string) => {
    setBrief(value);
    if (typeof window !== "undefined") window.localStorage.setItem(briefKey, value);
  };
  const [resultsState, setResultsState] = useState<VdsResults>(results);
  const [runtime, setRuntime] = useState<Record<string, BlockRuntime>>({});
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [canvasFull, setCanvasFull] = useState(false);
  const resultsRef = useRef<VdsResults>(results);

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const conceptResult = resultsState.concept;
  const conceptData = conceptResult?.data as Partial<ConceptResult> | undefined;
  const conceptConfirmed = conceptResult?.confirmedElements ?? [];
  const conceptReady = (conceptConfirmed?.length ?? 0) > 0 && !!conceptData;

  const persist = (next: VdsResults) => {
    resultsRef.current = next;
    setResultsState(next);
    onPersist(next);
  };

  const onConceptChange = (data: Partial<ConceptResult>, confirmed: ConceptElementKey[]) => {
    persist({ ...resultsRef.current, concept: { data, review: null, attempts: 0, confirmedElements: confirmed } });
  };

  // VDS図セルの手動編集（コンセプト）。編集した要素は確定済み扱いにして図に反映する。
  const onEditConcept = (field: string, value: string) => {
    const cur = (resultsRef.current.concept?.data as Partial<ConceptResult>) ?? {};
    const data = { ...cur, [field]: value };
    const owner = CONCEPT_ELEMENTS.find((e) => e.fields.includes(field as keyof ConceptResult))?.key;
    const confirmed = owner && !conceptConfirmed.includes(owner) ? [...conceptConfirmed, owner] : conceptConfirmed;
    persist({ ...resultsRef.current, concept: { data, review: null, attempts: 0, confirmedElements: confirmed } });
  };

  // VDS図セルの手動編集（後続ブロック）。
  const onEditBlock = (block: "strategy" | "sustainability" | "revenue", field: string, value: string) => {
    const prevRes = resultsRef.current[block];
    const cur = (prevRes?.data as Record<string, unknown>) ?? {};
    const data = { ...cur, [field]: value };
    persist({ ...resultsRef.current, [block]: { data, review: prevRes?.review ?? null, attempts: prevRes?.attempts ?? 0 } });
  };

  const setPhase = (id: string, patch: Partial<BlockRuntime>) =>
    setRuntime((r) => {
      const base: BlockRuntime = r[id] ?? { phase: "idle", attempt: 0 };
      return { ...r, [id]: { ...base, ...patch } };
    });

  const generateDownstream = async () => {
    if (!brief.trim() || running || !conceptData) return;
    setRunning(true);
    const prev: Record<string, unknown> = { concept: conceptData };
    for (const id of DOWNSTREAM) if (resultsRef.current[id]) prev[id] = resultsRef.current[id].data;

    for (const id of DOWNSTREAM) {
      setPhase(id, { phase: "generating", attempt: 1, streamText: "", error: undefined });
      try {
        const { data, review, attempts } = await runBlock(id, brief, prev, {
          onPhase: (phase, attempt) => setPhase(id, { phase, attempt }),
          onDelta: (t) => setRuntime((r) => ({ ...r, [id]: { ...(r[id] ?? { phase: "generating", attempt: 1 }), streamText: ((r[id]?.streamText) ?? "") + t } })),
        });
        prev[id] = data;
        persist({ ...resultsRef.current, [id]: { data, review, attempts } });
        setPhase(id, { phase: "done" });
      } catch (e) {
        setPhase(id, { phase: "error", error: e instanceof Error ? e.message : "生成に失敗しました。" });
        break;
      }
    }
    setRunning(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1600 }}>
      {canvasFull && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: T.white, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>VDS全体図</span>
            <span style={{ fontSize: 12, color: T.inkMuted }}>各箱は右下をドラッグでサイズ調整できます</span>
            <button onClick={() => setCanvasFull(false)} style={{ marginLeft: "auto", padding: "7px 16px", background: T.ink, border: "none", borderRadius: 8, color: T.white, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ 閉じる</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            <VdsCanvas
              fullscreen
              concept={conceptData}
              conceptConfirmed={conceptConfirmed}
              strategy={resultsState.strategy?.data as Record<string, unknown> | undefined}
              sustainability={resultsState.sustainability?.data as Record<string, unknown> | undefined}
              revenue={resultsState.revenue?.data as Record<string, unknown> | undefined}
              onEditConcept={onEditConcept}
              onEditBlock={onEditBlock}
            />
          </div>
        </div>
      )}
      <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.7 }}>
        プロジェクトコンテキストを起点に、まず<b>コンセプト</b>を「顧客 → 課題 → 手法 → 価値」の順に提案します。各要素はあなたのフィードバックを反映して何度でも再検証でき、確定した内容が次の要素に引き継がれます。コンセプト確定後、後続のVDSブロックを生成できます。
      </div>

      {/* VDS全体図（確定した要素・生成済みブロックから埋まる） */}
      <div style={{ background: T.offWhite, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
        <div onClick={() => toggle("canvas")} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: collapsed.canvas ? 0 : 10, cursor: "pointer", userSelect: "none" }}>
          <span style={{ fontSize: 13, color: T.inkFaint, width: 14 }}>{collapsed.canvas ? "▶" : "▼"}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>VDS全体図</span>
          <span style={{ fontSize: 11, color: T.inkMuted }}>ビジネスモデルを1つの長文として言語化</span>
          <button onClick={(e) => { e.stopPropagation(); setCanvasFull(true); }}
            style={{ marginLeft: "auto", padding: "5px 12px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 8, color: T.inkMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⛶ 全画面</button>
        </div>
        {!collapsed.canvas && (
          <VdsCanvas
            concept={conceptData}
            conceptConfirmed={conceptConfirmed}
            strategy={resultsState.strategy?.data as Record<string, unknown> | undefined}
            sustainability={resultsState.sustainability?.data as Record<string, unknown> | undefined}
            revenue={resultsState.revenue?.data as Record<string, unknown> | undefined}
            onEditConcept={onEditConcept}
            onEditBlock={onEditBlock}
          />
        )}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.inkMuted, marginBottom: 4 }}>案件ブリーフ（プロジェクトコンテキストから引用・編集可）</div>
        <textarea value={brief} onChange={(e) => updateBrief(e.target.value)} placeholder="例：大手食品メーカー。50代向けの健康食品の新規事業を立ち上げたい。予算は半年・チーム3名。"
          style={{ width: "100%", minHeight: 80, padding: "10px 12px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 15, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
      </div>

      {/* コンセプト・スタジオ */}
      <div>
        <div onClick={() => toggle("concept")} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer", userSelect: "none" }}>
          <span style={{ fontSize: 13, color: T.inkFaint, width: 14 }}>{collapsed.concept ? "▶" : "▼"}</span>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: `${AGENTS.concept.color}18`, color: AGENTS.concept.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{AGENTS.concept.icon}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>ブロック1：コンセプト</span>
        </div>
        {!collapsed.concept && <ConceptStudio brief={brief} color={AGENTS.concept.color} initialData={conceptData} initialConfirmed={conceptConfirmed} onChange={onConceptChange} />}
      </div>

      {/* 後続ブロック */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>後続ブロック（戦略・持続・収支・PJ設計）</span>
          <button onClick={generateDownstream} disabled={running || !conceptData}
            style={{ marginLeft: "auto", padding: "8px 14px", background: running || !conceptData ? T.paper : T.ink, border: "none", borderRadius: 8, color: running || !conceptData ? T.inkFaint : T.white, fontSize: 14, fontWeight: 700, cursor: running || !conceptData ? "not-allowed" : "pointer" }}>
            後続ブロックを生成 →
          </button>
        </div>
        {!conceptData && <div style={{ fontSize: 13.5, color: T.inkFaint, marginBottom: 8 }}>※ まずコンセプトを生成・確定してください（少なくとも顧客の案が必要です）。</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DOWNSTREAM.map((id) => {
            const agent = AGENTS[id];
            const rt = runtime[id];
            const res = resultsState[id];
            const phase = rt?.phase ?? (res ? "done" : "idle");
            const busy = phase === "generating" || phase === "reviewing" || phase === "retry";
            return (
              <div key={id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => toggle(id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: collapsed[id] ? "none" : `1px solid ${T.borderLight}`, cursor: "pointer", userSelect: "none" }}>
                  <span style={{ fontSize: 13, color: T.inkFaint, width: 14 }}>{collapsed[id] ? "▶" : "▼"}</span>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: `${agent.color}18`, color: agent.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{agent.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{agent.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 13, color: phase === "error" ? T.red : phase === "done" ? T.green : T.inkMuted }}>
                    {PHASE_LABEL[phase]}{busy && rt?.attempt ? `（試行${rt.attempt}）` : ""}
                  </span>
                </div>
                {!collapsed[id] && (
                  <div style={{ padding: "12px 14px" }}>
                    {phase === "error" && <div style={{ fontSize: 14, color: T.red }}>⚠ {rt?.error}</div>}
                    {busy && (
                      <div style={{ fontSize: 13, color: T.inkFaint, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "hidden", lineHeight: 1.5 }}>
                        {rt?.streamText ? rt.streamText.slice(-400) : "生成しています…"}
                      </div>
                    )}
                    {!busy && !res && phase !== "error" && <div style={{ fontSize: 14, color: T.inkFaint }}>未生成です。</div>}
                    {!busy && res && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {BLOCK_FIELD_LABELS[id]
                          ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {Object.entries(BLOCK_FIELD_LABELS[id]).map(([key, label]) => (
                                <Field key={key} label={label} value={String((res.data as Record<string, unknown>)?.[key] ?? "")} color={agent.color} />
                              ))}
                            </div>
                          : <RenderValue value={res.data} />}
                        {res.review && <ReviewBadge review={res.review} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
