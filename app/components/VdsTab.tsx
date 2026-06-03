"use client";
import { useEffect, useRef, useState } from "react";
import {
  AGENTS, T, ReviewResult, ConceptResult, ConceptElementKey, CONCEPT_ELEMENTS,
  COMPETITOR_TIERS, JUDGEMENT_AXES, APPEAL_AXES, LOCK_APPROACHES,
  CompetitorTierEntry, CompetitiveAxisEntry, CompetitorTierKey, JudgementAxisKey, AppealAxisKey,
  AdvantageTree, AdvantageCoreNode, LockEntry, LockApproachKey, SustainCycle,
  COST_CATEGORIES, ECONOMICS_LAYERS, COST_PATTERNS, CostCategoryKey, CostPatternKey,
} from "../lib/constants";
import { runBlock, BlockPhase } from "../lib/generate";
import { Field, RenderValue, breakJP } from "./conceptParts";
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
  fullWidth?: boolean; // サイドバーを閉じているときは表示領域を最大化する
}

const DOWNSTREAM = ["strategy", "revenue"];

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

// 並列表示用の見出し付きパネル。
function SubPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

const TWO_COL: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, alignItems: "start" };

function CompetitorTiersView({ tiers, color }: { tiers: CompetitorTierEntry[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {tiers.map((t, i) => (
        <div key={i} style={{ background: T.offWhite, border: `1px solid ${T.borderLight}`, borderRadius: 6, padding: "8px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span title={TIER_DESC[t.tier]} style={{ fontSize: 12, fontWeight: 800, padding: "1px 8px", background: `${color}18`, color, borderRadius: 10, cursor: "help" }}>{TIER_LABEL[t.tier] ?? t.tier}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>{t.players}</span>
          </div>
          {t.overlap && <div style={{ fontSize: 13, color: T.inkLight, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{breakJP(t.overlap)}</div>}
        </div>
      ))}
    </div>
  );
}

function CompetitiveAxesView({ axes, summary, color }: { axes: CompetitiveAxisEntry[]; summary: string; color: string }) {
  return (
    <div>
      {summary && (
        <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
          <span style={{ fontSize: 10, fontWeight: 800, color, marginRight: 6 }}>競争軸</span>{summary}
        </div>
      )}
      <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.offWhite }}>
              <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${T.border}`, minWidth: 120 }}>評価軸</th>
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
  );
}

function AdvantageTreeView({ tree, cores, color }: { tree: AdvantageTree; cores: AdvantageCoreNode[]; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div style={{ background: color, color: T.white, borderRadius: 8, padding: "10px 16px", maxWidth: 460, textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.85, letterSpacing: "0.06em" }}>優位性フック｜なぜ選ばれるか・どこで戦うか</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{tree.hook || "—"}</div>
      </div>
      {tree.hookReason && (
        <div style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, margin: "6px 0 0", maxWidth: 520, textAlign: "center", whiteSpace: "pre-wrap" }}>{breakJP(tree.hookReason)}</div>
      )}
      {cores.length > 0 && <div style={{ width: 1, height: 14, background: T.border, margin: "8px 0" }} />}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
        {cores.map((c, i) => (
          <div key={i} style={{ flex: "1 1 180px", minWidth: 160, maxWidth: 280, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
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
  );
}

function LocksView({ locks, color }: { locks: LockEntry[]; color: string }) {
  return (
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
                  {l.how && <div style={{ fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, marginTop: 1, whiteSpace: "pre-wrap" }}>{breakJP(l.how)}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 戦略ブロックを「優位性／仕組み／持続戦略」のメニュー形式（左メニュー＋右詳細）で表示する。
const STRATEGY_GROUPS = [
  { key: "advantage", label: "優位性", hint: "なぜ勝てるのか" },
  { key: "mechanism", label: "仕組み", hint: "どう実現するのか" },
  { key: "sustainability", label: "持続戦略", hint: "どう選ばれ続けるのか" },
] as const;
type StrategyGroupKey = (typeof STRATEGY_GROUPS)[number]["key"];

function StrategyView({ data, color }: { data: Record<string, unknown> | undefined; color: string }) {
  const [selected, setSelected] = useState<StrategyGroupKey>("advantage");
  const d = data ?? {};
  const fld = (k: string) => String((d as Record<string, unknown>)[k] ?? "");
  const tiers: CompetitorTierEntry[] = Array.isArray(d.competitorTiers) ? (d.competitorTiers as CompetitorTierEntry[]) : [];
  const axes: CompetitiveAxisEntry[] = Array.isArray(d.competitiveAxes) ? (d.competitiveAxes as CompetitiveAxisEntry[]) : [];
  const summary = typeof d.competitiveAxisSummary === "string" ? d.competitiveAxisSummary : "";
  const tree = (d.advantageTree && typeof d.advantageTree === "object" ? d.advantageTree : null) as AdvantageTree | null;
  const cores: AdvantageCoreNode[] = Array.isArray(tree?.cores) ? tree!.cores : [];
  const hasTree = !!tree && (!!tree.hook || cores.length > 0);
  const locks: LockEntry[] = Array.isArray(d.locks) ? (d.locks as LockEntry[]) : [];
  const cycle = (d.sustainCycle && typeof d.sustainCycle === "object" ? d.sustainCycle : null) as SustainCycle | null;
  const loop: string[] = Array.isArray(cycle?.loop) ? cycle!.loop.filter((s) => typeof s === "string" && s.trim()) : [];
  const accumulations: string[] = Array.isArray(cycle?.accumulations) ? cycle!.accumulations : [];
  const hasCycle = !!cycle && (!!cycle.coreReason || loop.length > 0);

  const advantage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Field label="競合代替品" value={fld("competitor")} color={color} />
        <Field label="選ばれる理由" value={fld("chosenReason")} color={color} />
      </div>
      {(tiers.length > 0 || axes.length > 0) && (
        <div style={TWO_COL}>
          {tiers.length > 0 && <SubPanel title="競合の可視化（4階層）"><CompetitorTiersView tiers={tiers} color={color} /></SubPanel>}
          {axes.length > 0 && <SubPanel title="競争軸（判断軸 × 訴求軸）"><CompetitiveAxesView axes={axes} summary={summary} color={color} /></SubPanel>}
        </div>
      )}
      {(hasTree || hasCycle) && (
        <div style={TWO_COL}>
          {hasTree && <SubPanel title="優位性ツリー（フック → 肝 → 源泉）"><AdvantageTreeView tree={tree!} cores={cores} color={color} /></SubPanel>}
          {hasCycle && (
            <SubPanel title="持続サイクル図（蓄積 → 強化 → ロックの好循環）">
              <SustainCycleView coreReason={cycle?.coreReason || ""} loop={loop} color={color} />
              {accumulations.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted }}>蓄積されるストック</span>
                  {accumulations.map((a, i) => (
                    <span key={i} style={{ fontSize: 12.5, padding: "3px 10px", background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 20, color: T.ink }}>{a}</span>
                  ))}
                </div>
              )}
            </SubPanel>
          )}
        </div>
      )}
    </div>
  );

  const mechanism = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Field label="活動・機能・仕組み" value={fld("activity")} color={color} />
      <Field label="自社リソース" value={fld("ownResource")} color={color} />
      <Field label="パートナーリソース" value={fld("partnerResource")} color={color} />
      <Field label="チャネル・提供手段" value={fld("channel")} color={color} />
    </div>
  );

  const sustainability = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Field label="選ばれ続ける理由（ロック）" value={fld("keepChosenReason")} color={color} />
        <Field label="蓄積されるもの" value={fld("accumulated")} color={color} />
        <Field label="成長・強化されるもの" value={fld("strengthened")} color={color} />
      </div>
      {locks.length > 0 && <SubPanel title="ロック（選ばれ続ける理由のパターン）"><LocksView locks={locks} color={color} /></SubPanel>}
    </div>
  );

  const content: Record<StrategyGroupKey, React.ReactNode> = { advantage, mechanism, sustainability };
  const current = STRATEGY_GROUPS.find((g) => g.key === selected)!;

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* 左：メニュー */}
      <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {STRATEGY_GROUPS.map((g, i) => {
          const isSel = g.key === selected;
          return (
            <button key={g.key} onClick={() => setSelected(g.key)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: isSel ? T.white : "transparent", border: `1px solid ${isSel ? color : T.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? color : T.paper, color: isSel ? T.white : T.inkMuted }}>{i + 1}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: isSel ? T.ink : T.inkMuted }}>{g.label}</span>
              </div>
              <span style={{ fontSize: 12, color: T.inkFaint, paddingLeft: 26 }}>{g.hint}</span>
            </button>
          );
        })}
      </div>

      {/* 右：詳細 */}
      <div style={{ flex: 1, minWidth: 280, border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 12 }}>{current.label}<span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginLeft: 8 }}>{current.hint}</span></div>
        {content[selected]}
      </div>
    </div>
  );
}

// 収支モデルブロックの構造化表示：売上の構造／コスト4分類／収益性4階層／事業成立の急所。
const COST_FIELD: Record<CostCategoryKey, string> = { valueDelivery: "costValueDelivery", scaleRealization: "costScaleRealization", maintenance: "costMaintenance", launchEnhancement: "costLaunchEnhancement" };
const ECON_FIELD: Record<string, string> = { value: "econValue", unit: "econUnit", business: "econBusiness", invest: "econInvest" };
// 各エコノミクスでバランスする収入（アウトプット）と支出（インプット）。
const ECON_BALANCE: Record<string, { income: string; incomeField: string; expense: string; expenseField: string }> = {
  value: { income: "単価", incomeField: "unitPrice", expense: "価値提供コスト", expenseField: "costValueDelivery" },
  unit: { income: "LTV（取引利益×継続期間）", incomeField: "ltv", expense: "顧客獲得コスト（CAC）", expenseField: "costScaleRealization" },
  business: { income: "限界利益・事業売上", incomeField: "marginalProfit", expense: "維持運営コスト（固定費）", expenseField: "costMaintenance" },
  invest: { income: "累積収益", incomeField: "cumulativeRevenue", expense: "累積支出（初期投資含む）", expenseField: "costLaunchEnhancement" },
};

// 4つのエコノミクスの関係性図（図10-15）を再現した参照図。①→②→③→④へ積み上がる構造を示す。
function EconomicsFigure({ color }: { color: string }) {
  const cost = T.paper, base = `${color}26`, profit = color;
  // (left, top, w, h, bg, textColor, label, sub?)
  const Box = (left: number, top: number, w: number, h: number, bg: string, tc: string, label: string, sub?: string) => (
    <div style={{ position: "absolute", left, top, width: w, height: h, background: bg, border: `1px solid ${T.border}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 2, boxSizing: "border-box" }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1.15, color: tc }}>{label}</span>
      {sub && <span style={{ fontSize: 8, color: tc === T.white ? "rgba(255,255,255,0.85)" : T.inkMuted, lineHeight: 1.1 }}>{sub}</span>}
    </div>
  );
  const cap = (left: number, top: number, mark: string, title: string, sub: string) => (
    <div style={{ position: "absolute", left, top, width: 160 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.ink }}>{mark}{title}</div>
      <div style={{ fontSize: 10, color: T.inkMuted }}>{sub}</div>
    </div>
  );
  const axis = (left: number, top: number, w: number, label: string) => (
    <div style={{ position: "absolute", left, top, width: w, borderTop: `1px dashed ${T.inkFaint}`, fontSize: 9, color: T.inkFaint, textAlign: "right" }}>{label} →</div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", width: 600, height: 482, margin: "0 auto", fontFamily: "inherit" }}>
        {/* ① バリューエコノミクス（左下）：単価 ＝ 価値提供コスト ＋ 取引あたり利益 */}
        <div style={{ position: "absolute", left: 16, top: 384, fontSize: 9, fontWeight: 700, color: T.ink, writingMode: "vertical-rl" }}>単価</div>
        {Box(56, 360, 50, 30, profit, T.white, "取引あたり利益")}
        {Box(56, 390, 50, 40, cost, T.inkLight, "価値提供コスト")}
        {cap(14, 438, "①", "バリューエコノミクス", "価値単位の収益性")}

        {/* ② ユニットエコノミクス（時間軸→）：LTV の高さは取引あたり利益と一致（Y軸を合わせる） */}
        {Box(140, 330, 116, 30, cost, T.inkLight, "規模実現コスト", "(CAC)")}
        {Box(256, 330, 72, 30, profit, T.white, "顧客あたり利益")}
        {Box(140, 360, 188, 30, base, T.ink, "LTV")}
        {axis(140, 392, 188, "時間")}
        {cap(140, 402, "②", "ユニットエコノミクス", "顧客単位の収益性")}

        {/* ③ ビジネスエコノミクス（ボリューム↑）：限界利益の幅は顧客あたり利益と一致（X軸を合わせる） */}
        <div style={{ position: "absolute", left: 240, top: 150, height: 180, fontSize: 9, color: T.inkFaint, writingMode: "vertical-rl" }}>ボリューム ↑</div>
        {Box(256, 150, 72, 180, base, T.ink, "限界利益", "顧客あたり利益×顧客数")}
        {Box(328, 150, 78, 90, profit, T.white, "事業利益", "(営業利益)")}
        {Box(328, 240, 78, 90, cost, T.inkLight, "維持運営コスト", "(固定費)")}
        {cap(256, 120, "③", "ビジネスエコノミクス", "事業単位の収益性")}

        {/* ④ インベストエコノミクス（時間軸→）：累積収益の高さは事業利益と一致（Y軸を合わせる） */}
        {Box(415, 60, 95, 90, cost, T.inkLight, "累積損失", "(初期投資含む)")}
        {Box(510, 60, 65, 90, profit, T.white, "累積利益")}
        {Box(415, 150, 160, 90, base, T.ink, "累積収益")}
        {axis(415, 242, 160, "時間")}
        {cap(415, 32, "④", "インベストエコノミクス", "投資案件単位の収益性")}
      </div>
    </div>
  );
}

// 収支モデルブロックのメニュー（左メニュー＋右詳細）。
const REVENUE_GROUPS = [
  { key: "basic", label: "収益基本構造", hint: "売上とコストの分解" },
  { key: "profitability", label: "収益性構造", hint: "4階層の関係性" },
  { key: "keypoint", label: "事業成立の急所", hint: "ヘビーコストと回収軸" },
  { key: "summary", label: "サマリ", hint: "VDS図スロット" },
] as const;
type RevenueGroupKey = (typeof REVENUE_GROUPS)[number]["key"];

function RevenueView({ data, color }: { data: Record<string, unknown> | undefined; color: string }) {
  const [selected, setSelected] = useState<RevenueGroupKey>("basic");
  const d = data ?? {};
  const fld = (k: string) => String((d as Record<string, unknown>)[k] ?? "");
  const heavy = fld("heavyCost") as CostCategoryKey;
  const pattern = COST_PATTERNS.find((p) => p.key === (fld("costPattern") as CostPatternKey));
  const keyPoint = fld("keyPoint");

  const basic = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SubPanel title="売上の構造（単価 × 客数 × 時間/期間）">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <Field label="単価" value={fld("unitPrice")} color={color} />
          <Field label="客数" value={fld("customers")} color={color} />
          <Field label="時間/期間" value={fld("period")} color={color} />
        </div>
      </SubPanel>
      <SubPanel title="コスト構造（4分類）">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8 }}>
          {COST_CATEGORIES.map((c) => {
            const isHeavy = heavy === c.key;
            return (
              <div key={c.key} style={{ border: `1px solid ${isHeavy ? color : T.border}`, borderRadius: 8, overflow: "hidden", background: isHeavy ? `${color}0C` : T.white }}>
                <div title={c.desc} style={{ background: `${color}14`, color: T.ink, padding: "7px 10px", fontSize: 13, fontWeight: 800, borderBottom: `1px solid ${T.borderLight}`, cursor: "help", display: "flex", alignItems: "center", gap: 6 }}>
                  {c.label}{isHeavy && <span style={{ fontSize: 10, fontWeight: 800, color: T.white, background: color, borderRadius: 10, padding: "1px 7px" }}>ヘビー</span>}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{fld(COST_FIELD[c.key]) ? breakJP(fld(COST_FIELD[c.key])) : "—"}</div>
                  <div style={{ fontSize: 11, color: T.inkFaint, marginTop: 4 }}>増え方：{c.growth}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SubPanel>
    </div>
  );

  const profitability = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 各エコノミクスの説明（縦並び） */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ECONOMICS_LAYERS.map((e, i) => {
          const bal = ECON_BALANCE[e.key];
          const incomeDetail = bal.incomeField ? fld(bal.incomeField) : "";
          const expenseDetail = fld(bal.expenseField);
          return (
            <div key={e.key} style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
              <div title={e.desc} style={{ background: T.offWhite, padding: "7px 10px", borderBottom: `1px solid ${T.borderLight}`, cursor: "help" }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color, marginRight: 5 }}>{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>{e.label}</span>
                <span style={{ fontSize: 11, color: T.inkMuted, marginLeft: 6 }}>{e.scope}</span>
              </div>
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                {/* 収入｜支出（2列） */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div style={{ border: `1px solid ${T.green}33`, background: T.greenLight, borderRadius: 6, padding: "6px 8px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.green }}>収入（アウトプット）</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginTop: 1 }}>{bal.income}</div>
                    {incomeDetail && <div style={{ fontSize: 12, color: T.inkLight, lineHeight: 1.5, marginTop: 1, whiteSpace: "pre-wrap" }}>{breakJP(incomeDetail)}</div>}
                  </div>
                  <div style={{ border: `1px solid ${T.red}33`, background: T.redLight, borderRadius: 6, padding: "6px 8px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: T.red }}>支出（インプット）</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginTop: 1 }}>{bal.expense}</div>
                    {expenseDetail && <div style={{ fontSize: 12, color: T.inkLight, lineHeight: 1.5, marginTop: 1, whiteSpace: "pre-wrap" }}>{breakJP(expenseDetail)}</div>}
                  </div>
                </div>
                {/* 結論（1列） */}
                <div style={{ border: `1px solid ${color}33`, background: `${color}0C`, borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color }}>結論</div>
                  <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, marginTop: 1, whiteSpace: "pre-wrap" }}>{fld(ECON_FIELD[e.key]) ? breakJP(fld(ECON_FIELD[e.key])) : e.sowhat}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 一番下：関係性図（図10-15） */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>4つのエコノミクスの関係性（図10-15）</div>
        <EconomicsFigure color={color} />
      </div>
    </div>
  );

  const keypoint = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted }}>ヘビーコスト</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, padding: "2px 10px", background: `${color}18`, color, borderRadius: 12 }}>{COST_CATEGORIES.find((c) => c.key === heavy)?.label ?? "—"}</span>
      </div>
      <Field label="増え方の特性（何に連動するか）" value={fld("heavyCostGrowth")} color={color} />
      <Field label="回収軸（規模 / 時間）" value={fld("recoveryAxis")} color={color} />
      {pattern && (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", background: T.offWhite }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>コスト構造パターン：{pattern.label}</div>
          <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3, lineHeight: 1.5 }}>例：{pattern.example}</div>
          <div style={{ fontSize: 12.5, color: T.ink, marginTop: 3, lineHeight: 1.5 }}>焦点：{pattern.focus}</div>
        </div>
      )}
      {keyPoint && (
        <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "10px 12px", fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
          <span style={{ fontSize: 10, fontWeight: 800, color, marginRight: 6 }}>急所</span>{keyPoint}
        </div>
      )}
    </div>
  );

  const summary = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Field label="回収エンジン" value={fld("recoveryEngine")} color={color} />
      <Field label="料金モデル" value={fld("pricingModel")} color={color} />
      <Field label="採算成立" value={fld("profitability")} color={color} />
    </div>
  );

  const content: Record<RevenueGroupKey, React.ReactNode> = { basic, profitability, keypoint, summary };
  const current = REVENUE_GROUPS.find((g) => g.key === selected)!;

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* 左：メニュー */}
      <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {REVENUE_GROUPS.map((g, i) => {
          const isSel = g.key === selected;
          return (
            <button key={g.key} onClick={() => setSelected(g.key)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: isSel ? T.white : "transparent", border: `1px solid ${isSel ? color : T.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? color : T.paper, color: isSel ? T.white : T.inkMuted }}>{i + 1}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: isSel ? T.ink : T.inkMuted }}>{g.label}</span>
              </div>
              <span style={{ fontSize: 12, color: T.inkFaint, paddingLeft: 26 }}>{g.hint}</span>
            </button>
          );
        })}
      </div>

      {/* 右：詳細 */}
      <div style={{ flex: 1, minWidth: 280, border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 12 }}>{current.label}<span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkMuted, marginLeft: 8 }}>{current.hint}</span></div>
        {content[selected]}
      </div>
    </div>
  );
}

// 持続サイクル図：好循環のノードを円環状に配置し、中心にロックの核を置く。
// 配置はコンテナ相対(%)で、正方形のアスペクト比に合わせて拡縮する（重なり防止）。
function SustainCycleView({ coreReason, loop, color }: { coreReason: string; loop: string[]; color: string }) {
  const n = loop.length;
  const RP = 36; // ノード中心の半径（コンテナ半幅に対する%）
  const NODE_W = 26; // ノード幅（%）
  const RING = RP * 2; // 補助円の直径（%）
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 460, aspectRatio: "1 / 1", margin: "0 auto" }}>
      {/* 円環の補助線 */}
      <div style={{ position: "absolute", top: `${50 - RP}%`, left: `${50 - RP}%`, width: `${RING}%`, height: `${RING}%`, borderRadius: "50%", border: `1.5px dashed ${color}55` }} />
      {/* 中心：ロックの核 */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "34%", maxWidth: 150, textAlign: "center", background: color, color: T.white, borderRadius: 10, padding: "8px 10px", boxShadow: `0 2px 8px ${color}44` }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, opacity: 0.85 }}>選ばれ続ける理由</div>
        <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.35, marginTop: 2 }}>{coreReason || "—"}</div>
      </div>
      {/* ループのノード（時計回り、12時起点） */}
      {loop.map((node, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const left = 50 + RP * Math.cos(angle);
        const top = 50 + RP * Math.sin(angle);
        return (
          <div key={i} style={{ position: "absolute", top: `${top}%`, left: `${left}%`, transform: "translate(-50%, -50%)", width: `${NODE_W}%`, minWidth: 78, maxWidth: 130, textAlign: "center" }}>
            <div style={{ background: T.white, border: `1px solid ${color}66`, borderRadius: 8, padding: "5px 7px", boxShadow: `0 1px 4px ${color}22` }}>
              <span style={{ fontSize: 9, fontWeight: 800, color, display: "block" }}>{i + 1}{i === n - 1 ? " ↺ 先頭へ" : " →"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{node}</span>
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

// VDS作成サイクルで扱う3ブロック。
const CYCLE_BLOCK_KEYS = ["concept", "strategy", "revenue"] as const;

// (ⅱ)(ⅲ) の手動入力カード。
function NoteCard({ label, icon, color, value, onChange, placeholder }: { label: string; icon: string; color: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ background: `${color}0D`, border: `1px solid ${color}33`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${color}22` }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{label}</span>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", minHeight: 72, padding: "9px 11px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 14.5, lineHeight: 1.65, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
      </div>
    </div>
  );
}

export default function VdsTab({ projectId, projectContext, results, onPersist, fullWidth }: Props) {
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ "phase-ii": true, "phase-iii": true });
  const [canvasFull, setCanvasFull] = useState(false);
  const [conceptKey, setConceptKey] = useState(0); // コンセプト一括生成時に ConceptStudio を再マウントする
  const [blockFeedback, setBlockFeedback] = useState<Record<string, string>>({}); // 戦略/収支ブロックの修正指示（再生成時に反映）
  const resultsRef = useRef<VdsResults>(migrated.results);

  // (ⅱ)現在地・弱点 /(ⅲ)ネクストアクション の手動入力（プロジェクト単位で永続化）。
  const notesKey = `newh-agent.p.${projectId}.cycleNotes`;
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem(notesKey) ?? "{}") as Record<string, string>; } catch { return {}; }
  });
  const setNote = (phase: string, block: string, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [`${phase}.${block}`]: value };
      if (typeof window !== "undefined") window.localStorage.setItem(notesKey, JSON.stringify(next));
      return next;
    });
  };

  // 統合マイグレーションが発生したら一度だけ保存する。
  useEffect(() => {
    if (migrated.changed) onPersist(migrated.results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggle = (id: string) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const conceptResult = resultsState.concept;
  const conceptData = conceptResult?.data as Partial<ConceptResult> | undefined;
  const conceptConfirmed = conceptResult?.confirmedElements ?? [];

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

  // 生成時に渡す前提データ（コンセプト＋生成済みの他ブロック。excludeは対象自身）。
  const buildPrev = (exclude?: string): Record<string, unknown> => {
    const prev: Record<string, unknown> = { concept: conceptData };
    for (const d of DOWNSTREAM) if (d !== exclude && resultsRef.current[d]) prev[d] = resultsRef.current[d].data;
    return prev;
  };

  // 1ブロックを生成（runningの制御は呼び出し側）。成否を返す。
  const runOne = async (id: string, prev: Record<string, unknown>): Promise<boolean> => {
    setPhase(id, { phase: "generating", attempt: 1, streamText: "", error: undefined });
    try {
      const { data, review, attempts } = await runBlock(id, brief, prev, {
        onPhase: (phase, attempt) => setPhase(id, { phase, attempt }),
        onDelta: (t) => setRuntime((r) => ({ ...r, [id]: { ...(r[id] ?? { phase: "generating", attempt: 1 }), streamText: ((r[id]?.streamText) ?? "") + t } })),
        feedback: blockFeedback[id],
      });
      prev[id] = data;
      // コンセプト一括生成時は4要素すべてを確定扱いにして図・スタジオに反映する。
      const confirmedElements = id === "concept" ? CONCEPT_ELEMENTS.map((e) => e.key) : undefined;
      persist({ ...resultsRef.current, [id]: { data, review, attempts, confirmedElements } });
      setPhase(id, { phase: "done" });
      return true;
    } catch (e) {
      setPhase(id, { phase: "error", error: e instanceof Error ? e.message : "生成に失敗しました。" });
      return false;
    }
  };

  // ブロック単体の生成／再生成。コンセプトはブリーフのみ、後続はコンセプト確定が前提。
  const generateBlock = async (id: string) => {
    if (running || !brief.trim()) return;
    if (id !== "concept" && !conceptData) return;
    setRunning(true);
    const ok = await runOne(id, id === "concept" ? {} : buildPrev(id));
    if (id === "concept" && ok) setConceptKey((k) => k + 1);
    setRunning(false);
  };

  // 後続ブロックをまとめて順番に生成（任意）。
  const generateDownstream = async () => {
    if (!brief.trim() || running || !conceptData) return;
    setRunning(true);
    const prev = buildPrev();
    for (const id of DOWNSTREAM) {
      const ok = await runOne(id, prev);
      if (!ok) break;
    }
    setRunning(false);
  };

  // ブロック1（コンセプト）の生成カード。
  const renderConceptCard = () => {
    const cPhase = runtime.concept?.phase ?? (resultsState.concept ? "done" : "idle");
    const cBusy = cPhase === "generating" || cPhase === "reviewing" || cPhase === "retry";
    return (
      <div style={{ background: `${AGENTS.concept.color}0D`, border: `1px solid ${AGENTS.concept.color}33`, borderRadius: 10, overflow: "hidden" }}>
        <div onClick={() => toggle("concept")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: collapsed.concept ? "none" : `1px solid ${AGENTS.concept.color}22`, cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: T.inkFaint, width: 14 }}>{collapsed.concept ? "▶" : "▼"}</span>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: `${AGENTS.concept.color}22`, color: AGENTS.concept.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{AGENTS.concept.icon}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>ブロック1：コンセプト</span>
          <button onClick={(e) => { e.stopPropagation(); generateBlock("concept"); }} disabled={running || !brief.trim()}
            style={{ marginLeft: "auto", padding: "4px 11px", background: running || !brief.trim() ? T.paper : `${AGENTS.concept.color}14`, border: `1px solid ${running || !brief.trim() ? T.border : `${AGENTS.concept.color}66`}`, borderRadius: 6, color: running || !brief.trim() ? T.inkFaint : AGENTS.concept.color, fontSize: 12, fontWeight: 700, cursor: running || !brief.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {cBusy ? "生成中…" : resultsState.concept ? "↻ 再生成" : "生成 →"}
          </button>
        </div>
        {!collapsed.concept && <div style={{ padding: "12px 14px" }}><ConceptStudio key={conceptKey} brief={brief} color={AGENTS.concept.color} initialData={conceptData} initialConfirmed={conceptConfirmed} onChange={onConceptChange} /></div>}
      </div>
    );
  };

  // 戦略・収支ブロックの生成カード。
  const renderGenCard = (id: string) => {
    const agent = AGENTS[id];
    const rt = runtime[id];
    const res = resultsState[id];
    const phase = rt?.phase ?? (res ? "done" : "idle");
    const busy = phase === "generating" || phase === "reviewing" || phase === "retry";
    return (
      <div key={id} style={{ background: `${agent.color}0D`, border: `1px solid ${agent.color}33`, borderRadius: 10, overflow: "hidden" }}>
        <div onClick={() => toggle(id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: collapsed[id] ? "none" : `1px solid ${agent.color}22`, cursor: "pointer", userSelect: "none" }}>
          <span style={{ fontSize: 13, color: T.inkFaint, width: 14 }}>{collapsed[id] ? "▶" : "▼"}</span>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: `${agent.color}22`, color: agent.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{agent.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>{agent.label}</span>
          <button onClick={(e) => { e.stopPropagation(); generateBlock(id); }} disabled={running || !conceptData}
            style={{ marginLeft: "auto", padding: "4px 11px", background: running || !conceptData ? T.paper : `${agent.color}1F`, border: `1px solid ${running || !conceptData ? T.border : `${agent.color}66`}`, borderRadius: 6, color: running || !conceptData ? T.inkFaint : agent.color, fontSize: 12, fontWeight: 700, cursor: running || !conceptData ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {busy ? "生成中…" : res ? "↻ 再生成" : "生成 →"}
          </button>
          <span style={{ fontSize: 13, color: phase === "error" ? T.red : phase === "done" ? T.green : T.inkMuted, whiteSpace: "nowrap" }}>
            {PHASE_LABEL[phase]}{busy && rt?.attempt ? `（試行${rt.attempt}）` : ""}
          </span>
        </div>
        {!collapsed[id] && (
          <div style={{ padding: "12px 14px" }}>
            {/* フィードバック・修正指示（再生成時に反映） */}
            <div style={{ marginBottom: 12 }}>
              <textarea value={blockFeedback[id] ?? ""} onChange={(e) => setBlockFeedback((f) => ({ ...f, [id]: e.target.value }))}
                placeholder={`このブロックへのフィードバック・修正指示（「↻ 再生成」で反映。例：${id === "strategy" ? "競争軸をもっと絞って／フックを尖らせて" : "単価をサブスク前提に／CACの圧縮策を具体化"}）`}
                style={{ width: "100%", minHeight: 48, padding: "8px 10px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 13.5, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
            </div>
            {phase === "error" && <div style={{ fontSize: 14, color: T.red }}>⚠ {rt?.error}</div>}
            {busy && (
              <div style={{ fontSize: 13, color: T.inkFaint, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "hidden", lineHeight: 1.5 }}>
                {rt?.streamText ? rt.streamText.slice(-400) : "生成しています…"}
              </div>
            )}
            {!busy && !res && phase !== "error" && <div style={{ fontSize: 14, color: T.inkFaint }}>未生成です。「生成 →」を押すか、上の欄に方針を書いてから生成してください。</div>}
            {!busy && res && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {id === "strategy"
                  ? <StrategyView data={res.data as Record<string, unknown> | undefined} color={agent.color} />
                  : id === "revenue"
                    ? <RevenueView data={res.data as Record<string, unknown> | undefined} color={agent.color} />
                    : BLOCK_FIELD_LABELS[id]
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
  };

  // (ⅱ)(ⅲ) の手動入力ブロック群。
  const renderNotePhase = (phase: "current" | "next", placeholderFn: (label: string) => string) =>
    CYCLE_BLOCK_KEYS.map((k) => (
      <NoteCard key={k} label={AGENTS[k].label} icon={AGENTS[k].icon} color={AGENTS[k].color}
        value={notes[`${phase}.${k}`] ?? ""} onChange={(v) => setNote(phase, k, v)} placeholder={placeholderFn(AGENTS[k].label)} />
    ));

  // サイクル各段のアコーディオン（関数として呼び出しインライン展開し、子の再マウントを防ぐ）。
  const renderPhase = (pid: string, mark: string, title: string, hint: string, children: React.ReactNode, headerAction?: React.ReactNode) => {
    const open = !collapsed[pid];
    return (
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: T.offWhite }}>
        <div onClick={() => toggle(pid)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", userSelect: "none", background: T.white, borderBottom: open ? `1px solid ${T.border}` : "none", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: T.inkFaint, width: 14 }}>{open ? "▼" : "▶"}</span>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: T.ink, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{mark}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{title}</span>
          <span style={{ fontSize: 12, color: T.inkMuted }}>{hint}</span>
          {headerAction && <span style={{ marginLeft: "auto" }}>{headerAction}</span>}
        </div>
        {open && <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: fullWidth ? "100%" : 1600 }}>
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
        案件ブリーフとVDS全体図を土台に、<b>VDS作成サイクル（ⅰ→ⅱ→ⅲ）</b>を繰り返して事業構想を磨きます。（ⅰ）で初期仮説を作り、（ⅱ）で現在地・弱点を見える化し、（ⅲ）で次の一手を決めます。
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.inkMuted, marginBottom: 4 }}>案件ブリーフ（プロジェクトコンテキストから引用・編集可）</div>
        <textarea value={brief} onChange={(e) => updateBrief(e.target.value)} placeholder="例：大手食品メーカー。50代向けの健康食品の新規事業を立ち上げたい。予算は半年・チーム3名。"
          style={{ width: "100%", minHeight: 80, padding: "10px 12px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 15, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
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

      {/* VDS作成サイクル（ⅰ→ⅱ→ⅲを繰り返す） */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: T.ink }}>VDS作成サイクル</span>
        <span style={{ fontSize: 12, color: T.inkMuted }}>（ⅰ）〜（ⅲ）を繰り返す</span>
      </div>

      {/* （ⅰ）初期仮説作成 */}
      {renderPhase("phase-i", "ⅰ", "初期仮説作成", "まず仮説を作る", (
        <>
          <div style={{ fontSize: 12.5, color: T.inkMuted }}>各ブロックは右側の「生成 / 再生成」ボタンで個別に生成できます。</div>
          {!conceptData && <div style={{ fontSize: 13.5, color: T.inkFaint }}>※ まずコンセプトを生成・確定してください（少なくとも顧客の案が必要です）。</div>}
          {renderConceptCard()}
          {DOWNSTREAM.map((id) => renderGenCard(id))}
        </>
      ), (
        <button onClick={(e) => { e.stopPropagation(); generateDownstream(); }} disabled={running || !conceptData}
          style={{ padding: "5px 12px", background: running || !conceptData ? T.paper : T.ink, border: `1px solid ${running || !conceptData ? T.border : T.ink}`, borderRadius: 8, color: running || !conceptData ? T.inkFaint : T.white, fontSize: 12.5, fontWeight: 700, cursor: running || !conceptData ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          まとめて生成（順番に）
        </button>
      ))}

      {/* （ⅱ）現在地/弱点を見える化 */}
      {renderPhase("phase-ii", "ⅱ", "現在地/弱点を見える化", "各ブロックの現在地と弱点を書き出す", (
        <>{renderNotePhase("current", (label) => `${label} の現在地・弱点（例：〜が弱い／〜が未検証）`)}</>
      ))}

      {/* （ⅲ）ネクストアクション */}
      {renderPhase("phase-iii", "ⅲ", "ネクストアクション", "弱点に対する次の一手を決める", (
        <>{renderNotePhase("next", (label) => `${label} のネクストアクション（例：〜を検証する／〜を再設計する）`)}</>
      ))}
    </div>
  );
}
