"use client";

import { useState } from "react";
import { PHASES, T } from "./lib/constants";
import Sidebar from "./components/Sidebar";
import PhaseHeader from "./components/PhaseHeader";
import TasksTab from "./components/TasksTab";
import ChecksTab from "./components/ChecksTab";
import ChatTab from "./components/ChatTab";
import GeneratorModal from "./components/GeneratorModal";

export default function NEWhAgent() {
  const [activePhase, setActivePhase] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"tasks" | "checks" | "chat">("tasks");
  const [showGenerator, setShowGenerator] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const phase = PHASES[activePhase];
  const doneTasks = phase.tasks.filter((t) => completedTasks[`${phase.id}-${t.id}`]).length;
  const progress = Math.round((doneTasks / phase.tasks.length) * 100);

  const toggleTask = (id: string) => {
    setCompletedTasks((p) => ({ ...p, [`${phase.id}-${id}`]: !p[`${phase.id}-${id}`] }));
  };

  return (
    <div style={{ fontFamily:"'Helvetica Neue',Helvetica,'Hiragino Sans','Noto Sans JP',sans-serif", background:T.offWhite, minHeight:"100vh", color:T.ink, display:"flex", flexDirection:"column" }}>
      {showGenerator && <GeneratorModal onClose={() => setShowGenerator(false)} />}

      {/* Header */}
      <header style={{ background:T.white, borderBottom:`1px solid ${T.border}`, padding:"12px 20px", display:"flex", alignItems:"center", gap:14, flexShrink:0, boxShadow:"0 1px 0 rgba(0,0,0,0.04)" }}>
        <div style={{ width:28, height:28, background:T.ink, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:T.white }}>N</div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:T.ink, letterSpacing:"-0.02em" }}>NEWh 新規事業創出支援</div>
          <div style={{ fontSize:10, color:T.inkFaint }}>Innovation Design & Studio</div>
        </div>
        <button onClick={() => setShowGenerator(true)} style={{ marginLeft:"auto", padding:"8px 16px", background:T.ink, border:"none", borderRadius:8, color:T.white, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          PD案生成 →
        </button>
      </header>

      <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 57px)" }}>
        <Sidebar phases={PHASES} activePhase={activePhase} setActivePhase={setActivePhase} completedTasks={completedTasks} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />

        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <PhaseHeader phase={phase} progress={progress} />

          <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, background:T.white, flexShrink:0 }}>
            {(["tasks","checks","chat"] as const).map(tab => {
              const labels = { tasks:"タスク", checks:"チェック", chat:"AI相談" };
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding:"10px 20px", background:"transparent", border:"none", borderBottom:activeTab===tab?`2px solid ${phase.band}`:"2px solid transparent", color:activeTab===tab?T.ink:T.inkFaint, cursor:"pointer", fontSize:13, fontWeight:activeTab===tab?700:400, transition:"all 0.15s" }}>
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {activeTab==="tasks" && <TasksTab phase={phase} completedTasks={completedTasks} toggleTask={toggleTask} />}
            {activeTab==="checks" && <ChecksTab phase={phase} onOpenChat={() => setActiveTab("chat")} />}
            {activeTab==="chat" && <ChatTab phase={phase} />}
          </div>
        </main>
      </div>
    </div>
  );
}
