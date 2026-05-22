"use client";

import { useState } from "react";
import { PHASES, T, TaskHypothesis, TaskHypothesisMap, TaskSlide, TaskSlideMap } from "./lib/constants";
import Sidebar from "./components/Sidebar";
import PhaseHeader from "./components/PhaseHeader";
import TasksTab from "./components/TasksTab";
import ChecksTab from "./components/ChecksTab";
import ChatTab from "./components/ChatTab";
import GeneratorModal from "./components/GeneratorModal";
import ProjectContextTab from "./components/ProjectContextTab";

const COMPLETED_TASKS_STORAGE_KEY = "newh-agent.completedTasks";
const TASK_HYPOTHESES_STORAGE_KEY = "newh-agent.taskHypotheses";
const TASK_SLIDES_STORAGE_KEY = "newh-agent.taskSlides";
const PROJECT_CONTEXT_STORAGE_KEY = "newh-agent.projectContext";

function loadCompletedTasks(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(COMPLETED_TASKS_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function loadTaskHypotheses(): TaskHypothesisMap {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(TASK_HYPOTHESES_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function loadProjectContext(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PROJECT_CONTEXT_STORAGE_KEY) ?? "";
}

function loadTaskSlides(): TaskSlideMap {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(TASK_SLIDES_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export default function NEWhAgent() {
  const [activePhase, setActivePhase] = useState(0);
  const [activeView, setActiveView] = useState<"context" | "phase">("phase");
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(loadCompletedTasks);
  const [generatedHypotheses, setGeneratedHypotheses] = useState<TaskHypothesisMap>(loadTaskHypotheses);
  const [taskSlides, setTaskSlides] = useState<TaskSlideMap>(loadTaskSlides);
  const [projectContext, setProjectContextState] = useState(loadProjectContext);
  const [activeTab, setActiveTab] = useState<"tasks" | "checks" | "chat">("tasks");
  const [showGenerator, setShowGenerator] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const phase = PHASES[activePhase];
  const doneTasks = phase.tasks.filter((t) => completedTasks[`${phase.id}-${t.id}`]).length;
  const progress = Math.round((doneTasks / phase.tasks.length) * 100);

  const setActivePhaseAndView = (index: number) => {
    setActivePhase(index);
    setActiveView("phase");
  };

  const setProjectContext = (value: string) => {
    setProjectContextState(value);
    window.localStorage.setItem(PROJECT_CONTEXT_STORAGE_KEY, value);
  };

  const toggleTask = (id: string) => {
    setCompletedTasks((p) => {
      const next = { ...p, [`${phase.id}-${id}`]: !p[`${phase.id}-${id}`] };
      window.localStorage.setItem(COMPLETED_TASKS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const applyHypotheses = (hypotheses: TaskHypothesisMap, contextAddition: string) => {
    const nextHypotheses = { ...generatedHypotheses, ...hypotheses };
    setGeneratedHypotheses(nextHypotheses);
    window.localStorage.setItem(TASK_HYPOTHESES_STORAGE_KEY, JSON.stringify(nextHypotheses));
    if (contextAddition.trim()) {
      const nextContext = projectContext.trim()
        ? `${projectContext.trim()}\n\n---\n${contextAddition.trim()}`
        : contextAddition.trim();
      setProjectContext(nextContext);
    }
    setShowGenerator(false);
    setActiveTab("tasks");
    setActiveView("phase");
  };

  const updateHypothesis = (key: string, hypothesis: TaskHypothesis) => {
    const nextHypotheses = { ...generatedHypotheses, [key]: hypothesis };
    setGeneratedHypotheses(nextHypotheses);
    window.localStorage.setItem(TASK_HYPOTHESES_STORAGE_KEY, JSON.stringify(nextHypotheses));
  };

  const updateTaskSlide = (key: string, slide: TaskSlide) => {
    const nextSlides = { ...taskSlides, [key]: slide };
    setTaskSlides(nextSlides);
    window.localStorage.setItem(TASK_SLIDES_STORAGE_KEY, JSON.stringify(nextSlides));
  };

  return (
    <div style={{ fontFamily:"'Helvetica Neue',Helvetica,'Hiragino Sans','Noto Sans JP',sans-serif", background:T.offWhite, minHeight:"100vh", color:T.ink, display:"flex", flexDirection:"column" }}>
      {showGenerator && <GeneratorModal phase={phase} projectContext={projectContext} onApply={applyHypotheses} onClose={() => setShowGenerator(false)} />}

      {/* Header */}
      <header style={{ background:T.white, borderBottom:`1px solid ${T.border}`, padding:"12px 20px", display:"flex", alignItems:"center", gap:14, flexShrink:0, boxShadow:"0 1px 0 rgba(0,0,0,0.04)" }}>
        <div style={{ width:28, height:28, background:T.ink, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:T.white }}>N</div>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:T.ink, letterSpacing:"-0.02em" }}>NEWh 新規事業創出支援</div>
          <div style={{ fontSize:10, color:T.inkFaint }}>Innovation Design & Studio</div>
        </div>
      </header>

      <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 57px)" }}>
        <Sidebar phases={PHASES} activePhase={activePhase} activeView={activeView} onOpenContext={() => setActiveView("context")} setActivePhase={setActivePhaseAndView} completedTasks={completedTasks} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(p => !p)} />

        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {activeView==="phase" ? (
            <PhaseHeader phase={phase} progress={progress} />
          ) : (
            <div style={{ padding:"14px 20px", background:T.white, borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:4, height:20, background:T.ink, borderRadius:2 }} />
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:T.ink, letterSpacing:"-0.02em" }}>プロジェクトコンテキスト</div>
                  <div style={{ fontSize:11, color:T.inkMuted, marginTop:1 }}>仮説生成時に読み込む案件情報を蓄積する。</div>
                </div>
              </div>
            </div>
          )}

          {activeView==="phase" && <div style={{ display:"flex", alignItems:"center", borderBottom:`1px solid ${T.border}`, background:T.white, flexShrink:0 }}>
            {(["tasks","checks","chat"] as const).map(tab => {
              const labels = { tasks:"タスク", checks:"チェック", chat:"AI相談" };
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding:"10px 20px", background:"transparent", border:"none", borderBottom:activeTab===tab?`2px solid ${phase.band}`:"2px solid transparent", color:activeTab===tab?T.ink:T.inkFaint, cursor:"pointer", fontSize:13, fontWeight:activeTab===tab?700:400, transition:"all 0.15s" }}>
                  {labels[tab]}
                </button>
              );
            })}
            <button onClick={() => setShowGenerator(true)} style={{ marginLeft:"auto", marginRight:16, padding:"7px 13px", background:T.ink, border:"none", borderRadius:8, color:T.white, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              タスク仮説生成 →
            </button>
          </div>}

          <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
            {activeView==="context" && <ProjectContextTab context={projectContext} setContext={setProjectContext} />}
            {activeView==="phase" && activeTab==="tasks" && <TasksTab phase={phase} completedTasks={completedTasks} generatedHypotheses={generatedHypotheses} taskSlides={taskSlides} projectContext={projectContext} toggleTask={toggleTask} updateHypothesis={updateHypothesis} updateTaskSlide={updateTaskSlide} />}
            {activeView==="phase" && activeTab==="checks" && <ChecksTab phase={phase} onOpenChat={() => setActiveTab("chat")} />}
            {activeView==="phase" && activeTab==="chat" && <ChatTab phase={phase} />}
          </div>
        </main>
      </div>
    </div>
  );
}
