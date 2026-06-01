"use client";
import { Phase, T } from "../lib/constants";

interface ProjectMeta { id: string; name: string; }

interface Props {
  phases: Phase[];
  activePhase: number;
  activeView: "context" | "phase" | "vds";
  onOpenContext: () => void;
  onOpenVds: () => void;
  setActivePhase: (i: number) => void;
  completedTasks: Record<string, boolean>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  projects: ProjectMeta[];
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onRenameProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export default function Sidebar({ phases, activePhase, activeView, onOpenContext, onOpenVds, setActivePhase, completedTasks, collapsed, onToggleCollapse, projects, currentProjectId, onSelectProject, onCreateProject, onRenameProject, onDeleteProject }: Props) {
  const miniBtn = { flex: 1, padding: "4px 0", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.inkMuted, fontSize: 10, fontWeight: 700, cursor: "pointer" } as const;
  return (
    <nav style={{ width:collapsed?52:248, background:T.white, borderRight:`1px solid ${T.border}`, flexShrink:0, display:"flex", flexDirection:"column", transition:"width 0.2s ease", overflowX:"hidden" }}>
      <button onClick={onToggleCollapse}
        style={{ padding:"10px", background:"transparent", border:"none", borderBottom:`1px solid ${T.border}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:collapsed?"center":"flex-end", color:T.inkFaint, fontSize:18, flexShrink:0 }}
        title={collapsed?"開く":"閉じる"}>
        {collapsed ? "›" : "‹"}
      </button>

      {/* プロジェクト選択 */}
      {collapsed ? (
        <button onClick={onToggleCollapse} title="プロジェクトを選択（開く）"
          style={{ padding:"12px 0", background:T.offWhite, border:"none", borderBottom:`1px solid ${T.border}`, cursor:"pointer", display:"flex", justifyContent:"center", fontSize:16 }}>🗂</button>
      ) : (
        <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.inkFaint, letterSpacing:"0.04em" }}>プロジェクト</div>
          <select value={currentProjectId} onChange={(e) => onSelectProject(e.target.value)}
            style={{ width:"100%", padding:"7px 8px", border:`1.5px solid ${T.border}`, borderRadius:8, background:T.white, color:T.ink, fontSize:12, fontWeight:700, outline:"none", cursor:"pointer" }}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display:"flex", gap:5 }}>
            <button onClick={onCreateProject} style={miniBtn}>＋ 新規</button>
            <button onClick={() => onRenameProject(currentProjectId)} style={miniBtn}>名称変更</button>
            <button onClick={() => onDeleteProject(currentProjectId)} style={{ ...miniBtn, color:T.red, borderColor:`${T.red}55` }}>削除</button>
          </div>
        </div>
      )}

      <div style={{ overflowY:"auto", flex:1 }}>
        <button onClick={onOpenContext} title={collapsed ? "プロジェクトコンテキスト" : ""}
          style={{ width:"100%", padding:collapsed?"12px 0":"11px 14px", background:activeView==="context"?T.offWhite:"transparent", border:"none", borderLeft:`3px solid ${activeView==="context"?T.ink:"transparent"}`, cursor:"pointer", textAlign:"left", display:"flex", flexDirection:collapsed?"column":"row", alignItems:collapsed?"center":"center", gap:collapsed?3:7, transition:"all 0.15s" }}>
          <span style={{ fontSize:14, color:activeView==="context"?T.ink:T.inkFaint }}>▣</span>
          {!collapsed && <span style={{ fontSize:13, color:activeView==="context"?T.ink:T.inkMuted, fontWeight:activeView==="context"?700:400 }}>プロジェクトコンテキスト</span>}
        </button>
        <button onClick={onOpenVds} title={collapsed ? "VDS設計" : ""}
          style={{ width:"100%", padding:collapsed?"12px 0":"11px 14px", background:activeView==="vds"?T.offWhite:"transparent", border:"none", borderLeft:`3px solid ${activeView==="vds"?T.ink:"transparent"}`, cursor:"pointer", textAlign:"left", display:"flex", flexDirection:collapsed?"column":"row", alignItems:"center", gap:collapsed?3:7, transition:"all 0.15s" }}>
          <span style={{ fontSize:14, color:activeView==="vds"?T.ink:T.inkFaint }}>◆</span>
          {!collapsed && <span style={{ fontSize:13, color:activeView==="vds"?T.ink:T.inkMuted, fontWeight:activeView==="vds"?700:400 }}>VDS設計</span>}
        </button>
        {phases.map((p, i) => {
          const done = p.tasks.filter(t => completedTasks[`${p.id}-${t.id}`]).length;
          const pct = Math.round((done / p.tasks.length) * 100);
          const active = activeView === "phase" && activePhase === i;
          return (
            <button key={p.id} onClick={() => setActivePhase(i)} title={collapsed ? p.label : ""}
              style={{ width:"100%", padding:collapsed?"12px 0":"10px 14px", background:active?T.offWhite:"transparent", border:"none", borderLeft:`3px solid ${active?p.band:"transparent"}`, cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", alignItems:collapsed?"center":"stretch", gap:4, transition:"all 0.15s" }}>
              {collapsed ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:16, color:active?p.band:T.inkFaint }}>{p.icon}</span>
                  <div style={{ width:20, height:2, background:T.paper, borderRadius:1 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:p.band, borderRadius:1 }} />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:13, color:active?p.band:T.inkFaint }}>{p.icon}</span>
                    <span style={{ fontSize:13, color:active?T.ink:T.inkMuted, fontWeight:active?700:400, lineHeight:1.3 }}>{p.label}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:17 }}>
                    <div style={{ flex:1, height:2, background:T.paper, borderRadius:1 }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:p.band, borderRadius:1, transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:11, color:T.inkFaint }}>{done}/{p.tasks.length}</span>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
