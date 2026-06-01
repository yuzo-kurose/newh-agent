"use client";
import { useRef, useState } from "react";
import {
  AGENTS, T, ReviewResult, ConceptResult, ConceptScore, ConceptViewpointKey, CONCEPT_VIEWPOINTS,
  PROBLEM_QUALITY_FACTORS, ISSUE_QUALITY_FACTORS, GrowthStoryPhase, TargetSegment,
} from "../lib/constants";
import { runBlock, BlockPhase } from "../lib/generate";

export interface VdsBlockResult {
  data: unknown;
  review: ReviewResult | null;
  attempts: number;
}
export type VdsResults = Record<string, VdsBlockResult>;

interface Props {
  projectContext: string;
  results: VdsResults;
  onPersist: (results: VdsResults) => void;
}

const ORDER = ["concept", "strategy", "sustainability", "revenue", "project"];

const BLOCK_FIELD_LABELS: Record<string, Record<string, string>> = {
  strategy: { market: "市場", competitor: "競合", advantage: "戦略・優位性", mechanism: "仕組み" },
  sustainability: { assets: "強みとなる資産", accumulation: "蓄積されるもの", loop: "強化ループ" },
  revenue: { revenueStructure: "収益構造", costStructure: "コスト", balanceOutlook: "収支見立て" },
};

type RuntimePhase = BlockPhase | "idle" | "error";
interface BlockRuntime { phase: RuntimePhase; attempt: number; streamText?: string; error?: string }

const PHASE_LABEL: Record<RuntimePhase, string> = {
  idle: "未生成", generating: "生成中…", reviewing: "レビュー中…", retry: "再生成中…", done: "完了", error: "エラー",
};

function scoreColor(score: number): string {
  const s = Math.max(1, Math.min(5, score || 0));
  return `rgba(26,122,60,${0.06 + (s / 5) * 0.22})`;
}

// 任意のJSON値を読みやすく再帰描画する（コンセプト以外のブロック用）。
function RenderValue({ value }: { value: unknown }): React.ReactElement {
  if (value === null || value === undefined || value === "") return <span style={{ color: T.inkFaint }}>—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span style={{ whiteSpace: "pre-wrap" }}>{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: "4px 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {value.map((item, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.6 }}><RenderValue value={item} /></li>)}
      </ul>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted }}>{k}:</span>
          <span style={{ fontSize: 12.5 }}><RenderValue value={v} /></span>
        </div>
      ))}
    </div>
  );
}

const Field = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ background: T.offWhite, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 12.5, lineHeight: 1.65, color: T.ink, whiteSpace: "pre-wrap" }}>{value || "—"}</div>
  </div>
);

// 問題/課題の質を4要素のスコア＋一言コメントで表示。
function QualityFactors({ factors, scores }: { factors: readonly { key: string; label: string }[]; scores: Record<string, ConceptScore> | undefined }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${factors.length}, 1fr)`, gap: 6 }}>
      {factors.map((f) => {
        const cell = scores?.[f.key];
        const sc = cell?.score ?? 0;
        return (
          <div key={f.key} style={{ border: `1px solid ${T.borderLight}`, borderRadius: 6, padding: "6px 8px", background: scoreColor(sc) }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMuted }}>{f.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{sc || "–"}</div>
            {cell?.comment && <div style={{ fontSize: 9.5, color: T.inkMuted, lineHeight: 1.3, marginTop: 2 }}>{cell.comment}</div>}
          </div>
        );
      })}
    </div>
  );
}

function ConceptView({ data, color }: { data: ConceptResult; color: string }) {
  const segments: TargetSegment[] = Array.isArray(data.targetSegments) ? data.targetSegments : [];
  const story: GrowthStoryPhase[] = Array.isArray(data.growthStory) ? data.growthStory : [];
  const viewpoints: string[] = Array.isArray(data.primaryViewpoints) ? data.primaryViewpoints : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.oneLineConcept && (
        <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderRadius: 8, padding: "12px 14px", fontSize: 14, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
          {data.oneLineConcept}
        </div>
      )}

      <Field label="誰（顧客）" value={data.customer} color={color} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <Field label="🔬 ミクロの確信（n1の実在顧客）" value={data.n1Customer} color={T.blue} />
        <Field label="🌐 マクロの確証（市場サイズ）" value={data.marketSize} color={T.orange} />
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted }}>問題と課題</div>
        <div>
          <Field label="問題（解決が望まれる状態）" value={data.problem} color={color} />
          <div style={{ marginTop: 6 }}><QualityFactors factors={PROBLEM_QUALITY_FACTORS} scores={data.problemQuality} /></div>
        </div>
        <div>
          <Field label="課題（据える背景要因）" value={data.pain} color={color} />
          <div style={{ marginTop: 6 }}><QualityFactors factors={ISSUE_QUALITY_FACTORS} scores={data.issueQuality} /></div>
        </div>
        {data.structureMethod && (
          <div style={{ fontSize: 11, color: T.inkMuted, lineHeight: 1.6 }}>
            構造化手法：<b style={{ color: T.ink }}>{data.structureMethod}</b>{data.structureReason ? ` — ${data.structureReason}` : ""}
          </div>
        )}
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted }}>手法と価値（抽象 → 具体）</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          <div>
            <Field label="手法（顧客に何を提供するか）" value={data.method} color={color} />
            {Array.isArray(data.methodFunctions) && data.methodFunctions.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: T.inkFaint, marginBottom: 3 }}>機能（具体）</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                  {data.methodFunctions.map((f, i) => <li key={i} style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div>
            <Field label="価値（顧客が何を得るか・before→after）" value={data.value} color={color} />
            {Array.isArray(data.valueExperiences) && data.valueExperiences.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: T.inkFaint, marginBottom: 3 }}>体験（具体）</div>
                <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
                  {data.valueExperiences.map((e, i) => <li key={i} style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
        {Array.isArray(data.ideaApproaches) && data.ideaApproaches.length > 0 && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: T.inkFaint, marginBottom: 4 }}>発想の着眼点（HMW → 案）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.ideaApproaches.map((a, i) => (
                <div key={i} style={{ background: T.offWhite, border: `1px solid ${T.borderLight}`, borderRadius: 6, padding: "7px 9px" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", background: `${color}18`, color, borderRadius: 10 }}>{a.lens}</span>
                  {a.hmw && <div style={{ fontSize: 11.5, color: T.inkLight, marginTop: 4, lineHeight: 1.5 }}>Q. {a.hmw}</div>}
                  {a.idea && <div style={{ fontSize: 11.5, color: T.ink, marginTop: 2, lineHeight: 1.5 }}>→ {a.idea}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewpoints.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>初期重要観点</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {viewpoints.map((v, i) => (
              <span key={i} style={{ fontSize: 11, padding: "4px 10px", background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 20, color: T.ink }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {segments.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>ターゲット顧客 × 9観点評価</div>
          <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.offWhite }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", position: "sticky", left: 0, background: T.offWhite, borderBottom: `1px solid ${T.border}`, minWidth: 130 }}>セグメント</th>
                  {CONCEPT_VIEWPOINTS.map((vp) => (
                    <th key={vp.key} style={{ padding: "8px 6px", borderBottom: `1px solid ${T.border}`, borderLeft: `1px solid ${T.borderLight}`, minWidth: 76, fontWeight: 700, color: T.inkMuted, lineHeight: 1.3 }}>{vp.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((seg, i) => (
                  <tr key={i}>
                    <td style={{ padding: "8px 10px", borderTop: `1px solid ${T.borderLight}`, position: "sticky", left: 0, background: T.white, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, color: T.ink }}>{seg.name}</div>
                      {seg.axis && <div style={{ fontSize: 10, color: T.inkFaint, marginTop: 2 }}>{seg.axis}</div>}
                    </td>
                    {CONCEPT_VIEWPOINTS.map((vp) => {
                      const cell = seg.scores?.[vp.key as ConceptViewpointKey];
                      const sc = cell?.score ?? 0;
                      return (
                        <td key={vp.key} title={cell?.comment || ""} style={{ padding: "6px", borderTop: `1px solid ${T.borderLight}`, borderLeft: `1px solid ${T.borderLight}`, background: scoreColor(sc), verticalAlign: "top" }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: T.ink, textAlign: "center" }}>{sc || "–"}</div>
                          {cell?.comment && <div style={{ fontSize: 9.5, color: T.inkMuted, marginTop: 2, lineHeight: 1.3 }}>{cell.comment}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {story.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>成長ストーリー</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {story.map((ph, i) => (
              <div key={i} style={{ minWidth: 190, flex: "0 0 auto", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: color, color: T.white, padding: "6px 10px", fontSize: 12, fontWeight: 800 }}>{i + 1}. {ph.phase}</div>
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {([["KGI", ph.kgi], ["重点", ph.focus], ["BM", ph.businessModel], ["アセット", ph.asset]] as const).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: T.inkFaint }}>{k}</div>
                      <div style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>{v || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewBadge({ review }: { review: ReviewResult }) {
  const pass = review.passOrRetry === "pass" || review.score >= 60;
  const c = pass ? T.green : T.red;
  const bg = pass ? T.greenLight : T.redLight;
  return (
    <div style={{ background: bg, border: `1px solid ${c}33`, borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: c }}>レビュー {review.grade} / {review.score}点</span>
        <span style={{ fontSize: 10, color: c }}>{pass ? "合格" : "要改善"}</span>
      </div>
      {review.goodPoint && <div style={{ fontSize: 11, color: T.inkLight }}>👍 {review.goodPoint}</div>}
      {Array.isArray(review.issues) && review.issues.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {review.issues.map((iss, i) => <li key={i} style={{ fontSize: 11, color: T.inkLight, lineHeight: 1.5 }}>{iss}</li>)}
        </ul>
      )}
      {review.mustFix && <div style={{ fontSize: 11, color: c, fontWeight: 600 }}>最重要: {review.mustFix}</div>}
    </div>
  );
}

export default function VdsTab({ projectContext, results, onPersist }: Props) {
  const [brief, setBrief] = useState(projectContext);
  const [resultsState, setResultsState] = useState<VdsResults>(results);
  const [runtime, setRuntime] = useState<Record<string, BlockRuntime>>({});
  const [running, setRunning] = useState(false);
  const resultsRef = useRef<VdsResults>(results);

  const setPhase = (id: string, patch: Partial<BlockRuntime>) =>
    setRuntime((r) => {
      const base: BlockRuntime = r[id] ?? { phase: "idle", attempt: 0 };
      return { ...r, [id]: { ...base, ...patch } };
    });

  const generate = async (blocks: string[]) => {
    if (!brief.trim() || running) return;
    setRunning(true);
    const prev: Record<string, unknown> = {};
    for (const id of ORDER) if (resultsRef.current[id]) prev[id] = resultsRef.current[id].data;

    for (const id of blocks) {
      setPhase(id, { phase: "generating", attempt: 1, streamText: "", error: undefined });
      try {
        const { data, review, attempts } = await runBlock(id, brief, prev, {
          onPhase: (phase, attempt) => setPhase(id, { phase, attempt }),
          onDelta: (t) => setRuntime((r) => ({ ...r, [id]: { ...(r[id] ?? { phase: "generating", attempt: 1 }), streamText: ((r[id]?.streamText) ?? "") + t } })),
        });
        prev[id] = data;
        const next = { ...resultsRef.current, [id]: { data, review, attempts } };
        resultsRef.current = next;
        setResultsState(next);
        onPersist(next);
        setPhase(id, { phase: "done" });
      } catch (e) {
        setPhase(id, { phase: "error", error: e instanceof Error ? e.message : "生成に失敗しました。" });
        break;
      }
    }
    setRunning(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 920 }}>
      <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
        プロジェクトコンテキストを起点に、VDS（バリューデザイン・シンタックス）の各ブロックを「生成 → レビュー → リトライ」で作成します。コンセプトはミクロの確信とマクロの確証を両立した9観点評価・成長ストーリー付きで生成します。
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, marginBottom: 4 }}>案件ブリーフ（プロジェクトコンテキストから引用・編集可）</div>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="例：大手食品メーカー。50代向けの健康食品の新規事業を立ち上げたい。予算は半年・チーム3名。"
          style={{ width: "100%", minHeight: 90, padding: "10px 12px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => generate(["concept"])} disabled={running || !brief.trim()}
          style={{ padding: "9px 16px", background: running || !brief.trim() ? T.paper : AGENTS.concept.color, border: "none", borderRadius: 8, color: running || !brief.trim() ? T.inkFaint : T.white, fontSize: 12, fontWeight: 700, cursor: running || !brief.trim() ? "not-allowed" : "pointer" }}>
          コンセプトを生成
        </button>
        <button onClick={() => generate(ORDER)} disabled={running || !brief.trim()}
          style={{ padding: "9px 16px", background: running || !brief.trim() ? T.paper : T.ink, border: "none", borderRadius: 8, color: running || !brief.trim() ? T.inkFaint : T.white, fontSize: 12, fontWeight: 700, cursor: running || !brief.trim() ? "not-allowed" : "pointer" }}>
          VDS全体を生成 →
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ORDER.map((id) => {
          const agent = AGENTS[id];
          const rt = runtime[id];
          const res = resultsState[id];
          const phase = rt?.phase ?? (res ? "done" : "idle");
          const busy = phase === "generating" || phase === "reviewing" || phase === "retry";
          return (
            <div key={id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: `${agent.color}18`, color: agent.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{agent.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{agent.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: phase === "error" ? T.red : phase === "done" ? T.green : T.inkMuted }}>
                  {PHASE_LABEL[phase]}{busy && rt?.attempt ? `（試行${rt.attempt}）` : ""}
                </span>
              </div>

              <div style={{ padding: "12px 14px" }}>
                {phase === "error" && <div style={{ fontSize: 12, color: T.red }}>⚠ {rt?.error}</div>}

                {busy && (
                  <div style={{ fontSize: 11, color: T.inkFaint, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "hidden", lineHeight: 1.5 }}>
                    {rt?.streamText ? rt.streamText.slice(-400) : "生成しています…"}
                  </div>
                )}

                {!busy && !res && phase !== "error" && (
                  <div style={{ fontSize: 12, color: T.inkFaint }}>未生成です。</div>
                )}

                {!busy && res && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {id === "concept"
                      ? <ConceptView data={res.data as ConceptResult} color={agent.color} />
                      : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {BLOCK_FIELD_LABELS[id]
                            ? Object.entries(BLOCK_FIELD_LABELS[id]).map(([key, label]) => (
                                <Field key={key} label={label} value={String((res.data as Record<string, unknown>)?.[key] ?? "")} color={agent.color} />
                              ))
                            : <RenderValue value={res.data} />}
                        </div>
                      )}
                    {res.review && <ReviewBadge review={res.review} />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
