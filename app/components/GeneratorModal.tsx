"use client";
import { useState } from "react";
import { T, AGENTS, REVIEW_SYSTEM, PHASES } from "../lib/constants";

interface ReviewResult { score:number; grade:string; goodPoint:string; issues:string[]; mustFix:string; passOrRetry:"pass"|"retry"; }
interface StepState { id:string; label:string; color:string; status:"pending"|"generating"|"reviewing"|"retry"|"done"|"error"; attempt:number; review:ReviewResult|null; allReviews:{attempt:number;review:ReviewResult;data:unknown}[]; data:unknown; error:string|null; }

async function callAPI(system: string, userContent: string, maxTokens=1000): Promise<string> {
  const res = await fetch("/api/agent", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ system, userContent, maxTokens }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

function parseJSON(text: string): unknown {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s===-1||e===-1) throw new Error(`JSON未検出: "${text.slice(0,100)}"`);
  return JSON.parse(text.slice(s,e+1));
}

const TAG = ({ children, color, bg }: { children:React.ReactNode; color:string; bg:string }) => (
  <span style={{ display:"inline-flex", padding:"2px 8px", background:bg, color, fontSize:11, fontWeight:600, borderRadius:20 }}>{children}</span>
);
const Card = ({ children, style={} }: { children:React.ReactNode; style?:React.CSSProperties }) => (
  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:10, ...style }}>{children}</div>
);

export default function GeneratorModal({ onClose }: { onClose: () => void }) {
  const [brief, setBrief] = useState("");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [result, setResult] = useState<Record<string, unknown>|null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [copied, setCopied] = useState(false);
  const MAX_RETRY = 2;

  const examples = [
    "大手食品メーカー。50代向けの健康食品の新規事業を立ち上げたい。既存のBtoC事業の知見はあるが新規事業は初めて。予算は半年・チーム3名。",
    "地方銀行。中小企業向けのDXコンサル事業を立ち上げたい。自行の営業網・顧客データを活用したい。競合はコンサル大手。経営層の承認を年内に取りたい。",
    "建設会社。建設現場の人手不足を解決するAI・IoT活用のサービスを開発したい。既にPoCを1度やったが事業化の判断ができていない。",
  ];

  const upd = (id: string, patch: Partial<StepState>) =>
    setSteps(p => p.map(s => s.id===id ? {...s,...patch} : s));

  const generate = async () => {
    if (!brief.trim()||generating) return;
    setGenerating(true); setResult(null); setError(null); setExpanded({});
    const order = ["concept","strategy","sustainability","revenue","project"];
    setSteps(order.map(id => ({ id, label:AGENTS[id].label, color:AGENTS[id].color, status:"pending", attempt:0, review:null, allReviews:[], data:null, error:null })));
    const acc: Record<string, unknown> = {};
    try {
      for (const id of order) {
        const ag = AGENTS[id];
        let finalData: unknown = null, finalReview: ReviewResult|null = null;
        const allReviews: StepState["allReviews"] = [];
        for (let attempt=1; attempt<=MAX_RETRY+1; attempt++) {
          upd(id, { status:attempt===1?"generating":"retry", attempt });
          let gen: unknown;
          try {
            const base = ag.build(brief, acc);
            const note = finalReview?.mustFix ? `\n\n【改善指示】${finalReview.mustFix}\n【問題点】${finalReview.issues.join("、")}` : "";
            const text = await callAPI(ag.system, base+note, 1000);
            gen = parseJSON(text);
          } catch(e) { const msg = e instanceof Error ? e.message : String(e); upd(id,{status:"error",error:msg,allReviews}); throw new Error(msg); }

          upd(id, { status:"reviewing", attempt });
          let rev: ReviewResult;
          try {
            const prev = id!=="concept" ? JSON.stringify(acc,null,2) : null;
            const content = `【対象】${ag.label}\n【評価基準】\n${ag.reviewCriteria}\n【依頼背景】${brief}\n${prev?`【前ブロック】\n${prev}`:""}\n【アウトプット】\n${JSON.stringify(gen,null,2)}`;
            const text = await callAPI(REVIEW_SYSTEM, content, 600);
            rev = parseJSON(text) as ReviewResult;
          } catch { rev = { score:70,grade:"B",goodPoint:"レビュー取得失敗",issues:[],mustFix:"",passOrRetry:"pass" }; }

          allReviews.push({attempt,review:rev,data:gen});
          finalReview=rev; finalData=gen;
          upd(id, { review:rev, allReviews, data:gen });
          if (rev.passOrRetry==="pass"||attempt>MAX_RETRY) break;
        }
        acc[id==="project"?"project":id] = finalData;
        upd(id, { status:"done", data:finalData, review:finalReview });
      }
      const proj = (acc.project||{}) as Record<string,unknown>;
      setResult({ ...proj, vds:{ concept:acc.concept, strategy:acc.strategy, sustainability:acc.sustainability, revenue:acc.revenue, threeConditions:proj.threeConditions } });
    } catch(e) { setError(`生成に失敗しました: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setGenerating(false); }
  };

  const phaseMap = Object.fromEntries(PHASES.map(p=>[p.id,p]));
  const sc = (s:number) => s>=90?T.green:s>=75?T.blue:s>=60?T.orange:T.red;
  const scBg = (s:number) => s>=90?T.greenLight:s>=75?T.blueLight:s>=60?T.orangeLight:T.redLight;
  const statusLabel: Record<string,string> = {pending:"待機中",generating:"生成中",reviewing:"レビュー中",retry:"再生成中",done:"完了",error:"エラー"};
  const statusColor = (s:string,c:string) => ({pending:T.inkFaint,generating:c,reviewing:T.orange,retry:T.orange,done:c,error:T.red} as Record<string,string>)[s]||T.inkFaint;
  const roleColor: Record<string,string> = {"決裁者":T.red,"推進者":T.blue,"協力者":T.green,"注意人物":T.orange};
  const priColor: Record<string,string> = {high:T.red,medium:T.orange,low:T.inkFaint};

  const v = (result?.vds||{}) as Record<string, Record<string,string>>;
  const three = (v.threeConditions||{}) as Record<string,string>;

  const vdsBlocks = [
    {id:"concept",label:"Block 1  コンセプト",sub:"ミクロ視点",point:"受容性",color:T.blue,bg:T.blueLight, rows:[{l:"顧客",v:v.concept?.customer},{l:"困りごと",v:v.concept?.pain},{l:"提供価値",v:v.concept?.value},{l:"手法・体験",v:v.concept?.method}]},
    {id:"strategy",label:"Block 2  戦略と仕組み",sub:"マクロ視点",point:"市場性・優位性・実現性",color:T.orange,bg:T.orangeLight, rows:[{l:"市場",v:v.strategy?.market},{l:"競合",v:v.strategy?.competitor},{l:"優位性",v:v.strategy?.advantage},{l:"仕組み",v:v.strategy?.mechanism}]},
    {id:"sust",label:"Block 3  持続戦略",sub:"",point:"持続性",color:T.green,bg:T.greenLight, rows:[{l:"強みとなる資産",v:v.sustainability?.assets},{l:"蓄積されるもの",v:v.sustainability?.accumulation},{l:"強化ループ",v:v.sustainability?.loop}]},
    {id:"rev",label:"Block 4  収支モデル",sub:"",point:"収益性",color:T.purple,bg:T.purpleLight, rows:[{l:"収益構造",v:v.revenue?.revenueStructure},{l:"コスト",v:v.revenue?.costStructure},{l:"収支見立て",v:v.revenue?.balanceOutlook}]},
  ];

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(10,10,8,0.6)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 16px" }}>
      <div style={{ width:"100%",maxWidth:840,background:T.offWhite,borderRadius:16,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.18)" }}>

        <div style={{ background:T.white,borderBottom:`1px solid ${T.border}`,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:T.ink,letterSpacing:"-0.02em" }}>プロジェクトデザイン案 生成</div>
            <div style={{ fontSize:11,color:T.inkMuted,marginTop:2 }}>生成 → NEWh基準レビュー → 品質不足なら再生成（最大{MAX_RETRY}回）</div>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,background:T.paper,border:`1px solid ${T.border}`,color:T.inkMuted,cursor:"pointer",fontSize:14 }}>✕</button>
        </div>

        <div style={{ padding:20,display:"flex",flexDirection:"column",gap:16 }}>
          <Card style={{ padding:16 }}>
            <div style={{ fontSize:11,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>依頼内容・背景情報</div>
            <textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder="例）大手製造業。工場の熟練技術者の退職による技術伝承問題を解決するデジタルサービスを開発したい…"
              style={{ width:"100%",minHeight:80,padding:"10px 12px",background:T.offWhite,border:`1.5px solid ${T.border}`,borderRadius:8,color:T.ink,fontSize:13,lineHeight:1.7,resize:"vertical",outline:"none",boxSizing:"border-box",fontFamily:"inherit" }} />
            <div style={{ marginTop:8,display:"flex",gap:6,flexWrap:"wrap" }}>
              <span style={{ fontSize:11,color:T.inkFaint,alignSelf:"center" }}>記入例：</span>
              {examples.map((ex,i)=><button key={i} onClick={()=>setBrief(ex)} style={{ padding:"3px 10px",background:T.paper,border:`1px solid ${T.border}`,borderRadius:20,color:T.inkMuted,cursor:"pointer",fontSize:11,fontFamily:"inherit" }}>例{i+1}</button>)}
            </div>
          </Card>

          {steps.length>0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              <div style={{ fontSize:11,fontWeight:700,color:T.inkMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2 }}>エージェントパイプライン — 生成 → レビュー → 再生成</div>
              {steps.map(step => {
                const rev = step.review;
                const exp = expanded[step.id];
                const spinning = ["generating","reviewing","retry"].includes(step.status);
                return (
                  <div key={step.id} style={{ background:T.white,border:`1px solid ${step.status==="error"?"#FCCACA":T.border}`,borderRadius:10,overflow:"hidden" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px" }}>
                      <div style={{ width:22,height:22,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,
                        background:step.status==="done"?step.color:step.status==="error"?T.red:"transparent",
                        border:spinning?`2px solid ${step.color}`:step.status==="pending"?`1.5px solid ${T.border}`:"none",
                        color:["done","error"].includes(step.status)?T.white:T.inkFaint,
                        animation:spinning?"spin 1s linear infinite":"none" }}>
                        {step.status==="done"?"✓":step.status==="error"?"✕":spinning?"⟳":""}
                      </div>
                      <span style={{ fontSize:12,fontWeight:600,color:step.status==="pending"?T.inkFaint:T.ink,flex:1 }}>
                        {step.label}{step.attempt>1&&<span style={{ marginLeft:6,fontSize:10,color:T.orange }}>再試行{step.attempt}回目</span>}
                      </span>
                      <span style={{ fontSize:10,color:statusColor(step.status,step.color),fontWeight:600 }}>{statusLabel[step.status]||""}</span>
                      {rev&&<div onClick={()=>setExpanded(p=>({...p,[step.id]:!p[step.id]}))} style={{ cursor:"pointer",marginLeft:4,padding:"2px 8px",background:scBg(rev.score),color:sc(rev.score),fontSize:11,fontWeight:800,borderRadius:20 }}>{rev.score} {rev.grade} {exp?"▲":"▼"}</div>}
                    </div>
                    {step.status==="error"&&step.error&&<div style={{ borderTop:`1px solid #FEE2E2`,padding:"8px 14px",background:"#FEF2F2",fontSize:11,color:"#991B1B" }}><span style={{ fontWeight:700 }}>エラー: </span>{step.error}</div>}
                    {rev&&exp&&(
                      <div style={{ borderTop:`1px solid ${T.borderLight}`,padding:"12px 14px",display:"flex",flexDirection:"column",gap:7,background:T.offWhite }}>
                        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                          <div style={{ flex:1,height:4,background:T.paper,borderRadius:2 }}><div style={{ width:`${rev.score}%`,height:"100%",background:sc(rev.score),borderRadius:2,transition:"width 0.5s" }} /></div>
                          <span style={{ fontSize:13,fontWeight:900,color:sc(rev.score) }}>{rev.score}/100</span>
                        </div>
                        {rev.goodPoint&&<div style={{ padding:"6px 10px",background:T.greenLight,borderRadius:6,fontSize:11,color:T.green }}><span style={{ fontWeight:700 }}>✓ </span>{rev.goodPoint}</div>}
                        {rev.issues?.length>0&&<div style={{ padding:"6px 10px",background:T.redLight,borderRadius:6 }}>{rev.issues.map((iss,i)=><div key={i} style={{ fontSize:11,color:T.red,display:"flex",gap:5 }}><span>·</span>{iss}</div>)}</div>}
                        {rev.mustFix&&<div style={{ padding:"6px 10px",background:T.orangeLight,borderRadius:6,fontSize:11,color:T.orange }}><span style={{ fontWeight:700 }}>→ </span>{rev.mustFix}</div>}
                        <div style={{ fontSize:11,fontWeight:700,color:rev.passOrRetry==="pass"?T.green:T.red }}>{rev.passOrRetry==="pass"?"✓ PASS":"✕ RETRY"}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {steps.every(s=>s.status==="done")&&(()=>{
                const scores = steps.filter(s=>s.review?.score).map(s=>s.review!.score);
                const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
                return <div style={{ display:"flex",gap:10,alignItems:"center",padding:"10px 14px",background:T.white,border:`1px solid ${T.border}`,borderRadius:10 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:T.inkMuted }}>総合品質</span>
                  <div style={{ flex:1,height:4,background:T.paper,borderRadius:2 }}><div style={{ width:`${avg}%`,height:"100%",background:sc(avg),borderRadius:2 }} /></div>
                  <span style={{ fontSize:14,fontWeight:900,color:sc(avg),padding:"2px 10px",background:scBg(avg),borderRadius:20 }}>{avg}/100</span>
                </div>;
              })()}
            </div>
          )}

          <button onClick={generate} disabled={generating||!brief.trim()}
            style={{ padding:"13px 0",background:generating||!brief.trim()?T.paper:T.ink,border:"none",borderRadius:10,color:generating||!brief.trim()?T.inkFaint:T.white,fontSize:14,fontWeight:700,cursor:generating||!brief.trim()?"not-allowed":"pointer",letterSpacing:"-0.01em",transition:"all 0.2s",fontFamily:"inherit" }}>
            {generating?`生成中 (${steps.filter(s=>s.status==="done").length}/${steps.length} 完了)...`:"プロジェクトデザイン案を生成する →"}
          </button>

          {error&&<div style={{ padding:"10px 14px",background:T.redLight,border:`1px solid #FCCACA`,borderRadius:8,fontSize:12,color:T.red }}>{error}</div>}

          {result&&(
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div style={{ height:1,background:T.border }} />

              <Card style={{ padding:20 }}>
                <div style={{ fontSize:20,fontWeight:900,color:T.ink,letterSpacing:"-0.03em",marginBottom:6 }}>{result.projectName as string}</div>
                <div style={{ fontSize:13,color:T.inkLight,lineHeight:1.8,marginBottom:10 }}>{result.summary as string}</div>
                <div style={{ display:"flex",alignItems:"flex-start",gap:6 }}>
                  <TAG color={T.inkMuted} bg={T.paper}>ゴール</TAG>
                  <span style={{ fontSize:12,color:T.ink,lineHeight:1.6 }}>{result.goal as string}</span>
                </div>
              </Card>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <Card style={{ padding:14 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>推奨開始フェーズ</div>
                  {(()=>{ const sp=phaseMap[result.startingPhase as string]; return sp?(
                    <div>
                      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5 }}>
                        <div style={{ width:4,height:16,background:sp.band,borderRadius:2 }} />
                        <span style={{ fontSize:12,fontWeight:700,color:T.ink }}>{sp.shortLabel}</span>
                      </div>
                      <div style={{ fontSize:11,color:T.inkMuted,lineHeight:1.6 }}>{result.startingPhaseReason as string}</div>
                    </div>):null; })()}
                </Card>
                <Card style={{ padding:14 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>スコープ</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    {((result.scope||[]) as string[]).map((s,i)=><div key={i} style={{ fontSize:11,color:T.inkLight,display:"flex",gap:5 }}><span style={{ color:T.green }}>+</span>{s}</div>)}
                    {((result.outOfScope||[]) as string[]).map((s,i)=><div key={i} style={{ fontSize:11,color:T.inkFaint,display:"flex",gap:5 }}><span>−</span>{s}</div>)}
                  </div>
                </Card>
              </div>

              <Card style={{ padding:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12 }}>チーム構成</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {((result.team||[]) as {role:string;count:number;responsibility:string}[]).map((t,i)=>(
                    <div key={i} style={{ padding:"10px 14px",background:T.offWhite,border:`1px solid ${T.border}`,borderRadius:8,flex:"1 1 160px" }}>
                      <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:3 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:T.ink }}>{t.role}</span>
                        <TAG color={T.inkMuted} bg={T.paper}>×{t.count}名</TAG>
                      </div>
                      <div style={{ fontSize:11,color:T.inkMuted,lineHeight:1.5 }}>{t.responsibility}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>ステークホルダーマップ</div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {((result.stakeholders||[]) as {type:string;name:string;action:string}[]).map((s,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,padding:"8px 10px",background:T.offWhite,borderRadius:7 }}>
                      <TAG color={roleColor[s.type]||T.inkMuted} bg={T.paper}>{s.type}</TAG>
                      <span style={{ fontSize:12,fontWeight:600,color:T.ink,flexShrink:0,minWidth:100 }}>{s.name}</span>
                      <span style={{ fontSize:11,color:T.inkMuted }}>{s.action}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>フェーズロードマップ</div>
                <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                  {((result.phaseRoadmap||[]) as {phaseId:string;duration:string;keyOutput:string;priority:string}[]).map((pr,i)=>{ const ph=phaseMap[pr.phaseId]; return ph?(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:T.offWhite,borderRadius:7,borderLeft:`3px solid ${ph.band}` }}>
                      <span style={{ fontSize:11,fontWeight:700,color:T.ink,flex:1 }}>{ph.shortLabel}</span>
                      <span style={{ fontSize:11,color:T.inkMuted }}>{pr.duration}</span>
                      <TAG color={priColor[pr.priority]||T.inkMuted} bg={T.paper}>{pr.priority}</TAG>
                      <span style={{ fontSize:11,color:T.inkMuted,maxWidth:140,textAlign:"right" }}>{pr.keyOutput}</span>
                    </div>):null; })}
                </div>
              </Card>

              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ fontSize:13,fontWeight:800,color:T.ink,letterSpacing:"-0.02em" }}>VDS バリューデザイン・シンタックス</div>
                  <div style={{ display:"flex",gap:5 }}>
                    {["選ばれる","稼げる","続けられる"].map((l,i)=><TAG key={l} color={[T.blue,T.purple,T.green][i]} bg={[T.blueLight,T.purpleLight,T.greenLight][i]}>{l}</TAG>)}
                  </div>
                </div>
                {vdsBlocks.map(blk=>(
                  <Card key={blk.id} style={{ overflow:"hidden" }}>
                    <div style={{ padding:"10px 16px",background:blk.bg,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:3,height:14,background:blk.color,borderRadius:2 }} />
                      <span style={{ fontSize:12,fontWeight:800,color:blk.color }}>{blk.label}</span>
                      {blk.sub&&<TAG color={blk.color} bg={T.white}>{blk.sub}</TAG>}
                      <span style={{ marginLeft:"auto",fontSize:10,color:T.inkMuted }}>論点：{blk.point}</span>
                    </div>
                    <div style={{ padding:"12px 16px",display:"flex",flexDirection:"column",gap:10 }}>
                      {blk.rows.map(row=>(
                        <div key={row.l} style={{ display:"flex",gap:12 }}>
                          <span style={{ fontSize:11,fontWeight:700,color:blk.color,flexShrink:0,width:100 }}>{row.l}</span>
                          <div style={{ flex:1,fontSize:12,color:T.inkLight,lineHeight:1.7,padding:"5px 10px",background:T.offWhite,borderRadius:6,borderLeft:`2px solid ${blk.color}44` }}>
                            {row.v||<span style={{ color:T.inkFaint }}>—</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
                <Card style={{ padding:16 }}>
                  <div style={{ fontSize:11,fontWeight:800,color:T.ink,marginBottom:12 }}>3条件チェック</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
                    {([{l:"選ばれる",v:three.selected,c:T.blue},{l:"稼げる",v:three.profitable,c:T.purple},{l:"続けられる",v:three.sustainable,c:T.green}]).map(({l,v:val,c})=>(
                      <div key={l} style={{ display:"flex",gap:12 }}>
                        <span style={{ fontSize:12,fontWeight:800,color:c,flexShrink:0,width:70 }}>{l}</span>
                        <div style={{ flex:1,fontSize:12,color:T.inkLight,lineHeight:1.7,padding:"5px 10px",background:T.offWhite,borderRadius:6,borderLeft:`2px solid ${c}55` }}>{val||<span style={{ color:T.inkFaint }}>—</span>}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card style={{ padding:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.inkFaint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 }}>主要リスクと対策</div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {((result.keyRisks||[]) as {risk:string;mitigation:string}[]).map((r,i)=>(
                    <div key={i} style={{ padding:"8px 12px",background:T.redLight,borderRadius:7,borderLeft:`3px solid ${T.red}` }}>
                      <div style={{ fontSize:11,fontWeight:700,color:T.red,marginBottom:2 }}>{r.risk}</div>
                      <div style={{ fontSize:11,color:T.inkMuted }}>→ {r.mitigation}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding:16,background:T.ink }}>
                <div style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12 }}>First Actions</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {((result.firstActions||[]) as string[]).map((a,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ width:22,height:22,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.white,flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontSize:13,color:"rgba(255,255,255,0.85)",lineHeight:1.6 }}>{a}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <button onClick={()=>{
                const text = `# ${result.projectName}\n${result.summary}\nゴール: ${result.goal}`;
                navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000);
              }} style={{ padding:"11px 0",background:copied?T.greenLight:T.offWhite,border:`1px solid ${copied?T.green:T.border}`,borderRadius:10,color:copied?T.green:T.inkMuted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                {copied?"✓ コピーしました":"テキスト形式でコピー"}
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
