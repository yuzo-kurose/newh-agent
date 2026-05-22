"use client";
import { T } from "../lib/constants";

interface Props {
  context: string;
  setContext: (value: string) => void;
}

export default function ProjectContextTab({ context, setContext }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 16, alignItems: "start" }} className="context-layout">
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Project Context</div>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="案件の前提、顧客情報、自社アセット、制約、意思決定者の関心、調査で分かったことなどを蓄積してください。仮説生成時にこの内容を読み込みます。"
          style={{ width: "100%", minHeight: "calc(100vh - 260px)", padding: "12px 14px", background: T.offWhite, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 13, lineHeight: 1.8, resize: "vertical", outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <aside style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, position: "sticky", top: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, marginBottom: 8 }}>記憶する情報</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: T.inkMuted, lineHeight: 1.7 }}>
          <div>・案件の背景と目的</div>
          <div>・ターゲット顧客と課題</div>
          <div>・自社の強み、使える資産</div>
          <div>・予算、期間、体制、制約</div>
          <div>・決裁者、推進者、懸念点</div>
          <div>・追加質問への回答</div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 820px) {
          .context-layout { grid-template-columns: 1fr !important; }
          .context-layout aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}

