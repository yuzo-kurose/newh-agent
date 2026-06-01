"use client";
import { useState, useRef, useEffect } from "react";
import { Phase, T, SYSTEM_PROMPT } from "../lib/constants";

interface Message { role: "user" | "assistant"; content: string; }

export default function ChatTab({ phase }: { phase: Phase }) {
  const [messages, setMessages] = useState<Message[]>([
    { role:"assistant", content:`こんにちは。「${phase.label}」フェーズについて何でも聞いてください。NEWhのノウハウをもとにサポートします。` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim(); setInput("");
    const newMsgs: Message[] = [...messages, { role:"user", content:userMsg }];
    setMessages(newMsgs); setLoading(true);
    try {
      const ctx = `現在のフェーズ: ${phase.label}\n${phase.description}`;
      const history = newMsgs.slice(1);
      const userContent = history.length > 1
        ? `${ctx}\n\n${history.slice(0,-1).map(h=>`${h.role==="user"?"担当者":"AI"}: ${h.content}`).join("\n")}\n\n担当者: ${userMsg}`
        : `${ctx}\n\n質問: ${userMsg}`;
      const res = await fetch("/api/agent", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ system:SYSTEM_PROMPT, userContent, maxTokens:1000, responseFormat:"text" }),
      });
      const data = await res.json();
      const reply = data.text || data.error || "回答を生成できませんでした。";
      setMessages([...newMsgs, { role:"assistant", content:reply }]);
    } catch { setMessages([...newMsgs, { role:"assistant", content:"エラーが発生しました。" }]); }
    finally { setLoading(false); }
  };

  const quickPrompts = ["このフェーズの重要ポイントは？","よくある失敗パターンは？","ステークホルダー対応のコツは？","VDSの使い方を教えて"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 220px)", gap:10 }}>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start" }}>
            {msg.role==="assistant" && (
              <div style={{ width:26, height:26, background:T.ink, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:T.white, flexShrink:0, marginRight:8, marginTop:2 }}>N</div>
            )}
            <div style={{ maxWidth:"88%", padding:"10px 14px", borderRadius:msg.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px", background:msg.role==="user"?T.ink:T.white, border:msg.role==="user"?"none":`1px solid ${T.border}`, fontSize:15, lineHeight:1.7, color:msg.role==="user"?T.white:T.ink, whiteSpace:"pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ width:26, height:26, background:T.ink, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:T.white }}>N</div>
            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:"4px 14px 14px 14px", padding:"10px 14px", display:"flex", gap:4, alignItems:"center" }}>
              {[0,1,2].map(j => <div key={j} style={{ width:5, height:5, borderRadius:"50%", background:T.inkFaint, animation:`pulse 1.4s ${j*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", flexShrink:0 }}>
        {quickPrompts.map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ padding:"4px 10px", background:T.white, border:`1px solid ${T.border}`, borderRadius:20, color:T.inkMuted, cursor:"pointer", fontSize:13 }}>{q}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder={`${phase.label}について相談する...`}
          style={{ flex:1, padding:"10px 14px", background:T.white, border:`1.5px solid ${T.border}`, borderRadius:8, color:T.ink, fontSize:15, outline:"none" }} />
        <button onClick={send} disabled={loading||!input.trim()} style={{ padding:"10px 18px", background:loading||!input.trim()?T.paper:T.ink, border:"none", borderRadius:8, color:loading||!input.trim()?T.inkFaint:T.white, cursor:loading||!input.trim()?"not-allowed":"pointer", fontSize:15, fontWeight:600, transition:"all 0.15s" }}>
          送信
        </button>
      </div>
      <style>{`@keyframes pulse{0%,60%,100%{opacity:.3;transform:scale(.8)}30%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
