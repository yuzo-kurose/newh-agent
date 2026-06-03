"use client";
import { useRef, useState } from "react";
import { T, ConceptResult, ConceptElementKey, CONCEPT_ELEMENTS } from "../lib/constants";
import { runConceptElement } from "../lib/generate";
import { CustomerView, IssueView, MethodView, ValueView } from "./conceptParts";

interface Props {
  brief: string;
  color: string;
  initialData?: Partial<ConceptResult>;
  initialConfirmed?: ConceptElementKey[];
  onChange: (data: Partial<ConceptResult>, confirmed: ConceptElementKey[]) => void;
}

type Draft = Partial<ConceptResult>;

const VIEW: Record<ConceptElementKey, (p: { data: Draft; color: string; onEdit?: (field: keyof ConceptResult, value: string) => void }) => React.ReactElement> = {
  customer: CustomerView,
  issue: IssueView,
  method: MethodView,
  value: ValueView,
};

function pick(data: Draft, fields: (keyof ConceptResult)[]): Draft {
  const out: Draft = {};
  for (const f of fields) if (data[f] !== undefined) (out as Record<string, unknown>)[f] = data[f];
  return out;
}

export default function ConceptStudio({ brief, color, initialData, initialConfirmed, onChange }: Props) {
  const [draft, setDraft] = useState<Draft>(initialData ?? {});
  const [confirmed, setConfirmed] = useState<ConceptElementKey[]>(initialConfirmed ?? []);
  const [selected, setSelected] = useState<ConceptElementKey>(
    CONCEPT_ELEMENTS.find((e) => !(initialConfirmed ?? []).includes(e.key))?.key ?? "customer"
  );
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [genBrief, setGenBrief] = useState<Record<string, string>>({}); // 各要素を最後に生成したときの案件ブリーフ
  const [history, setHistory] = useState<Record<string, Draft[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef<Draft>(draft);
  draftRef.current = draft;

  const el = CONCEPT_ELEMENTS.find((e) => e.key === selected)!;
  const currentSlice = pick(draft, el.fields);
  const hasDraft = Object.keys(currentSlice).length > 0;
  const iterations = history[selected]?.length ?? (hasDraft ? 1 : 0);
  const allConfirmed = confirmed.length === CONCEPT_ELEMENTS.length;
  // ブリーフが空でも、既に案がある／確定済み要素があれば、フィードバックで再提案できる。
  const canGenerate = !busy && (brief.trim().length > 0 || hasDraft || confirmed.length > 0);
  // この要素を最後に生成したときから案件ブリーフが変わっているか。
  const briefChanged = hasDraft && genBrief[selected] !== undefined && genBrief[selected] !== brief;

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setStreamText("");
    setError(null);
    try {
      const confirmedData: Draft = {};
      for (const e of CONCEPT_ELEMENTS) if (confirmed.includes(e.key)) Object.assign(confirmedData, pick(draftRef.current, e.fields));
      const prevSlice = pick(draftRef.current, el.fields);
      const prevDraft = Object.keys(prevSlice).length ? prevSlice : null;

      const result = await runConceptElement(
        selected, brief, confirmedData as Record<string, unknown>, prevDraft as Record<string, unknown> | null,
        feedback[selected] ?? "", (t) => setStreamText((s) => (s + t).slice(-600))
      );

      const merged: Draft = { ...draftRef.current, ...(result as Draft) };
      setDraft(merged);
      setHistory((h) => ({ ...h, [selected]: [...(h[selected] ?? []), pick(merged, el.fields)] }));
      setGenBrief((g) => ({ ...g, [selected]: brief }));
      onChange(merged, confirmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const confirmAndNext = () => {
    const next = confirmed.includes(selected) ? confirmed : [...confirmed, selected];
    setConfirmed(next);
    onChange(draftRef.current, next);
    const idx = CONCEPT_ELEMENTS.findIndex((e) => e.key === selected);
    const nextEl = CONCEPT_ELEMENTS[idx + 1];
    if (nextEl) {
      setSelected(nextEl.key);
      setShowHistory(false);
    }
  };

  const onEditField = (field: keyof ConceptResult, value: string) => {
    const merged: Draft = { ...draftRef.current, [field]: value };
    setDraft(merged);
    onChange(merged, confirmed);
  };

  const CurrentView = VIEW[selected];
  const pastDrafts = (history[selected] ?? []).slice(0, -1);

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      {/* 左：ステップ */}
      <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {CONCEPT_ELEMENTS.map((e, i) => {
          const isSel = e.key === selected;
          const isDone = confirmed.includes(e.key);
          const hasD = Object.keys(pick(draft, e.fields)).length > 0;
          return (
            <button key={e.key} onClick={() => { setSelected(e.key); setShowHistory(false); }}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: isSel ? T.white : "transparent", border: `1px solid ${isSel ? color : T.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? T.green : isSel ? color : T.paper, color: isDone || isSel ? T.white : T.inkMuted }}>{isDone ? "✓" : i + 1}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: isSel ? T.ink : T.inkMuted }}>{e.label}</span>
                {hasD && !isDone && <span style={{ marginLeft: "auto", fontSize: 11, color: T.orange }}>検討中</span>}
              </div>
              <span style={{ fontSize: 12, color: T.inkFaint, paddingLeft: 26 }}>{e.hint}</span>
            </button>
          );
        })}
        {allConfirmed && (
          <div style={{ marginTop: 4, padding: "8px 10px", background: T.greenLight, border: `1px solid ${T.green}33`, borderRadius: 8, fontSize: 13, color: T.green, fontWeight: 700 }}>
            ✓ コンセプト4要素が確定しました
          </div>
        )}
      </div>

      {/* 右：提案スペース */}
      <div style={{ flex: 1, minWidth: 0, border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: T.ink }}>{el.label}の検討</span>
          <span style={{ fontSize: 13, color: T.inkMuted }}>問い：{el.hint}</span>
          {iterations > 0 && <span style={{ marginLeft: "auto", fontSize: 13, color: T.inkFaint }}>検証 {iterations} 回目</span>}
        </div>

        {/* フィードバック＆アクション（上部に配置） */}
        <div style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {briefChanged && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: T.orangeLight, border: `1px solid ${T.orange}40`, borderRadius: 8, padding: "8px 12px" }}>
              <span style={{ fontSize: 12.5, color: T.orange, fontWeight: 700 }}>案件ブリーフが変更されています。</span>
              <button onClick={generate} disabled={busy}
                style={{ marginLeft: "auto", padding: "7px 12px", background: busy ? T.paper : T.orange, border: "none", borderRadius: 8, color: busy ? T.inkFaint : T.white, fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                🔄 変更した案件を反映して再提案
              </button>
            </div>
          )}
          <textarea value={feedback[selected] ?? ""} onChange={(e) => setFeedback((f) => ({ ...f, [selected]: e.target.value }))}
            placeholder={`この案へのフィードバック・修正指示（例：${el.key === "customer" ? "n1をもっと具体的に。20代の単身者に絞りたい" : el.key === "issue" ? "逼迫性が弱い。もっと切実な課題に" : el.key === "method" ? "もっと斬新な手法を。前提を疑う案も" : "価値が抽象的。得られる状態を具体的に"}）`}
            style={{ width: "100%", minHeight: 52, padding: "9px 11px", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 14.5, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={generate} disabled={!canGenerate}
              style={{ padding: "9px 16px", background: !canGenerate ? T.paper : color, border: "none", borderRadius: 8, color: !canGenerate ? T.inkFaint : T.white, fontSize: 14, fontWeight: 700, cursor: !canGenerate ? "not-allowed" : "pointer" }}>
              {hasDraft ? "フィードバックを反映して再提案" : "案を出す"}
            </button>
            {hasDraft && (
              <button onClick={confirmAndNext} disabled={busy}
                style={{ padding: "9px 16px", background: busy ? T.paper : T.ink, border: "none", borderRadius: 8, color: busy ? T.inkFaint : T.white, fontSize: 14, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>
                {confirmed.includes(selected) ? "✓ 確定済み（次へ）" : "✓ この案で確定して次へ"}
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ fontSize: 14, color: T.red }}>⚠ {error}</div>}

        {busy && (
          <div style={{ fontSize: 13, color: T.inkFaint, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden", lineHeight: 1.5, background: T.offWhite, borderRadius: 6, padding: 10 }}>
            {streamText || "案を生成しています…"}
          </div>
        )}

        {!busy && hasDraft && <CurrentView data={draft} color={color} onEdit={onEditField} />}

        {!busy && !hasDraft && (
          <div style={{ fontSize: 14.5, color: T.inkMuted, lineHeight: 1.7, padding: "8px 0" }}>
            {selected === "customer"
              ? "案件ブリーフをもとに、まず「誰（顧客）」の案を出します。"
              : `確定済みの要素をふまえて「${el.label}」の案を出します。`}
          </div>
        )}

        {/* 過去の検証履歴 */}
        {pastDrafts.length > 0 && (
          <div>
            <button onClick={() => setShowHistory((s) => !s)} style={{ background: "transparent", border: "none", color: T.inkMuted, fontSize: 13, cursor: "pointer", padding: 0 }}>
              {showHistory ? "▼" : "▶"} 過去の検証（{pastDrafts.length}件）
            </button>
            {showHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {pastDrafts.map((d, i) => (
                  <div key={i} style={{ border: `1px dashed ${T.border}`, borderRadius: 8, padding: 10, opacity: 0.7 }}>
                    <div style={{ fontSize: 12, color: T.inkFaint, marginBottom: 6 }}>{i + 1} 回目</div>
                    <CurrentView data={d} color={color} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
