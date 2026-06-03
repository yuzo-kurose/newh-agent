import { AGENTS, REVIEW_SYSTEM, ReviewResult, CONCEPT_ELEMENTS, ConceptElementKey } from "./constants";

// SSEストリーミングでJSONを取得する共有ヘルパー。
export async function callStreamingJSON<T>(
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

export type BlockPhase = "generating" | "reviewing" | "retry" | "done";

export interface RunBlockCallbacks {
  onPhase?: (phase: BlockPhase, attempt: number) => void;
  onDelta?: (text: string) => void;
  maxAttempts?: number;
}

export interface RunBlockResult {
  data: unknown;
  review: ReviewResult | null;
  attempts: number;
}

const MAX_TOKENS: Record<string, number> = {
  concept: 7000,
  strategy: 8000,
  revenue: 5000,
};

// 1ブロックを「生成 → レビュー → (合格まで)リトライ」で生成する。
export async function runBlock(
  blockId: string,
  brief: string,
  prev: Record<string, unknown>,
  { onPhase, onDelta, maxAttempts = 2 }: RunBlockCallbacks = {}
): Promise<RunBlockResult> {
  const agent = AGENTS[blockId];
  if (!agent) throw new Error(`未知のブロック: ${blockId}`);

  let attempt = 0;
  let lastData: unknown = null;
  let lastReview: ReviewResult | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    onPhase?.(attempt > 1 ? "retry" : "generating", attempt);

    const fix = lastReview?.mustFix ? `\n\n【前回レビューの最重要改善指示】\n${lastReview.mustFix}` : "";
    const userContent = agent.build(brief, prev) + fix;
    lastData = await callStreamingJSON<unknown>(agent.system, userContent, onDelta ?? (() => {}), MAX_TOKENS[blockId] ?? 2500);

    onPhase?.("reviewing", attempt);
    const reviewUser = `レビュー対象ブロック：${agent.label}\n\n評価観点：\n${agent.reviewCriteria}\n\n生成物（JSON）：\n${JSON.stringify(lastData)}`;
    lastReview = await callStreamingJSON<ReviewResult>(REVIEW_SYSTEM, reviewUser, () => {}, 1500);

    if (lastReview.passOrRetry === "pass" || lastReview.score >= 60) break;
  }

  onPhase?.("done", attempt);
  return { data: lastData, review: lastReview, attempts: attempt };
}

// コンセプトの1要素（顧客/課題/手法/価値）を、確定済み要素・前回案・ユーザー意見を踏まえて生成/改善する。
export async function runConceptElement(
  elementKey: ConceptElementKey,
  brief: string,
  confirmed: Record<string, unknown>,
  prevDraft: Record<string, unknown> | null,
  feedback: string,
  onDelta: (text: string) => void
): Promise<Record<string, unknown>> {
  const el = CONCEPT_ELEMENTS.find((e) => e.key === elementKey);
  if (!el) throw new Error(`未知の要素: ${elementKey}`);

  const confirmedText = Object.keys(confirmed).length ? JSON.stringify(confirmed, null, 2) : "なし（最初の要素）";
  const prevText = prevDraft ? JSON.stringify(prevDraft, null, 2) : "なし（初回提案）";
  const feedbackText = feedback.trim() ? feedback.trim() : "特になし。まず案を出す。";

  const userContent =
    `クライアント依頼：\n${brief}\n\n` +
    `確定済みの要素（尊重して整合させる）：\n${confirmedText}\n\n` +
    `この要素の前回提案：\n${prevText}\n\n` +
    `ユーザーの意見・修正指示（最優先で反映）：\n${feedbackText}`;

  return callStreamingJSON<Record<string, unknown>>(el.system, userContent, onDelta, el.maxTokens);
}
