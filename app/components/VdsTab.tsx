"use client";
import { useEffect, useRef, useState } from "react";
import {
  AGENTS, T, ReviewResult, ConceptResult, ConceptElementKey, CONCEPT_ELEMENTS,
  COMPETITOR_TIERS, JUDGEMENT_AXES, APPEAL_AXES, LOCK_APPROACHES,
  CompetitorTierEntry, CompetitiveAxisEntry, CompetitorTierKey, JudgementAxisKey, AppealAxisKey,
  AdvantageTree, AdvantageCoreNode, LockEntry, LockApproachKey, SustainCycle,
} from "../lib/constants";
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

const DOWNSTREAM = ["strategy", "revenue", "project"];

const BLOCK_FIELD_LABELS: Record<string, Record<string, string>> = {
  strategy: { competitor: "競合代替品", chosenReason: "選ばれる理由", keepChosenReason: "選ばれ続ける理由", activity: "活動・機能・仕組み", ownResource: "自社リソース", partnerResource: "パートナーリソース", channel: "チャネル・提供手段", accumulated: "蓄積されるもの", strengthened: "成長・強化されるもの" },
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

const TIER_LABEL: Record<CompetitorTierKey, string> = Object.fromEntries(COMPETITOR_TIERS.map((t) => [t.key, t.label])) as Record<CompetitorTierKey, string>;
const TIER_DESC: Record<CompetitorTierKey, string> = Object.fromEntries(COMPETITOR_TIERS.map((t) => [t.key, t.desc])) as Record<CompetitorTierKey, string>;
const JUDGEMENT_LABEL: Record<JudgementAxisKey, string> = Object.fromEntries(JUDGEMENT_AXES.map((a) => [a.key, a.label])) as Record<JudgementAxisKey, string>;
const APPEAL_LABEL: Record<AppealAxisKey, string> = Object.fromEntries(APPEAL_AXES.map((a) => [a.key, a.label])) as Record<AppealAxisKey, string>;

// 戦略ブロックの構造化表示：競合の4階層 ＋ 競争軸（戦略キャンバス）。
function StrategyExtras({ data, color }: { data: Record<string, unknown> | undefined; color: string }) {
  const tiers: CompetitorTierEntry[] = Array.isArray(data?.competitorTiers) ? (data!.competitorTiers as CompetitorTierEntry[]) : [];
  const axes: CompetitiveAxisEntry[] = Array.isArray(data?.competitiveAxes) ? (data!.competitiveAxes as CompetitiveAxisEntry[]) : [];
  const summary = typeof data?.competitiveAxisSummary === "string" ? data!.competitiveAxisSummary : "";
  const tree = (data?.advantageTree && typeof data.advantageTree === "object" ? data.advantageTree : null) as AdvantageTree | null;
  const cores: AdvantageCoreNode[] = Array.isArray(tree?.cores) ? tree!.cores : [];
  const hasTree = !!tree && (!!tree.hook || cores.length > 0);
  const locks: LockEntry[] = Array.isArray(data?.locks) ? (data!.locks as LockEntry[]) : [];
  const cycle = (data?.sustainCycle && typeof data.sustainCycle === "object" ? data.sustainCycle : null) as SustainCycle | null;
  const loop: string[] = Array.isArray(cycle?.loop) ? cycle!.loop.filter((s) => typeof s === "string" && s.trim()) : [];
  const accumulations: string[] = Array.isArray(cycle?.accumulations) ? cycle!.accumulations : [];
  const hasCycle = !!cycle && (!!cycle.coreReason || loop.length > 0);
  if (tiers.length === 0 && axes.length === 0 && !hasTree && locks.length === 0 && !hasCycle) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {tiers.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>競合の可視化（4階層）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tiers.map((t, i) => (
              <div key={i} style={{ background: T.offWhite, border: `1px solid ${T.borderLight}`, borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span title={TIER_DESC[t.tier]} style={{ fontSize: 12, fontWeight: 800, padding: "1px 8px", background: `${color}18`, color, borderRadius: 10, cursor: "help" }}>{TIER_LABEL[t.tier] ?? t.tier}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>{t.players}</span>
                </div>
                {t.overlap && <div style={{ fontSize: 13, color: T.inkLight, lineHeight: 1.5 }}>{t.overlap}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {axes.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>競争軸（戦略キャンバス：判断軸 × 訴求軸）</div>
          {summary && (
            <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
              <span style={{ fontSize: 10, fontWeight: 800, color, marginRight: 6 }}>競争軸</span>{summary}
            </div>
          )}
          <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.offWhite }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, minWidth: 130 }}>評価軸</th>
                  <th style={{ padding: "8px 8px", borderBottom: `1px solid ${T.border}`, borderLeft: `1px solid ${T.borderLight}`, color: T.inkMuted }}>判断軸</th>
                  <th style={{ padding: "8px 8px", borderBottom: `1px solid ${T.border}`, borderLeft: `1px solid ${T.borderLight}`, color: T.inkMuted }}>訴求軸</th>
                  <th style={{ padding: "8px 8px", borderBottom: `1px solid ${T.border}`, borderLeft: `1px solid ${T.borderLight}`, color: T.inkMuted }}>競争軸</th>
                </tr>
              </thead>
              <tbody>
                {axes.map((ax, i) => (
                  <tr key={i} style={{ background: ax.isCompetitiveAxis ? `${color}0F` : T.white }}>
                    <td style={{ padding: "8px 10px", borderTop: `1px solid ${T.borderLight}`, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, color: T.ink }}>{ax.axis}</div>
                      {ax.note && <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, lineHeight: 1.4 }}>{ax.note}</div>}
                    </td>
                    <td style={{ padding: "8px 8px", borderTop: `1px solid ${T.borderLight}`, borderLeft: `1px solid ${T.borderLight}`, textAlign: "center", color: T.inkLight, verticalAlign: "top" }}>{JUDGEMENT_LABEL[ax.judgement] ?? ax.judgement}</td>
                    <td style={{ padding: "8px 8px", borderTop: `1px solid ${T.borderLight}`, borderLeft: `1px solid ${T.borderLight}`, textAlign: "center", color: T.inkLight, verticalAlign: "top" }}>{APPEAL_LABEL[ax.appeal] ?? ax.appeal}</td>
                    <td style={{ padding: "8px 8px", borderTop: `1px solid ${T.borderLight}`, borderLeft: `1px solid ${T.borderLight}`, textAlign: "center", fontWeight: 800, color: ax.isCompetitiveAxis ? color : T.inkFaint, verticalAlign: "top" }}>{ax.isCompetitiveAxis ? "◎" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {hasTree && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>優位性ツリー（フック → 肝 → 源泉）</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {/* 優位性フック */}
            <div style={{ background: color, color: T.white, borderRadius: 8, padding: "10px 16px", maxWidth: 460, textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.85, letterSpacing: "0.06em" }}>優位性フック｜なぜ選ばれるか・どこで戦うか</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{tree?.hook || "—"}</div>
            </div>
            {tree?.hookReason && (
              <div style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, margin: "6px 0 0", maxWidth: 520, textAlign: "center" }}>{tree.hookReason}</div>
            )}
            {cores.length > 0 && <div style={{ width: 1, height: 14, background: T.border, margin: "8px 0" }} />}
            {/* 構築の肝 → 源泉 */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              {cores.map((c, i) => (
                <div key={i} style={{ flex: "1 1 200px", minWidth: 180, maxWidth: 280, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ background: `${color}14`, color: T.ink, padding: "7px 10px", fontSize: 13.5, fontWeight: 800, borderBottom: `1px solid ${T.borderLight}` }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color, marginRight: 5 }}>肝</span>{c.core}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.inkFaint, marginBottom: 3 }}>源泉（なぜできるか）</div>
                    {Array.isArray(c.sources) && c.sources.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                        {c.sources.map((s, j) => <li key={j} style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{s}</li>)}
                      </ul>
                    ) : <div style={{ fontSize: 13, color: T.inkFaint }}>—</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {locks.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>ロック（選ばれ続ける理由のパターン）</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
            {LOCK_APPROACHES.map((ap) => {
              const items = locks.filter((l) => l.approach === (ap.key as LockApproachKey));
              if (items.length === 0) return null;
              return (
                <div key={ap.key} style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div title={ap.desc} style={{ background: `${color}14`, color: T.ink, padding: "7px 10px", fontSize: 13, fontWeight: 800, borderBottom: `1px solid ${T.borderLight}`, cursor: "help" }}>🔒 {ap.label}</div>
                  <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((l, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{l.pattern}</div>
                        {l.how && <div style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, marginTop: 1 }}>{l.how}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {hasCycle && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>持続サイクル図（蓄積 → 強化 → ロックの好循環）</div>
          <SustainCycleView coreReason={cycle?.coreReason || ""} loop={loop} color={color} />
          {accumulations.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted }}>蓄積されるストック</span>
              {accumulations.map((a, i) => (
                <span key={i} style={{ fontSize: 12.5, padding: "3px 10px", background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 20, color: T.ink }}>{a}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 持続サイクル図：好循環のノードを円環状に配置し、中心にロックの核を置く。
function SustainCycleView({ coreReason, loop, color }: { coreReason: string; loop: string[]; color: string }) {
  const n = loop.length;
  const SIZE = 320;
  const R = 116; // ノードを置く半径
  const center = SIZE / 2;
  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE, margin: "0 auto", maxWidth: "100%" }}>
      {/* 円環の補助線 */}
      <div style={{ position: "absolute", top: center - R, left: center - R, width: R * 2, height: R * 2, borderRadius: "50%", border: `1.5px dashed ${color}55` }} />
      {/* 中心：ロックの核 */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 150, textAlign: "center", background: color, color: T.white, borderRadius: 10, padding: "8px 10px" }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, opacity: 0.85 }}>選ばれ続ける理由</div>
        <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.4, marginTop: 2 }}>{coreReason || "—"}</div>
      </div>
      {/* ループのノード（時計回り、12時起点） */}
      {loop.map((node, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = center + R * Math.cos(angle);
        const y = center + R * Math.sin(angle);
        return (
          <div key={i} style={{ position: "absolute", top: y, left: x, transform: "translate(-50%, -50%)", width: 92, textAlign: "center" }}>
            <div style={{ background: T.white, border: `1px solid ${color}66`, borderRadius: 8, padding: "5px 6px", boxShadow: `0 1px 3px ${color}22` }}>
              <span style={{ fontSize: 9, fontWeight: 800, color, display: "block" }}>{i + 1}{i === n - 1 ? " ↺" : " →"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{node}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 旧・持続戦略ブロック(sustainability)のデータを戦略ブロックへ統合する非破壊マイグレーション。
// strategy に accumulated/strengthened が無ければ旧データから引き継ぐ（元データは削除しない）。
function migrateSustainability(results: VdsResults): { results: VdsResults; changed: boolean } {
  const sus = results.sustainability?.data as Record<string, unknown> | undefined;
  if (!sus) return { results, changed: false };
  const stratRes = results.strategy;
  const strat = { ...((stratRes?.data as Record<string, unknown>) ?? {}) };
  let changed = false;
  for (const key of ["accumulated", "strengthened"] as const) {
    if (sus[key] && !strat[key]) { strat[key] = sus[key]; changed = true; }
  }
  if (!changed) return { results, changed: false };
  return {
    results: { ...results, strategy: { data: strat, review: stratRes?.review ?? null, attempts: stratRes?.attempts ?? 0, confirmedElements: stratRes?.confirmedElements } },
    changed: true,
  };
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
  const migrated = migrateSustainability(results);
  const [resultsState, setResultsState] = useState<VdsResults>(migrated.results);
  const [runtime, setRuntime] = useState<Record<string, BlockRuntime>>({});
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [canvasFull, setCanvasFull] = useState(false);
  const resultsRef = useRef<VdsResults>(migrated.results);

  // 統合マイグレーションが発生したら一度だけ保存する。
  useEffect(() => {
    if (migrated.changed) onPersist(migrated.results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
  const onEditBlock = (block: "strategy" | "revenue", field: string, value: string) => {
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
                        {id === "strategy" && <StrategyExtras data={res.data as Record<string, unknown> | undefined} color={agent.color} />}
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
