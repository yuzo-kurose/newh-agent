"use client";
import { T, ConceptResult, ConceptElementKey } from "../lib/constants";

type Obj = Record<string, unknown> | undefined;

interface Props {
  concept?: Partial<ConceptResult>;
  conceptConfirmed: ConceptElementKey[];
  strategy?: Obj;
  sustainability?: Obj;
  revenue?: Obj;
}

const str = (o: Obj | Partial<ConceptResult>, key: string): string => {
  const v = (o as Record<string, unknown> | undefined)?.[key];
  return typeof v === "string" ? v : "";
};

function Cell({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  const filled = !!value.trim();
  return (
    <div style={{ border: filled ? `1px solid ${color}66` : `1px dashed ${T.inkFaint}`, background: filled ? `${color}0D` : T.offWhite, borderRadius: 8, padding: "8px 10px", minHeight: 56, display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: filled ? color : T.inkFaint, letterSpacing: "0.02em" }}>{label}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: filled ? T.ink : T.inkFaint, whiteSpace: "pre-wrap" }}>{filled ? value : (hint || "未確定")}</div>
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

export default function VdsCanvas({ concept, conceptConfirmed, strategy, sustainability, revenue }: Props) {
  const cBlue = T.blue, cOrange = T.orange, cGreen = T.green, cPurple = T.purple;
  const ok = (k: ConceptElementKey) => conceptConfirmed.includes(k);
  // 確定済み要素のみ値を採用する。
  const cv = (k: ConceptElementKey, key: string) => (ok(k) ? str(concept, key) : "");

  return (
    <div style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "stretch", minWidth: 1180 }}>
        {/* コンセプト */}
        <div style={{ flex: "0 0 380px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="コンセプト" question="誰の・どの課題に・何を提供するのか？" color={cBlue} />
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr", gap: 6 }}>
            <div />
            <div style={{ fontSize: 10, fontWeight: 800, color: cBlue, textAlign: "center" }}>ミクロ</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: cOrange, textAlign: "center" }}>マクロ</div>

            <RowLabel>顧客</RowLabel>
            <Cell label="n1顧客" value={cv("customer", "n1Customer")} color={cBlue} hint="リアルなn1顧客" />
            <Cell label="ターゲット顧客" value={cv("customer", "customer")} color={cOrange} hint="十分な市場規模の顧客" />

            <RowLabel>課題</RowLabel>
            <Cell label="超具体的な課題" value={cv("issue", "microIssue")} color={cBlue} hint="共感できる超具体的な課題" />
            <Cell label="最大公約数的な課題" value={cv("issue", "macroIssue")} color={cOrange} hint="共感できる共通課題" />

            <RowLabel>手法</RowLabel>
            <div style={{ gridColumn: "2 / 4" }}>
              <Cell label="実現性のある手法（により）" value={cv("method", "method")} color={cBlue} hint="実現性のある手法" />
            </div>

            <RowLabel>価値</RowLabel>
            <Cell label="超具体的な価値" value={cv("value", "microValue")} color={cBlue} hint="渇望される超具体的な価値" />
            <Cell label="最大公約数的な価値" value={cv("value", "macroValue")} color={cOrange} hint="渇望される共通価値" />
          </div>
        </div>

        {/* 戦略 */}
        <div style={{ flex: "0 0 260px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="戦略" question="どのように実現するのか？" color={cOrange} />
          <GroupLabel>優位性（なぜ勝てるのか？）</GroupLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="競合代替品" value={str(strategy, "competitor")} color={cOrange} />
            <Cell label="選ばれる理由" value={str(strategy, "chosenReason")} color={cOrange} />
            <Cell label="選ばれ続ける理由" value={str(strategy, "keepChosenReason")} color={cOrange} />
          </div>
          <GroupLabel>仕組み</GroupLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="活動・機能・仕組み" value={str(strategy, "activity")} color={cOrange} />
            <Cell label="自社リソース" value={str(strategy, "ownResource")} color={cOrange} />
            <Cell label="パートナーリソース" value={str(strategy, "partnerResource")} color={cOrange} />
            <Cell label="チャネル・提供手段" value={str(strategy, "channel")} color={cOrange} />
          </div>
        </div>

        {/* 持続戦略 */}
        <div style={{ flex: "0 0 230px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="持続戦略" question="どこに強くされていくのか？" color={cGreen} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="蓄積されるもの" value={str(sustainability, "accumulated")} color={cGreen} />
            <Cell label="成長・強化されるもの" value={str(sustainability, "strengthened")} color={cGreen} />
            <Cell label="継続性の理由" value={str(sustainability, "sustainabilityReason")} color={cGreen} />
          </div>
        </div>

        {/* 利益モデル */}
        <div style={{ flex: "0 0 230px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
          <BlockHeader title="利益モデル" question="収支は成立しうるのか？" color={cPurple} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Cell label="回収エンジン" value={str(revenue, "recoveryEngine")} color={cPurple} />
            <Cell label="料金モデル" value={str(revenue, "pricingModel")} color={cPurple} />
            <Cell label="コスト構造" value={str(revenue, "costStructure")} color={cPurple} />
            <Cell label="採算成立" value={str(revenue, "profitability")} color={cPurple} />
          </div>
        </div>
      </div>
    </div>
  );
}
