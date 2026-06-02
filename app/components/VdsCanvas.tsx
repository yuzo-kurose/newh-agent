"use client";
import { useState, createContext, useContext } from "react";
import { T, ConceptResult, ConceptElementKey } from "../lib/constants";

type Obj = Record<string, unknown> | undefined;
type BlockId = "strategy" | "revenue";

// 全画面時のみ、各セルをドラッグでリサイズ可能にする。
const ResizableCtx = createContext(false);

interface Props {
  concept?: Partial<ConceptResult>;
  conceptConfirmed: ConceptElementKey[];
  strategy?: Obj;
  revenue?: Obj;
  onEditConcept: (field: string, value: string) => void;
  onEditBlock: (block: BlockId, field: string, value: string) => void;
  fullscreen?: boolean;
}

const str = (o: Obj | Partial<ConceptResult>, key: string): string => {
  const v = (o as Record<string, unknown> | undefined)?.[key];
  return typeof v === "string" ? v : "";
};

const CELL_H = 132; // 折りたたみ時の一定の高さ（約7行）
const CLAMP_LINES = 7;

function Cell({ label, value, color, hint, onSave, fill }: { label: string; value: string; color: string; hint?: string; onSave?: (v: string) => void; fill?: boolean }) {
  const resizable = useContext(ResizableCtx);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const filled = !!value.trim();
  const text = filled ? value : (hint || "未確定");
  const long = filled && value.length > 130;
  const showFull = open || resizable;

  const startEdit = () => { setDraft(value); setEditing(true); };
  const save = () => { onSave?.(draft); setEditing(false); setOpen(false); };

  const sizeStyle: React.CSSProperties = resizable
    ? { resize: "both", overflow: "auto", height: editing ? "auto" : 180, minHeight: 80, minWidth: 150 }
    : { overflow: "hidden", height: open || editing ? "auto" : (fill ? "100%" : CELL_H), minHeight: fill ? CELL_H : undefined };

  return (
    <div style={{ border: filled ? `1px solid ${color}66` : `1px dashed ${T.inkFaint}`, background: filled ? `${color}0D` : T.offWhite, borderRadius: 8, padding: "7px 9px", display: "flex", flexDirection: "column", gap: 3, ...sizeStyle }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: filled ? color : T.inkFaint }}>{label}</div>

      {editing ? (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
            style={{ width: "100%", minHeight: 64, padding: "6px 8px", border: `1.5px solid ${color}`, borderRadius: 6, fontSize: 12, lineHeight: 1.5, outline: "none", resize: "vertical", fontFamily: "inherit", color: T.ink }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={save} style={{ background: color, border: "none", borderRadius: 6, color: T.white, fontSize: 11, fontWeight: 700, padding: "3px 10px", cursor: "pointer" }}>保存</button>
            <button onClick={() => setEditing(false)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.inkMuted, fontSize: 11, padding: "3px 10px", cursor: "pointer" }}>取消</button>
          </div>
        </>
      ) : (
        <>
          <div style={showFull ? { fontSize: 12, lineHeight: 1.5, color: filled ? T.ink : T.inkFaint, whiteSpace: "pre-wrap", flex: 1 }
            : { fontSize: 12, lineHeight: 1.5, color: filled ? T.ink : T.inkFaint, display: "-webkit-box", WebkitLineClamp: CLAMP_LINES, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
            {text}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {long && !resizable && (
              <button onClick={() => setOpen((o) => !o)} style={{ background: "transparent", border: "none", color, fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                {open ? "閉じる ▲" : "詳細 ▾"}
              </button>
            )}
            {onSave && (
              <button onClick={startEdit} style={{ background: "transparent", border: "none", color: T.inkMuted, fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0 }}>✎ 編集</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const BlockHeader = ({ title, question, color }: { title: string; question: string; color: string }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, borderBottom: `2px solid ${color}`, paddingBottom: 3, display: "inline-block" }}>{title}</div>
    <div style={{ fontSize: 10, color: T.inkMuted, marginTop: 4 }}>{question}</div>
  </div>
);

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: T.inkMuted, margin: "8px 0 4px" }}>{children}</div>
);

const RowLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: T.inkMuted, alignSelf: "center" }}>{children}</div>
);

export default function VdsCanvas({ concept, conceptConfirmed, strategy, revenue, onEditConcept, onEditBlock, fullscreen }: Props) {
  const cBlue = T.blue, cOrange = T.orange, cGreen = T.green, cPurple = T.purple;
  const ok = (k: ConceptElementKey) => conceptConfirmed.includes(k);
  const cv = (k: ConceptElementKey, key: string) => (ok(k) ? str(concept, key) : "");
  const ec = (field: string) => (v: string) => onEditConcept(field, v);
  const eb = (block: BlockId, field: string) => (v: string) => onEditBlock(block, field, v);

  return (
    <ResizableCtx.Provider value={!!fullscreen}>
    <div style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch", minWidth: 1080 }}>
        {/* コンセプト */}
        <div style={{ flex: "3 1 380px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column" }}>
          <BlockHeader title="コンセプト" question="誰の・どの課題に・何を提供するのか？" color={cBlue} />
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr", gridTemplateRows: fullscreen ? undefined : "auto 1fr 1fr 1fr 1fr", gap: 6, flex: fullscreen ? "0 0 auto" : 1, alignItems: fullscreen ? "start" : undefined, alignContent: fullscreen ? "start" : undefined }}>
            <div />
            <div style={{ fontSize: 10, fontWeight: 800, color: cBlue, textAlign: "center" }}>ミクロ</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: cOrange, textAlign: "center" }}>マクロ</div>

            <RowLabel>顧客</RowLabel>
            <Cell label="n1顧客" value={cv("customer", "n1Customer")} color={cBlue} hint="リアルなn1顧客" onSave={ec("n1Customer")} fill />
            <Cell label="ターゲット顧客" value={cv("customer", "customer")} color={cOrange} hint="十分な市場規模の顧客" onSave={ec("customer")} fill />

            <RowLabel>課題</RowLabel>
            <Cell label="超具体的な課題" value={cv("issue", "microIssue")} color={cBlue} hint="共感できる超具体的な課題" onSave={ec("microIssue")} fill />
            <Cell label="最大公約数的な課題" value={cv("issue", "macroIssue")} color={cOrange} hint="共感できる共通課題" onSave={ec("macroIssue")} fill />

            <RowLabel>手法</RowLabel>
            <div style={{ gridColumn: "2 / 4", display: "flex" }}>
              <div style={{ flex: 1 }}>
                <Cell label="実現性のある手法（により）" value={cv("method", "method")} color={cBlue} hint="実現性のある手法" onSave={ec("method")} fill />
              </div>
            </div>

            <RowLabel>価値</RowLabel>
            <Cell label="超具体的な価値" value={cv("value", "microValue")} color={cBlue} hint="渇望される超具体的な価値" onSave={ec("microValue")} fill />
            <Cell label="最大公約数的な価値" value={cv("value", "macroValue")} color={cOrange} hint="渇望される共通価値" onSave={ec("macroValue")} fill />
          </div>
        </div>

        {/* 戦略 */}
        <div style={{ flex: "2 1 240px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="戦略" question="どのように実現するのか？" color={cOrange} />
          <GroupLabel>優位性（なぜ勝てるのか？）</GroupLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="競合代替品" value={str(strategy, "competitor")} color={cOrange} onSave={eb("strategy", "competitor")} />
            <Cell label="選ばれる理由" value={str(strategy, "chosenReason")} color={cOrange} onSave={eb("strategy", "chosenReason")} />
            <Cell label="選ばれ続ける理由" value={str(strategy, "keepChosenReason")} color={cOrange} onSave={eb("strategy", "keepChosenReason")} />
          </div>
          <GroupLabel>仕組み</GroupLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="活動・機能・仕組み" value={str(strategy, "activity")} color={cOrange} onSave={eb("strategy", "activity")} />
            <Cell label="自社リソース" value={str(strategy, "ownResource")} color={cOrange} onSave={eb("strategy", "ownResource")} />
            <Cell label="パートナーリソース" value={str(strategy, "partnerResource")} color={cOrange} onSave={eb("strategy", "partnerResource")} />
            <Cell label="チャネル・提供手段" value={str(strategy, "channel")} color={cOrange} onSave={eb("strategy", "channel")} />
          </div>
        </div>

        {/* 持続戦略（戦略ブロックに統合。ロック＝選ばれ続ける理由の蓄積→強化） */}
        <div style={{ flex: "1.5 1 200px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="持続戦略" question="どこに強くされていくのか？" color={cGreen} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="蓄積されるもの" value={str(strategy, "accumulated")} color={cGreen} onSave={eb("strategy", "accumulated")} />
            <Cell label="成長・強化されるもの" value={str(strategy, "strengthened")} color={cGreen} onSave={eb("strategy", "strengthened")} />
            <Cell label="選ばれ続ける理由（ロック）" value={str(strategy, "keepChosenReason")} color={cGreen} onSave={eb("strategy", "keepChosenReason")} />
          </div>
        </div>

        {/* 利益モデル */}
        <div style={{ flex: "1.5 1 200px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="利益モデル" question="収支は成立しうるのか？" color={cPurple} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="回収エンジン" value={str(revenue, "recoveryEngine")} color={cPurple} onSave={eb("revenue", "recoveryEngine")} />
            <Cell label="料金モデル" value={str(revenue, "pricingModel")} color={cPurple} onSave={eb("revenue", "pricingModel")} />
            <Cell label="コスト構造" value={str(revenue, "costStructure")} color={cPurple} onSave={eb("revenue", "costStructure")} />
            <Cell label="採算成立" value={str(revenue, "profitability")} color={cPurple} onSave={eb("revenue", "profitability")} />
          </div>
        </div>
      </div>
    </div>
    </ResizableCtx.Provider>
  );
}
