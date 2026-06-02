"use client";
import React, { useState } from "react";
import {
  T, ConceptResult, ConceptScore, ConceptViewpointKey, CONCEPT_VIEWPOINTS,
  PROBLEM_QUALITY_FACTORS, ISSUE_QUALITY_FACTORS, GrowthStoryPhase, TargetSegment, MethodValueIdea,
} from "../lib/constants";

export function scoreColor(score: number): string {
  const s = Math.max(1, Math.min(5, score || 0));
  return `rgba(26,122,60,${0.06 + (s / 5) * 0.22})`;
}

// 句点（。！？）の後で改行を入れ、長文を文単位で読みやすくする（表示専用。閉じ括弧前では改行しない）。
export function breakJP(text: string): string {
  if (!text) return text;
  return text
    .replace(/([。！？])(?=.)/g, "$1\n")
    .replace(/\n(?=[」』）)\]】])/g, "");
}

export function Field({ label, value, color, onSave }: { label: string; value?: string; color: string; onSave?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const start = () => { setDraft(value ?? ""); setEditing(true); };
  const save = () => { onSave?.(draft); setEditing(false); };
  return (
    <div style={{ background: T.offWhite, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: "0.04em" }}>{label}</span>
        {onSave && !editing && (
          <button onClick={start} style={{ marginLeft: "auto", background: "transparent", border: "none", color: T.inkMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>✎ 編集</button>
        )}
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
            style={{ width: "100%", minHeight: 72, padding: "8px 10px", border: `1.5px solid ${color}`, borderRadius: 6, fontSize: 14, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit", color: T.ink, background: T.white }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={save} style={{ background: color, border: "none", borderRadius: 6, color: T.white, fontSize: 13, fontWeight: 700, padding: "4px 12px", cursor: "pointer" }}>保存</button>
            <button onClick={() => setEditing(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.inkMuted, fontSize: 13, padding: "4px 12px", cursor: "pointer" }}>取消</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14.5, lineHeight: 1.65, color: T.ink, whiteSpace: "pre-wrap" }}>{value ? breakJP(value) : "—"}</div>
      )}
    </div>
  );
}

// 任意のJSON値を読みやすく再帰描画する（コンセプト以外のブロック用）。
export function RenderValue({ value }: { value: unknown }): React.ReactElement {
  if (value === null || value === undefined || value === "") return <span style={{ color: T.inkFaint }}>—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span style={{ whiteSpace: "pre-wrap" }}>{typeof value === "string" ? breakJP(value) : String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: "4px 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {value.map((item, i) => <li key={i} style={{ fontSize: 14.5, lineHeight: 1.6 }}><RenderValue value={item} /></li>)}
      </ul>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.inkMuted }}>{k}:</span>
          <span style={{ fontSize: 14.5 }}><RenderValue value={v} /></span>
        </div>
      ))}
    </div>
  );
}

// 問題/課題の質を4要素のスコア＋一言コメントで表示。
export function QualityFactors({ factors, scores }: { factors: readonly { key: string; label: string }[]; scores: Record<string, ConceptScore> | undefined }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${factors.length}, 1fr)`, gap: 6 }}>
      {factors.map((f) => {
        const cell = scores?.[f.key];
        const sc = cell?.score ?? 0;
        return (
          <div key={f.key} style={{ border: `1px solid ${T.borderLight}`, borderRadius: 6, padding: "6px 8px", background: scoreColor(sc) }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted }}>{f.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{sc || "–"}</div>
            {cell?.comment && <div style={{ fontSize: 11.5, color: T.inkMuted, lineHeight: 1.3, marginTop: 2 }}>{cell.comment}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ====== 要素別ビュー（スタジオの各ステップ・完成版の両方で使う） ======

type EditFn = (field: keyof ConceptResult, value: string) => void;

export function CustomerView({ data, color, onEdit }: { data: Partial<ConceptResult>; color: string; onEdit?: EditFn }) {
  const segments: TargetSegment[] = Array.isArray(data.targetSegments) ? data.targetSegments : [];
  const story: GrowthStoryPhase[] = Array.isArray(data.growthStory) ? data.growthStory : [];
  const viewpoints: string[] = Array.isArray(data.primaryViewpoints) ? data.primaryViewpoints : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="誰（顧客）" value={data.customer} color={color} onSave={onEdit && ((v) => onEdit("customer", v))} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        <Field label="🔬 ミクロの確信（n1の実在顧客）" value={data.n1Customer} color={T.blue} onSave={onEdit && ((v) => onEdit("n1Customer", v))} />
        <Field label="🌐 マクロの確証（市場サイズ）" value={data.marketSize} color={T.orange} onSave={onEdit && ((v) => onEdit("marketSize", v))} />
      </div>
      {viewpoints.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>初期重要観点</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {viewpoints.map((v, i) => (
              <span key={i} style={{ fontSize: 13, padding: "4px 10px", background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 20, color: T.ink }}>{v}</span>
            ))}
          </div>
        </div>
      )}
      {segments.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>ターゲット顧客 × 9観点評価</div>
          {data.segmentsKeyMessage && (
            <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13.5, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
              <span style={{ fontSize: 10, fontWeight: 800, color, marginRight: 6 }}>So what</span>{data.segmentsKeyMessage}
            </div>
          )}
          <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.offWhite }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", position: "sticky", left: 0, background: T.offWhite, borderBottom: `1px solid ${T.border}`, minWidth: 130 }}>セグメント</th>
                  {CONCEPT_VIEWPOINTS.map((vp) => (
                    <th key={vp.key} title={vp.desc} style={{ padding: "8px 6px", borderBottom: `1px solid ${T.border}`, borderLeft: `1px solid ${T.borderLight}`, minWidth: 76, fontWeight: 700, color: T.inkMuted, lineHeight: 1.3, cursor: "help" }}>
                      <span style={{ borderBottom: `1px dotted ${T.inkFaint}` }}>{vp.label}</span>
                      <span style={{ fontSize: 9, color: T.inkFaint, marginLeft: 2 }}>ⓘ</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((seg, i) => (
                  <tr key={i}>
                    <td style={{ padding: "8px 10px", borderTop: `1px solid ${T.borderLight}`, position: "sticky", left: 0, background: T.white, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, color: T.ink }}>{seg.name}</div>
                      {seg.axis && <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 2 }}>{seg.axis}</div>}
                    </td>
                    {CONCEPT_VIEWPOINTS.map((vp) => {
                      const cell = seg.scores?.[vp.key as ConceptViewpointKey];
                      const sc = cell?.score ?? 0;
                      return (
                        <td key={vp.key} title={cell?.comment || ""} style={{ padding: "6px", borderTop: `1px solid ${T.borderLight}`, borderLeft: `1px solid ${T.borderLight}`, background: scoreColor(sc), verticalAlign: "top" }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: T.ink, textAlign: "center" }}>{sc || "–"}</div>
                          {cell?.comment && <div style={{ fontSize: 11.5, color: T.inkMuted, marginTop: 2, lineHeight: 1.3 }}>{cell.comment}</div>}
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
          <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 6 }}>成長ストーリー</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {story.map((ph, i) => (
              <div key={i} style={{ minWidth: 190, flex: "0 0 auto", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: color, color: T.white, padding: "6px 10px", fontSize: 14, fontWeight: 800 }}>{i + 1}. {ph.phase}</div>
                <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {([["KGI", ph.kgi], ["重点", ph.focus], ["BM", ph.businessModel], ["アセット", ph.asset]] as const).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: T.inkFaint }}>{k}</div>
                      <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{v || "—"}</div>
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

export function IssueView({ data, color, onEdit }: { data: Partial<ConceptResult>; color: string; onEdit?: EditFn }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <Field label="問題（解決が望まれる状態）" value={data.problem} color={color} onSave={onEdit && ((v) => onEdit("problem", v))} />
        <div style={{ marginTop: 6 }}><QualityFactors factors={PROBLEM_QUALITY_FACTORS} scores={data.problemQuality} /></div>
      </div>
      <div>
        <Field label="課題（据える背景要因）" value={data.pain} color={color} onSave={onEdit && ((v) => onEdit("pain", v))} />
        <div style={{ marginTop: 6 }}><QualityFactors factors={ISSUE_QUALITY_FACTORS} scores={data.issueQuality} /></div>
      </div>
      {(data.microIssue || data.macroIssue) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          <Field label="超具体的な課題（ミクロ）" value={data.microIssue} color={T.blue} onSave={onEdit && ((v) => onEdit("microIssue", v))} />
          <Field label="最大公約数的な課題（マクロ）" value={data.macroIssue} color={T.orange} onSave={onEdit && ((v) => onEdit("macroIssue", v))} />
        </div>
      )}
      {data.structureMethod && (
        <div style={{ fontSize: 13, color: T.inkMuted, lineHeight: 1.6 }}>
          構造化手法：<b style={{ color: T.ink }}>{data.structureMethod}</b>{data.structureReason ? ` — ${data.structureReason}` : ""}
        </div>
      )}
    </div>
  );
}

export function MethodView({ data, color, onEdit }: { data: Partial<ConceptResult>; color: string; onEdit?: EditFn }) {
  const ideas: MethodValueIdea[] = Array.isArray(data.ideaApproaches) ? data.ideaApproaches : [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Field label="手法（顧客に何を提供するか）" value={data.method} color={color} onSave={onEdit && ((v) => onEdit("method", v))} />
      {Array.isArray(data.methodFunctions) && data.methodFunctions.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.inkFaint, marginBottom: 3 }}>機能（具体）</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
            {data.methodFunctions.map((f, i) => <li key={i} style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{f}</li>)}
          </ul>
        </div>
      )}
      {ideas.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.inkFaint, marginBottom: 4 }}>発想の着眼点（HMW → 案）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ideas.map((a, i) => (
              <div key={i} style={{ background: T.offWhite, border: `1px solid ${T.borderLight}`, borderRadius: 6, padding: "7px 9px" }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: "1px 7px", background: `${color}18`, color, borderRadius: 10 }}>{a.lens}</span>
                {a.hmw && <div style={{ fontSize: 13.5, color: T.inkLight, marginTop: 4, lineHeight: 1.5 }}>Q. {a.hmw}</div>}
                {a.idea && <div style={{ fontSize: 13.5, color: T.ink, marginTop: 2, lineHeight: 1.5 }}>→ {a.idea}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ValueView({ data, color, showOneLine = true, onEdit }: { data: Partial<ConceptResult>; color: string; showOneLine?: boolean; onEdit?: EditFn }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {showOneLine && data.oneLineConcept && (
        <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderRadius: 8, padding: "12px 14px", fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
          {data.oneLineConcept}
        </div>
      )}
      <Field label="価値（顧客が何を得るか・before→after）" value={data.value} color={color} onSave={onEdit && ((v) => onEdit("value", v))} />
      {(data.microValue || data.macroValue) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          <Field label="超具体的な価値（ミクロ）" value={data.microValue} color={T.blue} onSave={onEdit && ((v) => onEdit("microValue", v))} />
          <Field label="最大公約数的な価値（マクロ）" value={data.macroValue} color={T.orange} onSave={onEdit && ((v) => onEdit("macroValue", v))} />
        </div>
      )}
      {Array.isArray(data.valueExperiences) && data.valueExperiences.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: T.inkFaint, marginBottom: 3 }}>体験（具体）</div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 2 }}>
            {data.valueExperiences.map((e, i) => <li key={i} style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// 完成版コンセプトの全体表示（4要素を統合）。
export function ConceptView({ data, color }: { data: ConceptResult; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.oneLineConcept && (
        <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderRadius: 8, padding: "12px 14px", fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: T.ink }}>
          {data.oneLineConcept}
        </div>
      )}
      <CustomerView data={data} color={color} />
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted, marginBottom: 10 }}>問題と課題</div>
        <IssueView data={data} color={color} />
      </div>
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.inkMuted }}>手法と価値</div>
        <MethodView data={data} color={color} />
        <ValueView data={data} color={color} showOneLine={false} />
      </div>
    </div>
  );
}
