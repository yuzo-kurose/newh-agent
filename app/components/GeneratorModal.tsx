"use client";
import { useMemo, useState } from "react";
import { Phase, T, TaskHypothesisMap } from "../lib/constants";

interface FollowupQuestion {
  id: string;
  question: string;
  reason: string;
}

interface HypothesisResponse {
  status: "needs_info" | "ready";
  summary: string;
  questions: FollowupQuestion[];
  hypotheses: TaskHypothesisMap;
}

interface Props {
  phase: Phase;
  projectContext: string;
  onApply: (hypotheses: TaskHypothesisMap, brief: string) => void;
  onClose: () => void;
}

async function callStreamingJSON<T>(
  system: string,
  userContent: string,
  onDelta: (text: string) => void,
  maxTokens = 3000
): Promise<T> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userContent, maxTokens, responseFormat: "json", stream: true }),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "ストリーミング接続に失敗しました。");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalValue: T | null = null;

  const handleEvent = (chunk: string) => {
    const eventLine = chunk.split("\n").find((line) => line.startsWith("event: "));
    const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
    if (!eventLine || !dataLine) return;

    const event = eventLine.slice("event: ".length).trim();
    const data = JSON.parse(dataLine.slice("data: ".length));
    if (event === "delta") onDelta(data.text || "");
    if (event === "error") throw new Error(data.error || "生成に失敗しました。");
    if (event === "final") finalValue = data.json as T;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventChunk of events) {
      if (eventChunk.trim()) handleEvent(eventChunk);
    }
    if (done) break;
  }

  if (buffer.trim()) handleEvent(buffer);
  if (!finalValue) throw new Error("生成結果を取得できませんでした。");
  return finalValue;
}

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, ...style }}>{children}</div>
);

const HYPOTHESIS_SYSTEM = `あなたはNEWhのシニアビジネスデザイナーです。
保存済みのプロジェクトコンテキストと今回追加された案件情報をもとに、指定されたフェーズ内の各タスクで検証すべき「案件固有の仮説」を作成してください。

重要:
- 汎用論ではなく、入力情報の業界・顧客・制約・資産・意思決定状況に必ず紐づける。
- 指定されたフェーズ以外のタスク仮説は作成しない。
- 各仮説は「現時点では〇〇の可能性がある。だからこのタスクでは〇〇を検証・明確化する。」という実務で使える粒度にする。
- 情報不足が大きい場合は、statusをneeds_infoにして、精度向上に効く追加質問を最大5件返す。
- ただし、分かる範囲の仮説は必ずhypothesesに入れる。
- 質問への回答がすでに与えられている場合は、statusをreadyにする。
- JSONのみ返す。

JSON形式:
{"status":"needs_info|ready","summary":"案件理解の要約","questions":[{"id":"q1","question":"追加で聞く質問","reason":"なぜ必要か"}],"hypotheses":{"setup-s1":"仮説文"}}`;

export default function GeneratorModal({ phase, projectContext, onApply, onClose }: Props) {
  const [brief, setBrief] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<HypothesisResponse | null>(null);
  const [streamText, setStreamText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examples = [
    "大手食品メーカー。50代向けの健康食品の新規事業を立ち上げたい。既存のBtoC事業の知見はあるが新規事業は初めて。予算は半年・チーム3名。",
    "地方銀行。中小企業向けのDXコンサル事業を立ち上げたい。自行の営業網・顧客データを活用したい。競合はコンサル大手。経営層の承認を年内に取りたい。",
    "建設会社。建設現場の人手不足を解決するAI・IoT活用のサービスを開発したい。既にPoCを1度やったが事業化の判断ができていない。",
  ];

  const taskList = useMemo(
    () => ({
      phaseId: phase.id,
      phaseLabel: phase.label,
      phaseDescription: phase.description,
      tasks: phase.tasks.map((task) => ({
        key: `${phase.id}-${task.id}`,
        label: task.label,
        description: task.desc,
      })),
    }),
    [phase]
  );

  const combinedBrief = useMemo(() => {
    const answered = Object.entries(answers)
      .filter(([, value]) => value.trim())
      .map(([id, value]) => {
        const question = result?.questions.find((q) => q.id === id)?.question ?? id;
        return `Q: ${question}\nA: ${value.trim()}`;
      });
    return answered.length ? `${brief.trim()}\n\n追加情報:\n${answered.join("\n\n")}` : brief.trim();
  }, [answers, brief, result?.questions]);

  const hasSourceContext = !!(brief.trim() || projectContext.trim());

  const generate = async () => {
    if (!hasSourceContext || loading) return;
    setLoading(true);
    setError(null);
    setStreamText("");
    try {
      const content = `保存済みプロジェクトコンテキスト:\n${projectContext.trim() || "未入力"}\n\n今回追加された案件情報:\n${combinedBrief || "未入力"}\n\n対象フェーズとタスク一覧:\n${JSON.stringify(taskList, null, 2)}\n\n対象フェーズ内の全タスクキーに対応する仮説を、可能な限り案件固有に生成してください。`;
      const next = await callStreamingJSON<HypothesisResponse>(
        HYPOTHESIS_SYSTEM,
        content,
        (text) => setStreamText((prev) => prev + text),
        5000
      );
      setResult({
        status: next.status,
        summary: next.summary || "",
        questions: Array.isArray(next.questions) ? next.questions.slice(0, 5) : [],
        hypotheses: next.hypotheses || {},
      });
    } catch (e) {
      setError(`仮説生成に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const hypothesisCount = result ? Object.keys(result.hypotheses || {}).length : 0;
  const canApply = result && hypothesisCount > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,8,0.6)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 16px" }}>
      <div style={{ width: "100%", maxWidth: 920, background: T.offWhite, borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>タスク仮説 生成</div>
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{phase.label} のタスク仮説を作成。不足情報があれば追加質問します。</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: T.paper, border: `1px solid ${T.border}`, color: T.inkMuted, cursor: "pointer", fontSize: 14 }}>x</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>案件情報</div>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="このフェーズの仮説生成に追加したい情報を書いてください。保存済みのプロジェクトコンテキストも併せて読み込みます。"
              style={{ width: "100%", minHeight: 108, padding: "10px 12px", background: T.offWhite, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.ink, fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: T.inkFaint, alignSelf: "center" }}>記入例:</span>
              {examples.map((ex, i) => (
                <button key={i} onClick={() => setBrief(ex)} style={{ padding: "3px 10px", background: T.paper, border: `1px solid ${T.border}`, borderRadius: 20, color: T.inkMuted, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>例{i + 1}</button>
              ))}
            </div>
          </Card>

          {result?.questions.length ? (
            <Card style={{ padding: 16, borderColor: result.status === "needs_info" ? "#F2C48B" : T.border }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.orange, marginBottom: 10 }}>追加すると精度が上がる情報</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.questions.map((q) => (
                  <div key={q.id}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, lineHeight: 1.6 }}>{q.question}</div>
                    <div style={{ fontSize: 11, color: T.inkFaint, marginBottom: 5 }}>{q.reason}</div>
                    <input
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="分かる範囲で入力"
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.offWhite, fontSize: 12, color: T.ink, outline: "none" }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <button
            onClick={generate}
            disabled={loading || !hasSourceContext}
            style={{ padding: "13px 0", background: loading || !hasSourceContext ? T.paper : T.ink, border: "none", borderRadius: 10, color: loading || !hasSourceContext ? T.inkFaint : T.white, fontSize: 14, fontWeight: 700, cursor: loading || !hasSourceContext ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "仮説を生成中..." : result?.questions.length ? "追加情報を反映して再生成する" : "タスク仮説を生成する"}
          </button>

          {error && <div style={{ padding: "10px 14px", background: T.redLight, border: "1px solid #FCCACA", borderRadius: 8, fontSize: 12, color: T.red }}>{error}</div>}

          {(loading || streamText) && (
            <Card style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>リアルタイム生成</div>
                <div style={{ fontSize: 11, color: loading ? T.blue : T.green, fontWeight: 700 }}>{loading ? "STREAMING" : "DONE"}</div>
              </div>
              <pre style={{ maxHeight: 220, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, padding: 12, background: T.offWhite, border: `1px solid ${T.borderLight}`, borderRadius: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 11, lineHeight: 1.6, color: T.inkLight }}>
                {streamText || "接続中..."}
              </pre>
            </Card>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.ink }}>案件理解</div>
                    <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.7, marginTop: 4 }}>{result.summary}</div>
                  </div>
                  <span style={{ padding: "3px 9px", borderRadius: 20, background: result.status === "ready" ? T.greenLight : T.orangeLight, color: result.status === "ready" ? T.green : T.orange, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {result.status === "ready" ? "READY" : "要追加情報"}
                  </span>
                </div>
              <div style={{ fontSize: 11, color: T.inkFaint }}>生成済み: {hypothesisCount}件 / {phase.tasks.length}件</div>
            </Card>

              <Card style={{ padding: 12, borderLeft: `3px solid ${phase.band}` }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, marginBottom: 6 }}>{phase.shortLabel}</div>
                <div style={{ fontSize: 11, color: T.inkMuted }}>{phase.tasks.filter((task) => result.hypotheses[`${phase.id}-${task.id}`]).length}/{phase.tasks.length} タスクの仮説を生成</div>
              </Card>

              <button
                onClick={() => canApply && onApply(result.hypotheses, combinedBrief)}
                disabled={!canApply}
                style={{ padding: "12px 0", background: canApply ? T.green : T.paper, border: "none", borderRadius: 10, color: canApply ? T.white : T.inkFaint, fontSize: 13, fontWeight: 800, cursor: canApply ? "pointer" : "not-allowed", fontFamily: "inherit" }}
              >
                生成した仮説をタスクに反映する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
