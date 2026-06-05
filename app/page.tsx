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
import VdsTab, { VdsResults } from "./components/VdsTab";
import { useIsMobile } from "./lib/useIsMobile";

const PROJECTS_KEY = "newh-agent.projects";
const CURRENT_KEY = "newh-agent.currentProject";
const pkey = (pid: string, name: string) => `newh-agent.p.${pid}.${name}`;
const PROJECT_DATA_KEYS = ["completedTasks", "taskHypotheses", "taskSlides", "projectContext", "vdsResults", "vdsBrief"];

export interface ProjectMeta { id: string; name: string; }

function readObj<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const s = window.localStorage.getItem(key);
    if (!s) return fallback;
    const p = JSON.parse(s);
    return p && typeof p === "object" ? (p as T) : fallback;
  } catch {
    return fallback;
  }
}
const readStr = (key: string): string => (typeof window === "undefined" ? "" : window.localStorage.getItem(key) ?? "");

const loadCompleted = (pid: string) => readObj<Record<string, boolean>>(pkey(pid, "completedTasks"), {});
const loadHyp = (pid: string) => readObj<TaskHypothesisMap>(pkey(pid, "taskHypotheses"), {});
const loadSlides = (pid: string) => readObj<TaskSlideMap>(pkey(pid, "taskSlides"), {});
const loadVds = (pid: string) => readObj<VdsResults>(pkey(pid, "vdsResults"), {});
const loadCtx = (pid: string) => readStr(pkey(pid, "projectContext"));

// プロジェクト一覧と現在IDを初期化。初回は既存データを「プロジェクト1」へ移行する。
function initProjects(): { projects: ProjectMeta[]; currentId: string } {
  if (typeof window === "undefined") return { projects: [{ id: "p1", name: "プロジェクト1" }], currentId: "p1" };
  let projects = readObj<ProjectMeta[]>(PROJECTS_KEY, []);
  if (!Array.isArray(projects)) projects = [];
  let currentId = window.localStorage.getItem(CURRENT_KEY) || "";
  if (projects.length === 0) {
    const id = "p1";
    projects = [{ id, name: "プロジェクト1" }];
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    PROJECT_DATA_KEYS.forEach((name) => {
      const v = window.localStorage.getItem(`newh-agent.${name}`);
      if (v !== null && window.localStorage.getItem(pkey(id, name)) === null) window.localStorage.setItem(pkey(id, name), v);
    });
    currentId = id;
  }
  if (!currentId || !projects.find((p) => p.id === currentId)) currentId = projects[0].id;
  window.localStorage.setItem(CURRENT_KEY, currentId);
  return { projects, currentId };
}

export default function NEWhAgent() {
  const [init] = useState(initProjects);
  const [projects, setProjects] = useState<ProjectMeta[]>(init.projects);
  const [currentId, setCurrentId] = useState<string>(init.currentId);

  const [activePhase, setActivePhase] = useState(0);
  const [activeView, setActiveView] = useState<"context" | "phase" | "vds">("phase");
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => loadCompleted(init.currentId));
  const [generatedHypotheses, setGeneratedHypotheses] = useState<TaskHypothesisMap>(() => loadHyp(init.currentId));
  const [taskSlides, setTaskSlides] = useState<TaskSlideMap>(() => loadSlides(init.currentId));
  const [vdsResults, setVdsResults] = useState<VdsResults>(() => loadVds(init.currentId));
  const [projectContext, setProjectContextState] = useState<string>(() => loadCtx(init.currentId));
  const [activeTab, setActiveTab] = useState<"tasks" | "checks" | "chat">("tasks");
  const [showGenerator, setShowGenerator] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeNavOnMobile = () => { if (isMobile) setMobileNavOpen(false); };

  const phase = PHASES[activePhase];
  const doneTasks = phase.tasks.filter((t) => completedTasks[`${phase.id}-${t.id}`]).length;
  const progress = Math.round((doneTasks / phase.tasks.length) * 100);

  const saveProjects = (next: ProjectMeta[]) => {
    setProjects(next);
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  };

  const selectProject = (id: string) => {
    if (id === currentId) return;
    window.localStorage.setItem(CURRENT_KEY, id);
    setCurrentId(id);
    setCompletedTasks(loadCompleted(id));
    setGeneratedHypotheses(loadHyp(id));
    setTaskSlides(loadSlides(id));
    setVdsResults(loadVds(id));
    setProjectContextState(loadCtx(id));
  };

  const createProject = () => {
    const name = (window.prompt("新しいプロジェクト名", `プロジェクト${projects.length + 1}`) || "").trim();
    if (!name) return;
    const id = "p" + Date.now();
    saveProjects([...projects, { id, name }]);
    selectProject(id);
    setActiveView("vds");
  };

  const renameProject = (id: string) => {
    const cur = projects.find((p) => p.id === id);
    const name = (window.prompt("プロジェクト名を変更", cur?.name || "") || "").trim();
    if (!name) return;
    saveProjects(projects.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) { window.alert("最後のプロジェクトは削除できません。"); return; }
    const cur = projects.find((p) => p.id === id);
    if (!window.confirm(`「${cur?.name}」を削除しますか？このプロジェクトの保存データも消えます。`)) return;
    PROJECT_DATA_KEYS.forEach((n) => window.localStorage.removeItem(pkey(id, n)));
    const next = projects.filter((p) => p.id !== id);
    saveProjects(next);
    if (currentId === id) selectProject(next[0].id);
  };

  const setActivePhaseAndView = (index: number) => {
    setActivePhase(index);
    setActiveView("phase");
  };

  const setProjectContext = (value: string) => {
    setProjectContextState(value);
    window.localStorage.setItem(pkey(currentId, "projectContext"), value);
  };

  const toggleTask = (id: string) => {
    setCompletedTasks((p) => {
      const next = { ...p, [`${phase.id}-${id}`]: !p[`${phase.id}-${id}`] };
      window.localStorage.setItem(pkey(currentId, "completedTasks"), JSON.stringify(next));
      return next;
    });
  };

  const applyHypotheses = (hypotheses: TaskHypothesisMap, contextAddition: string) => {
    const nextHypotheses = { ...generatedHypotheses, ...hypotheses };
    setGeneratedHypotheses(nextHypotheses);
    window.localStorage.setItem(pkey(currentId, "taskHypotheses"), JSON.stringify(nextHypotheses));
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
    window.localStorage.setItem(pkey(currentId, "taskHypotheses"), JSON.stringify(nextHypotheses));
  };

  const updateTaskSlide = (key: string, slide: TaskSlide) => {
    const nextSlides = { ...taskSlides, [key]: slide };
    setTaskSlides(nextSlides);
    window.localStorage.setItem(pkey(currentId, "taskSlides"), JSON.stringify(nextSlides));
  };

  const persistVdsResults = (results: VdsResults) => {
    setVdsResults(results);
    window.localStorage.setItem(pkey(currentId, "vdsResults"), JSON.stringify(results));
  };

  return (
    <div style={{ fontFamily:"'Helvetica Neue',Helvetica,'Hiragino Sans','Noto Sans JP',sans-serif", background:T.offWhite, minHeight:"100vh", color:T.ink, display:"flex", flexDirection:"column" }}>
      {showGenerator && <GeneratorModal phase={phase} projectContext={projectContext} onApply={applyHypotheses} onClose={() => setShowGenerator(false)} />}

      {/* Header */}
      <header style={{ background:T.white, borderBottom:`1px solid ${T.border}`, padding:isMobile?"10px 14px":"12px 20px", display:"flex", alignItems:"center", gap:isMobile?10:14, flexShrink:0, boxShadow:"0 1px 0 rgba(0,0,0,0.04)" }}>
        {isMobile && (
          <button onClick={() => setMobileNavOpen(o => !o)} aria-label="メニュー"
            style={{ width:36, height:36, flexShrink:0, background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, color:T.ink, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>☰</button>
        )}
        <div style={{ width:28, height:28, background:T.ink, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, color:T.white, flexShrink:0 }}>N</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:T.ink, letterSpacing:"-0.02em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>NEWh 新規事業創出支援</div>
          {!isMobile && <div style={{ fontSize:12, color:T.inkFaint }}>Innovation Design & Studio</div>}
        </div>
      </header>

      <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 57px)", position:"relative" }}>
        {/* モバイル：ドロワーの背景オーバーレイ */}
        {isMobile && mobileNavOpen && (
          <div onClick={() => setMobileNavOpen(false)}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)", zIndex:40 }} />
        )}
        <div style={isMobile
          ? { position:"absolute", top:0, left:0, bottom:0, zIndex:50, transform:mobileNavOpen?"translateX(0)":"translateX(-100%)", transition:"transform 0.2s ease", boxShadow:mobileNavOpen?"2px 0 16px rgba(0,0,0,0.18)":"none", display:"flex" }
          : { display:"flex", flexShrink:0 }}>
          <Sidebar
            phases={PHASES} activePhase={activePhase} activeView={activeView}
            onOpenContext={() => { setActiveView("context"); closeNavOnMobile(); }} onOpenVds={() => { setActiveView("vds"); closeNavOnMobile(); }}
            setActivePhase={(i) => { setActivePhaseAndView(i); closeNavOnMobile(); }} completedTasks={completedTasks}
            collapsed={isMobile ? false : sidebarCollapsed} onToggleCollapse={isMobile ? () => setMobileNavOpen(false) : () => setSidebarCollapsed(p => !p)}
            projects={projects} currentProjectId={currentId}
            onSelectProject={(id) => { selectProject(id); closeNavOnMobile(); }} onCreateProject={createProject}
            onRenameProject={renameProject} onDeleteProject={deleteProject}
          />
        </div>

        <main style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {activeView==="phase" ? (
            <PhaseHeader phase={phase} progress={progress} />
          ) : (
            <div style={{ padding:"14px 20px", background:T.white, borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:4, height:20, background:T.ink, borderRadius:2 }} />
                <div>
                  <div style={{ fontSize:17, fontWeight:800, color:T.ink, letterSpacing:"-0.02em" }}>
                    {activeView==="vds" ? "VDS設計" : "プロジェクトコンテキスト"}
                  </div>
                  <div style={{ fontSize:12, color:T.inkMuted, marginTop:1 }}>
                    {activeView==="vds" ? "VDSの各ブロックを生成→レビュー→リトライで作成する。" : "仮説生成時に読み込む案件情報を蓄積する。"}
                  </div>
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

          <div style={{ flex:1, overflowY:"auto", padding:isMobile?"12px":"20px" }}>
            {activeView==="context" && <ProjectContextTab context={projectContext} setContext={setProjectContext} />}
            {activeView==="vds" && <VdsTab key={currentId} projectId={currentId} projectContext={projectContext} results={vdsResults} onPersist={persistVdsResults} fullWidth={sidebarCollapsed} />}
            {activeView==="phase" && activeTab==="tasks" && <TasksTab phase={phase} completedTasks={completedTasks} generatedHypotheses={generatedHypotheses} taskSlides={taskSlides} projectContext={projectContext} toggleTask={toggleTask} updateHypothesis={updateHypothesis} updateTaskSlide={updateTaskSlide} />}
            {activeView==="phase" && activeTab==="checks" && <ChecksTab phase={phase} onOpenChat={() => setActiveTab("chat")} />}
            {activeView==="phase" && activeTab==="chat" && <ChatTab phase={phase} />}
          </div>
        </main>
      </div>
    </div>
  );
}
