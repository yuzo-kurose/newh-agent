// ============================================================
// DESIGN TOKENS
// ============================================================
export const T = {
  white: "#FFFFFF",
  offWhite: "#F7F6F3",
  paper: "#F0EEE9",
  ink: "#0A0A08",
  inkLight: "#3A3A36",
  inkMuted: "#8A8A82",
  inkFaint: "#C8C8C0",
  border: "#E2E0D8",
  borderLight: "#EDECE8",
  red: "#D93025",
  redLight: "#FCF0EF",
  blue: "#1B5FBF",
  blueLight: "#EEF3FC",
  green: "#1A7A3C",
  greenLight: "#EEF8F2",
  orange: "#C45D00",
  orangeLight: "#FEF4EC",
  purple: "#5B2D9A",
  purpleLight: "#F3EEF9",
};

// ============================================================
// TYPES
// ============================================================
export interface Phase {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  band: string;
  description: string;
  tasks: Task[];
  checks: string[];
}

export interface Task {
  id: string;
  label: string;
  desc: string;
}

export interface AgentDef {
  label: string;
  icon: string;
  color: string;
  reviewCriteria: string;
  system: string;
  build: (brief: string, prev: Record<string, unknown>) => string;
}

export interface ReviewResult {
  score: number;
  grade: string;
  goodPoint: string;
  issues: string[];
  mustFix: string;
  passOrRetry: "pass" | "retry";
}

export interface StepState {
  id: string;
  label: string;
  icon: string;
  color: string;
  status: "pending" | "generating" | "reviewing" | "retry" | "done" | "error";
  attempt: number;
  review: ReviewResult | null;
  allReviews: { attempt: number; review: ReviewResult; data: unknown }[];
  data: unknown;
  error: string | null;
}

export interface TaskHypothesis {
  currentHypothesis: string;
  missingInfo: string;
  discussionPoints: string;
  conclusion: string;
}

export type TaskHypothesisValue = string | TaskHypothesis;
export type TaskHypothesisMap = Record<string, TaskHypothesisValue>;

export type SlideSectionType = "bullets" | "table" | "comparison" | "flow" | "kpi" | "matrix";

export interface SlideSection {
  heading: string;
  type: SlideSectionType;
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
  comparison?: { criteria: string[]; items: { label: string; values: string[] }[] };
  flow?: { steps: { label: string; desc?: string }[] };
  kpi?: { metrics: { label: string; value: string; unit?: string; trend?: "up" | "down" | "flat" }[] };
  matrix?: { xLabel: string; yLabel: string; cells: { x: string; y: string; label: string; desc: string }[] };
}

export interface TaskSlide {
  title: string;
  subtitle: string;
  keyMessage: string;
  designId: string;
  designName: string;
  designRationale: string;
  sections: SlideSection[];
  speakerNote: string;
  imageData?: string;
  imageMimeType?: string;
}

export type TaskSlideMap = Record<string, TaskSlide>;

export interface SlideDesignProfile {
  id: string;
  name: string;
  bestFor: string;
  designMd: string;
  colors: {
    canvas: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
  };
}

export const SLIDE_DESIGN_PROFILES: SlideDesignProfile[] = [
  {
    id: "ibm-carbon",
    name: "Enterprise Grid",
    bestFor: "大企業、製造、金融、BtoB、技術信頼性、上申資料",
    designMd: "White and light-gray enterprise canvas, charcoal type, one confident IBM blue accent, square geometry, thin borders, no shadows, data and logic first.",
    colors: { canvas: "#FFFFFF", surface: "#F4F4F4", ink: "#161616", muted: "#525252", accent: "#0F62FE" },
  },
  {
    id: "apple-premium",
    name: "Premium Minimal",
    bestFor: "消費者向け、体験価値、プレミアム商材、プロダクト構想",
    designMd: "Large white space, cinematic product-like composition, restrained monochrome, soft gray surfaces, precise typography, emotional but quiet.",
    colors: { canvas: "#FBFBFD", surface: "#F5F5F7", ink: "#1D1D1F", muted: "#6E6E73", accent: "#0071E3" },
  },
  {
    id: "stripe-growth",
    name: "Growth Gradient",
    bestFor: "Fintech、SaaS、成長戦略、決済、プラットフォーム事業",
    designMd: "Clean SaaS precision with elegant purple-blue accents, subtle gradients, crisp cards, metrics-forward layout, sophisticated growth narrative.",
    colors: { canvas: "#FFFFFF", surface: "#F6F9FC", ink: "#0A2540", muted: "#425466", accent: "#635BFF" },
  },
  {
    id: "notion-warm",
    name: "Warm Workspace",
    bestFor: "共創、ワークショップ、組織変革、ナレッジ、教育",
    designMd: "Warm minimal workspace, paper-like surfaces, calm typography, gentle borders, note-taking structure, human and collaborative.",
    colors: { canvas: "#FBFAF8", surface: "#F1EFEC", ink: "#2F3437", muted: "#787774", accent: "#A65F2B" },
  },
  {
    id: "linear-precision",
    name: "Precision Dark",
    bestFor: "開発組織、プロダクトマネジメント、実行計画、ロードマップ",
    designMd: "Ultra-minimal dark precision, compact information density, violet accent, crisp hierarchy, roadmap and execution oriented.",
    colors: { canvas: "#0D0E12", surface: "#17181F", ink: "#F7F8F8", muted: "#A1A1AA", accent: "#8B5CF6" },
  },
  {
    id: "miro-workshop",
    name: "Workshop Canvas",
    bestFor: "アイデア発散、リサーチ統合、ワークショップ、未来構想",
    designMd: "Bright collaboration board, yellow accent, sticky-note energy, modular blocks, friendly visual organization for divergent thinking.",
    colors: { canvas: "#FFFDF2", surface: "#FFFFFF", ink: "#050038", muted: "#6B6880", accent: "#FFD02F" },
  },
];

export function getSlideDesignProfile(id: string): SlideDesignProfile {
  return SLIDE_DESIGN_PROFILES.find((profile) => profile.id === id) ?? SLIDE_DESIGN_PROFILES[0];
}

// ============================================================
// PHASES
// ============================================================
export const PHASES: Phase[] = [
  {
    id: "setup", label: "00 プロジェクト設計", shortLabel: "PJ設計", icon: "◈", band: T.red,
    description: "成功の5割はここで決まる。ゴール・スコープ・チーム・プロセスを設計する。",
    tasks: [
      { id: "s1", label: "プロジェクトゴールの定義", desc: "「何を達成すれば成功か」を決裁者と合意する。" },
      { id: "s2", label: "スコープ・非スコープの明確化", desc: "「やること/やらないこと」を明文化し、期待値のズレを防ぐ。" },
      { id: "s3", label: "チーム組成とロール定義", desc: "BD・SD・PD・クライアントPOの役割を設計する。" },
      { id: "s4", label: "ステークホルダーマップの作成", desc: "決裁者・推進者・協力者・抵抗者を可視化。根回し計画を立てる。" },
      { id: "s5", label: "プロセス設計（デザインフローチャート）", desc: "目的・フェーズ・予算に最適なプロセスを選定する。" },
      { id: "s6", label: "QCDの合意", desc: "マイルストーン・予算配分・意思決定タイミングを計画する。" },
      { id: "s7", label: "コミュニケーション設計", desc: "週次定例・報告ライン・意思決定フローを設計する。" },
    ],
    checks: ["決裁者がゴールに腹落ちしているか？", "「うちがやる意義」が言語化できているか？", "推進チームに不確実性への耐性があるか？", "Go/No-Go基準が設定されているか？"],
  },
  {
    id: "future", label: "01 未来・ビジョン構想", shortLabel: "ビジョン", icon: "◎", band: T.blue,
    description: "メガトレンドから逆算してビジョンを構想する。未来視点×顧客視点の両立がNEWhの核心。",
    tasks: [
      { id: "f1", label: "メガトレンド分析", desc: "5〜10年先の社会変化を俯瞰する。" },
      { id: "f2", label: "イシューマップの作成", desc: "社会・業界・自社課題を構造化し「解くべき問い」を洗い出す。" },
      { id: "f3", label: "シナリオ・プランニング", desc: "未来シナリオを複数検討する。" },
      { id: "f4", label: "ビジョンWS", desc: "実現したい未来＝大きな方向性と判断基準を言語化する。" },
      { id: "f5", label: "発散手法（レゴ等）", desc: "言語化しにくいビジョンを立体的に表現・共有する。" },
    ],
    checks: ["ビジョンはチーム全員が共有・共感できているか？", "意思決定の判断基準として機能するか？", "自社の強みと未来トレンドの交点を捉えているか？", "「新しい問い」が発見できたか？"],
  },
  {
    id: "research", label: "02 リサーチ・インサイト", shortLabel: "リサーチ", icon: "◉", band: T.green,
    description: "「従来は気づかなかった新しい問い」を発見する。定性・定量の両面から設計する。",
    tasks: [
      { id: "r1", label: "リサーチ設計", desc: "仮説を明確にした上で最適な調査手法を選定する。" },
      { id: "r2", label: "デスクリサーチ", desc: "競合分析・市場規模・先行事例調査。" },
      { id: "r3", label: "ユーザーインタビュー", desc: "「行動・感情・文脈」を深掘りする。" },
      { id: "r4", label: "エスノグラフィ・観察調査", desc: "言語化されていないニーズを発見する。" },
      { id: "r5", label: "インサイトの統合・言語化", desc: "「なるほど！」と思える鋭いインサイトを言語化する。" },
      { id: "r6", label: "ペルソナ・CJM作成", desc: "課題が起きるコンテキストを可視化する。" },
    ],
    checks: ["リサーチが「検証すべき仮説」に紐づいているか？", "インサイトは「新しい発見」か？", "ペルソナが実在感を持って描かれているか？", "言っていることとやっていることの乖離は確認したか？"],
  },
  {
    id: "concept", label: "03 コンセプト創出", shortLabel: "コンセプト", icon: "◆", band: T.orange,
    description: "インサイトから独自性の高い事業アイデアを創出。VDSの「コンセプト」軸で整理する。",
    tasks: [
      { id: "c1", label: "HMW問いの設定", desc: "「どうすれば〇〇できるか？」の問いを設定する。" },
      { id: "c2", label: "アイデア発散", desc: "量を重視した発散。ジャッジなしにアイデアを出す。" },
      { id: "c3", label: "コンセプト収束・言語化", desc: "「誰の・どんな課題を・どんな方法で・なぜ自分たちが解くのか」を一言で表現する。" },
      { id: "c4", label: "VDS骨格作成", desc: "顧客・課題・提供価値・独自性を文章化して整合性を確認する。" },
      { id: "c5", label: "複数案比較", desc: "3案程度を比較評価し、リスクと可能性を整理する。" },
    ],
    checks: ["コンセプトに「なぜうちがやるのか」の必然性があるか？", "インサイトが反映されているか？", "競合との差別化を説明できるか？", "VDSの整合性が取れているか？"],
  },
  {
    id: "business", label: "04 ビジネスモデル設計", shortLabel: "BM設計", icon: "◇", band: T.purple,
    description: "VDSの「戦略」「収益」軸を深掘り。事業仮説をクイックに構築し検証ポイントを特定する。",
    tasks: [
      { id: "b1", label: "バリュープロポジション設計", desc: "「代替手段と比べた優位性」を言語化する。" },
      { id: "b2", label: "ビジネスモデル図解", desc: "収益フローを可視化する。" },
      { id: "b3", label: "競合分析・ポジショニング", desc: "自社のポジションと戦い方を設計する。" },
      { id: "b4", label: "収益計画・財務モデル概算", desc: "ユニットエコノミクスの設計と3年概算を作る。" },
      { id: "b5", label: "スケール戦略", desc: "初期市場→メイン市場へのロードマップを描く。" },
      { id: "b6", label: "GTM戦略", desc: "初期顧客獲得の仮説、チャネル設計を行う。" },
      { id: "b7", label: "リスク・前提条件の洗い出し", desc: "ビジネスモデルが成立するための前提をリストアップする。" },
    ],
    checks: ["VDS3視点の整合性が取れているか？", "収益モデルが持続可能か？", "「自社でなくてはいけない理由」があるか？", "決裁者が「売れる？」に答えられるか？"],
  },
  {
    id: "validation", label: "05 事業仮説検証（PoC）", shortLabel: "PoC", icon: "◐", band: "#2A7A6A",
    description: "「作って確かめる」サイクルを高速回転。仮説の精度を上げながら不確実性を減らす。",
    tasks: [
      { id: "v1", label: "検証仮説の優先順位付け", desc: "最重要仮説から検証する。" },
      { id: "v2", label: "検証手法の設計", desc: "最小コストで最大学習を得る手法を選択する。" },
      { id: "v3", label: "プロトタイプ作成", desc: "ローフィデリティ→ハイフィデリティへ段階的に進める。" },
      { id: "v4", label: "ユーザーテスト・検証実施", desc: "定量・定性の両面でデータを収集する。" },
      { id: "v5", label: "学習の統合とピボット判断", desc: "「継続・修正・ピボット・撤退」の意思決定を行う。" },
      { id: "v6", label: "パイロット・PoC実施", desc: "収益性・継続利用・NPS等を計測する。" },
    ],
    checks: ["「仮説を検証するために作る」になっているか？", "成功基準（KPI）は事前に設定しているか？", "学習が意思決定に反映されているか？", "PoC結果を決裁者に伝えられるか？"],
  },
  {
    id: "decision", label: "06 事業化意思決定・上申", shortLabel: "上申", icon: "◑", band: "#B85C00",
    description: "VDSを「客観的な物差し」として活用し、Go/No-Goの意思決定を加速させる。",
    tasks: [
      { id: "d1", label: "VDSの最終版整備", desc: "事業構想の全要素を1枚に整理する。" },
      { id: "d2", label: "意思決定論点の整理", desc: "Go/No-Goにあたって問うべき問いを5つ以内に絞る。" },
      { id: "d3", label: "ピッチ・上申資料の作成", desc: "「課題→インサイト→解決策→市場→BM→検証結果→Ask」で構成する。" },
      { id: "d4", label: "ステークホルダーへの根回し", desc: "キーパーソンへの事前説明と懸念の回収を行う。" },
      { id: "d5", label: "Go後のロードマップ提示", desc: "必要なリソース・体制・予算・マイルストーンを示す。" },
    ],
    checks: ["「うちがやる意義」が明確に語れるか？", "決裁者の「最大の懸念」に正面から答えているか？", "VDSの整合性が取れているか？", "Go後の実行体制のイメージが共有されているか？"],
  },
  {
    id: "growth", label: "07 事業開発・グロース", shortLabel: "グロース", icon: "◒", band: T.green,
    description: "事業化後も「考える×つくる」を繰り返しながら、プロダクト開発からグロースまでを実行する。",
    tasks: [
      { id: "g1", label: "プロダクト開発体制の構築", desc: "デザイナー・エンジニア・PO・PDのチーム体制を固める。" },
      { id: "g2", label: "UX/UIデザイン", desc: "「使いたくなる・使い続けたくなる」を設計する。" },
      { id: "g3", label: "MVP開発・ローンチ", desc: "最小限の機能でリリースして市場フィードバックを得る。" },
      { id: "g4", label: "グロース指標の設計・計測", desc: "NSM・KPIツリー・データ計測基盤を整備する。" },
      { id: "g5", label: "グロースハック・改善サイクル", desc: "仮説→実験→学習→反映のサイクルを回す。" },
      { id: "g6", label: "スケール・水平展開", desc: "新市場参入・パートナーシップによる成長加速。" },
    ],
    checks: ["NSMが設定されているか？", "継続利用率・NPS等の指標は健全か？", "開発速度と品質のバランスは取れているか？", "グロースの「エンジン」が機能しているか？"],
  },
];

// ============================================================
// TASK HYPOTHESES
// ============================================================
export const TASK_HYPOTHESES: Record<string, string> = {
  "setup-s1": "決裁者・推進者の成功イメージがまだ揃っておらず、初期に成功条件を1文で合意すれば、後続フェーズの判断ブレを大きく減らせる。",
  "setup-s2": "期待されている成果物と検討対象が暗黙知のまま進んでいる可能性があり、スコープと非スコープを分けることで、後半の手戻りを抑えられる。",
  "setup-s3": "新規事業に必要なビジネス・サービス・プロダクトの役割が不足または兼務になっている可能性があり、責任分界を明確にすれば意思決定速度が上がる。",
  "setup-s4": "表向きの推進者以外に実質的な賛否を握る関係者がいる可能性があり、早期に影響関係を可視化すれば承認リスクを下げられる。",
  "setup-s5": "既定の進め方が案件の不確実性に合っていない可能性があり、目的に合わせて探索・検証・上申の比重を設計し直す必要がある。",
  "setup-s6": "品質・コスト・納期の優先順位がチーム内で異なる可能性があり、QCDを合意すれば妥協点と意思決定タイミングを明確にできる。",
  "setup-s7": "報告・相談・決裁の経路が曖昧なままだと判断待ちが発生する可能性があり、定例とエスカレーション設計で推進力を保てる。",

  "future-f1": "既存事業の延長だけで未来を見ている可能性があり、メガトレンドを起点にすると自社が向き合うべき中長期テーマを広げられる。",
  "future-f2": "社会課題・業界課題・自社課題が混在している可能性があり、イシューマップで構造化すると解くべき問いの優先度が見える。",
  "future-f3": "単一の未来像に寄りすぎている可能性があり、複数シナリオを置くことで不確実性に強い事業仮説を作れる。",
  "future-f4": "チーム内に言語化されていない実現したい未来が分散している可能性があり、ビジョンWSで判断基準として使える共通軸にできる。",
  "future-f5": "言葉だけでは価値観や未来像が平板になっている可能性があり、発散手法を使えば潜在的な違和感や願望を引き出せる。",

  "research-r1": "調査目的が情報収集に寄っている可能性があり、検証したい仮説を先に定義すると最小の調査で最大の学習を得られる。",
  "research-r2": "市場・競合・先行事例の前提が古い可能性があり、デスクリサーチで検討領域の機会と制約を更新できる。",
  "research-r3": "顧客の表面的な要望だけを捉えている可能性があり、行動・感情・文脈を深掘りすれば本質的な困りごとを発見できる。",
  "research-r4": "ユーザー自身も言語化できていない課題が残っている可能性があり、観察によって発言と行動のズレを捉えられる。",
  "research-r5": "個別の調査結果が断片のまま残っている可能性があり、統合することでコンセプトにつながる鋭いインサイトを抽出できる。",
  "research-r6": "ターゲット像が属性情報に留まっている可能性があり、ペルソナとCJMで課題が発生する状況を具体化できる。",

  "concept-c1": "解くべき問いが広すぎる、または解決策寄りになっている可能性があり、HMWに変換すると発想の幅と焦点を両立できる。",
  "concept-c2": "初期案が既存事業や競合の模倣に寄っている可能性があり、量を出すことで独自性のある切り口を見つけられる。",
  "concept-c3": "アイデアの魅力が一言で伝わらない可能性があり、顧客・課題・提供価値・自社がやる理由を束ねると判断しやすくなる。",
  "concept-c4": "顧客課題と提供価値、実現方法の整合が弱い可能性があり、VDS骨格で事業としての筋の良さを確認できる。",
  "concept-c5": "単一案に早く収束しすぎている可能性があり、複数案を並べることでリスクと可能性を相対評価できる。",

  "business-b1": "顧客が代替手段から乗り換える理由が弱い可能性があり、バリュープロポジションを明確にすれば選ばれる根拠を強化できる。",
  "business-b2": "誰が誰に何を提供し、どこで収益が発生するかが曖昧な可能性があり、図解によって成立条件を検証できる。",
  "business-b3": "直接競合だけを見て代替手段を見落としている可能性があり、ポジショニングで勝ち筋と避ける戦いを明確にできる。",
  "business-b4": "収益性の見立てが希望的観測になっている可能性があり、ユニットエコノミクスと3年概算で事業化判断の材料を作れる。",
  "business-b5": "初期顧客獲得後の成長パスが描けていない可能性があり、スケール戦略で市場拡張の順序を設計できる。",
  "business-b6": "良いサービスでも初期顧客に届かない可能性があり、GTM仮説でチャネル・訴求・営業導線を具体化できる。",
  "business-b7": "成立前提が暗黙のまま残っている可能性があり、リスクを列挙すれば次に検証すべき論点を絞り込める。",

  "validation-v1": "検証したいことが多すぎて学習効率が落ちる可能性があり、最重要仮説から順に潰すことで意思決定に近づける。",
  "validation-v2": "検証手法が重すぎる、または学習量が少ない可能性があり、仮説ごとに最小コストの検証方法を選べる。",
  "validation-v3": "完成品づくりに寄りすぎている可能性があり、仮説に合わせたプロトタイプに絞ることで早く学習できる。",
  "validation-v4": "定量結果だけ、または定性所感だけに偏る可能性があり、両面で検証すれば判断の確度を上げられる。",
  "validation-v5": "検証結果が次の判断に接続されていない可能性があり、学習を統合すれば継続・修正・撤退を明確に決められる。",
  "validation-v6": "PoCが技術実証で止まっている可能性があり、利用継続・収益性・NPSまで測ることで事業化判断に近づける。",

  "decision-d1": "事業構想の要素が資料ごとに散らばっている可能性があり、VDS最終版にまとめると意思決定者が全体像を把握しやすい。",
  "decision-d2": "論点が多すぎて会議で判断できない可能性があり、Go/No-Goに必要な問いを絞ることで議論の質を上げられる。",
  "decision-d3": "上申資料が説明過多で意思決定に直結していない可能性があり、課題からAskまでの流れを作ると承認を取りやすい。",
  "decision-d4": "公式会議の前に懸念が解消されていない可能性があり、根回しによって反対理由を事前に回収できる。",
  "decision-d5": "Go後の実行イメージが弱く承認しづらい可能性があり、ロードマップを示すことで必要投資と体制を具体化できる。",

  "growth-g1": "事業化後の開発体制が既存組織の片手間になっている可能性があり、専任に近い役割設計で改善速度を確保できる。",
  "growth-g2": "機能要件は満たしていても使い続ける理由が弱い可能性があり、UX/UIを磨くことで継続利用の障壁を下げられる。",
  "growth-g3": "初期リリースの範囲が大きすぎる可能性があり、MVPに絞ることで市場から早く学習できる。",
  "growth-g4": "成長を測る指標が売上や利用者数だけに偏っている可能性があり、NSMとKPIツリーで改善対象を明確にできる。",
  "growth-g5": "改善活動が思いつきで進んでいる可能性があり、仮説検証サイクルにすると再現性のある成長につながる。",
  "growth-g6": "初期市場での成功が個別最適に留まる可能性があり、水平展開とパートナー戦略で成長余地を広げられる。",
};

export function normalizeTaskHypothesis(value: TaskHypothesisValue | undefined): TaskHypothesis {
  if (!value) {
    return {
      currentHypothesis: "このタスクでは、現状の前提に未検証の論点が残っている可能性がある。",
      missingInfo: "案件固有の情報がまだ不足しているため、まずは前提を明文化する必要がある。",
      discussionPoints: "関係者ヒアリングや既存資料確認で、事実・期待・制約を確認する。",
      conclusion: "検証すべき論点と次に集める情報を整理する。",
    };
  }
  if (typeof value === "string") {
    return {
      currentHypothesis: value,
      missingInfo: "タスク完了に必要な情報を、関係者・顧客・市場情報から補う必要がある。",
      discussionPoints: "仮説の妥当性、優先度、意思決定に必要な確認事項を議論する。",
      conclusion: "議論結果をもとに、タスクの成果物と次アクションを確定する。",
    };
  }
  const legacy = value as TaskHypothesis & {
    hypothesis?: string;
    rationale?: string;
    validation?: string;
    output?: string;
  };
  return {
    currentHypothesis: legacy.currentHypothesis || legacy.hypothesis || "現状仮説が未設定です。",
    missingInfo: legacy.missingInfo || legacy.rationale || "不足情報が未設定です。",
    discussionPoints: legacy.discussionPoints || legacy.validation || "議論ポイントが未設定です。",
    conclusion: legacy.conclusion || legacy.output || "結論が未設定です。",
  };
}

export function getTaskHypothesis(phaseId: string, taskId: string, generated: TaskHypothesisMap = {}): TaskHypothesis {
  const key = `${phaseId}-${taskId}`;
  return normalizeTaskHypothesis(generated[key] ?? TASK_HYPOTHESES[key]);
}

// ============================================================
// CONCEPT (VDSブロック1) — リッチ出力スキーマ
// ============================================================
// ターゲット顧客選定の9つの観点。テーブル表示の列定義にも使う。
export const CONCEPT_VIEWPOINTS = [
  { key: "quantitativeAppeal", label: "量的魅力", desc: "人数（社数）で多い/大きいか。今後伸びていくか。" },
  { key: "urgency", label: "課題逼迫性", desc: "課題に対して逼迫感や緊急性を感じているか。" },
  { key: "craving", label: "解決策渇望度", desc: "我々が提供する手法や価値を求め、渇望してくれるか。" },
  { key: "advantageDifficulty", label: "優位性構築難易度", desc: "相対する競合に対して優位性を作り出すことは可能か。" },
  { key: "requirementDifficulty", label: "要求実現難易度", desc: "求められる要求／期待水準を実現でき得るか。" },
  { key: "payment", label: "支払い許容額", desc: "許容される金額は高いか、低いか。" },
  { key: "reachability", label: "到達可能性", desc: "リーチ・接触することはできるか。" },
  { key: "decisionLeadTime", label: "意思決定リードタイム", desc: "導入や契約までに必要な時間はどの程度か。" },
  { key: "marketImpact", label: "市場浸透インパクト", desc: "その顧客の獲得で得られる市場への波及効果などの好影響はあるか。" },
] as const;

export type ConceptViewpointKey = (typeof CONCEPT_VIEWPOINTS)[number]["key"];

export interface ConceptScore {
  score: number; // 1〜5
  comment: string;
}

// 問題の質を左右する4要素
export const PROBLEM_QUALITY_FACTORS = [
  { key: "volume", label: "量" },
  { key: "urgency", label: "逼迫性" },
  { key: "timeliness", label: "時流性" },
  { key: "significance", label: "意義性" },
] as const;
export type ProblemQualityKey = (typeof PROBLEM_QUALITY_FACTORS)[number]["key"];

// 課題の質を左右する4要素
export const ISSUE_QUALITY_FACTORS = [
  { key: "volume", label: "量" },
  { key: "essence", label: "本質度" },
  { key: "solvability", label: "解決可能性" },
  { key: "timeliness", label: "時流性" },
] as const;
export type IssueQualityKey = (typeof ISSUE_QUALITY_FACTORS)[number]["key"];

export interface TargetSegment {
  name: string;
  axis: string; // 発散軸（業界/規模/価値観 等）
  scores: Record<ConceptViewpointKey, ConceptScore>;
}

export interface GrowthStoryPhase {
  phase: string; // 事業フェーズ（基盤構築/スケール/利益回収 等）
  kgi: string;
  focus: string;
  businessModel: string;
  asset: string;
}

// 価値や手法が描けていない場合に発想を広げる10の着眼点。
export const IDEATION_LENSES = [
  { no: 1, label: "良い点を伸ばす", approach: "課題が持つポジティブ面を伸ばす" },
  { no: 2, label: "悪い面をなくす", approach: "課題が持つネガティブ面を消す" },
  { no: 3, label: "反対にできそうな点を探す", approach: "課題のネガティブ面をポジティブに変える" },
  { no: 4, label: "前提を疑う", approach: "課題が持つ前提条件をひっくり返す" },
  { no: 5, label: "形容詞を変える", approach: "課題に関連する性質・状態を変化させる" },
  { no: 6, label: "別のリソースを活用する", approach: "課題に関連する他の使用可能な資源（モノ・人）に着目する" },
  { no: 7, label: "ニーズや文脈から発展させる", approach: "課題に関連する事象から発想をジャンプさせる" },
  { no: 8, label: "課題の主体を変える", approach: "課題の所有者以外を巻き込む" },
  { no: 9, label: "現状を変更する", approach: "現状の課題をそのまま解決する" },
  { no: 10, label: "課題を切り分ける", approach: "課題を複数の話題に切り分けて考える" },
] as const;

// エージェントが着眼点をもとに出す、手法・価値のアイデア案。
export interface MethodValueIdea {
  lens: string; // 着眼点
  hmw: string; // 「どうすれば〜できるか」の問い
  idea: string; // 手法・価値の案
}

export interface ConceptResult {
  oneLineConcept: string; // 「誰」の「課題」を「手法」によって「価値」にする の一文
  customer: string;
  problem: string; // 向き合う「問題」（解決が望まれる状態）
  pain: string; // 据える「課題」（問題の背景要因のうち向き合うもの）
  method: string; // 手法（抽象）：顧客に何を提供するか＝ソリューション群
  methodFunctions: string[]; // 手法の具体＝機能
  value: string; // 価値（抽象）：顧客が何を得るか＝成果や状態
  valueExperiences: string[]; // 価値の具体＝体験
  ideaApproaches: MethodValueIdea[]; // 10着眼点から発想した手法・価値の案
  n1Customer: string; // ミクロの確信：実在する1人
  marketSize: string; // マクロの確証：市場サイズ感
  problemQuality: Record<ProblemQualityKey, ConceptScore>; // 問題の質（量/逼迫性/時流性/意義性）
  issueQuality: Record<IssueQualityKey, ConceptScore>; // 課題の質（量/本質度/解決可能性/時流性）
  structureMethod: string; // 採用した構造化手法（イシューマップ/ロジックツリー/ユーザージャーニーマップ）
  structureReason: string; // その手法を選んだ理由
  targetSegments: TargetSegment[];
  segmentsKeyMessage: string; // 9観点評価のSo what（どのセグメントを優先すべきか・なぜか）
  primaryViewpoints: string[]; // 初期重要観点（優先した9観点）
  growthStory: GrowthStoryPhase[];
}

// ============================================================
// AGENT PROMPTS
// ============================================================
const AGENT_BASE = `あなたはNEWhのシニアビジネスデザイナーです。JSONのみを返してください。前置き・説明・Markdownコードブロック不要。`;

// NEWh流の問いの立て方：各ブロックを生成する前に内省すべき思考プロセス。
// 思考の過程そのものは出力せず、問いを通り抜けた「結論」だけをJSONに書く。
const NEWH_THINKING = `
【思考プロセス｜出力前に必ず内省すること】
各フィールドを書く前に、以下のNEWh流の問いを自分に投げ、その答えだけをJSONに反映する。問いや思考過程は出力に含めない。
共通の問い:
- これは「従来気づかれなかった新しい問い」か、それとも既存課題・競合の焼き直しか？焼き直しなら切り口を変える。
- 記述は具体か（業界・顧客・数字・固有名・状況に紐づくか）、それとも誰にでも当てはまる一般論か？一般論なら捨てて書き直す。
- VDSの3条件「選ばれる／稼げる／続けられる」のどれに効く一手かを説明できるか？
- 入力（クライアント依頼・前ブロック）の事実と矛盾していないか？`;

// ブロックごとに深掘りすべき固有の問い。
const BLOCK_THINKING: Record<string, string> = {
  concept: `
このブロック固有の思考プロセス（コンセプトを書く）:
コンセプトは「誰（顧客）」「課題」「手法」「価値」の4要素で構成される。
言語化のゴールは『「誰」の「課題」を「手法」によって「価値」という状態にする』という一文で表すこと。
そして、1人の顧客を熱狂させ渇望させる「ミクロの確信」と、一定サイズの顧客に求められ広がりが見込める「マクロの確証」を必ず両立させること。

絶対に避けるバッドケース:
- ミクロ熱中型：目の前に渇望する顧客が実在することだけを拠り所にし、サイズ・量の観点が欠ける。意思決定者に「顧客はいるが事業として大きくなるのか」という懸念を生む。
- マクロ依存型：定量・サイズ・ポテンシャルだけを拠り所にし、実在顧客の手触りが欠ける。意思決定者に「机上では市場がありそうだが本当に顧客は実在し、本当に買われるのか」という疑惑を生む。
→ customer / value は、この両方の視座が同居するように書く。

顧客は3階層で捉える:
- 市場（人数ベース）：マクロの確証。顧客群として小さすぎないか・将来性があるか。
- ターゲット顧客（顧客群・ペルソナ）：マクロの確証。
- n1顧客（実在する1人）：ミクロの確信。探索・定義・言語化して手触りを得る対象。

ターゲット顧客選定の9つの観点（各候補を評価する物差し）:
1.量的魅力（人数・社数の大きさ／今後の伸び） 2.課題逼迫性 3.解決策渇望度 4.優位性構築難易度 5.要求実現難易度 6.支払い許容額 7.到達可能性 8.意思決定リードタイム 9.市場浸透インパクト

ターゲット顧客選定の5ステップ（この順で内省してからcustomerを書く）:
1.顧客群の発散（BtoB:業界/業種/企業規模、BtoC:年代/価値観/地域 等の軸で広げる）
2.特性情報の付与（各候補を9観点で評価し、顧客セグメントを整理）
3.成長ストーリー検討（事業フェーズ／フェーズKGI／重点観点／ビジネスモデル／得られるアセット。時間軸で基盤構築→スケール→利益回収など）
4.初期重要観点検討（企業内与件＝3年以内黒字化等の前提、固有特性与件＝業界/競争環境/事業特性 を踏まえ、9観点に優先順位をつける）
5.ターゲットを定義（上記を踏まえて向き合うべき顧客を見定める）

課題（問題と課題）の見出し方:
まず「問題」と「課題」を分けて捉える。問題＝解決が望まれている状態。課題＝その問題の背景に潜む要因のうち、自分たちが向き合うと据えるもの。問題の背景要因を洗い出し関係性を構造化することで課題を見出す。

問題の質を左右する4要素（problemに反映し、problemQualityで評価）:
- 量：多くの人・企業にとって解決が望まれているか
- 逼迫性：お金を払ってでも解決したいか（問題自体の強度）
- 時流性：今・これから向き合うべき適切なタイミングか
- 意義性：自社・自身が向き合うべき問題か

課題の質を左右する4要素（painに反映し、issueQualityで評価）:
- 量：要因として多くの人・企業に共通する課題か
- 本質度：その課題を解くと問題解決につながるか／大きな影響を与えられるか
- 解決可能性：解決可能な課題か
- 時流性：今・これから向き合うべきか（技術浸透で解けるようになった等）

構造化手法は問題の性質で選ぶ（structureMethod/structureReasonに反映）:
- イシューマップ：背景要因をツリーで網羅的に分解。網羅的探索に強いが、因果・順序・関係性は扱いづらい（多様な要因が絡む社会課題とは相性が悪い）。
- ロジックツリー：行動・プロセスの順序に着目。作業/プロセス起点の探索に強いが、複雑な関係性・ループは扱いづらい。
- ユーザージャーニーマップ：要因間の関係性・因果・ループを扱う。複雑性の高い問題に有効だが、網羅性・時間軸は弱い。

あるべき捉え方：n1（顧客）の生の声・行動に触れて確信を得つつ、量・サイズから確証を得る（ミクロ×マクロ）。

課題探索の4ステップ（この順で内省してからproblem/painを書く）:
1.向き合うべき問題を定める（量・逼迫性・時流性・意義性で選ぶ）。問い：どの問題と向き合うべきか
2.問題の背景・要因を構造的に洗い出し、向き合うものを課題として定義する。問い：なぜその問題は起きているのか、何を課題に据えるべきか
3.問題と課題の個別具体性を高め、エピソードの粒度で捕捉して確信を得る。問い：具体的にはどのような問題と課題なのか
4.エピソードから個別具体性を排除し一般性を高め、量と確信を紡ぐ。問い：つまり我々が向き合う問題と課題は何か

手法と価値の描き方:
- 手法＝課題解決および価値を作り上げるためのソリューション群。問い：顧客に何を提供するのか。
- 価値＝手法を通じて顧客が得る成果や状態。問い：顧客は何を得るのか。
- 2層で捉える。抽象＝手法・価値、具体＝機能・体験。手法の具体が機能（methodFunctions）、価値の具体が体験（valueExperiences）。抽象と具体が一貫しているか確認する。

価値や手法が描けていないときは、以下の10の着眼点で「どうすれば〜できるか（HMW）」を立て、案を出す（ideaApproachesに、効きそうな着眼点を2〜4件選んで反映）:
1.良い点を伸ばす（課題のポジティブ面を伸ばす）
2.悪い面をなくす（ネガティブ面を消す）
3.反対にできそうな点を探す（ネガティブ面をポジティブに変える）
4.前提を疑う（前提条件をひっくり返す）
5.形容詞を変える（関連する性質・状態を変化させる）
6.別のリソースを活用する（他の使える資源＝モノ・人に着目）
7.ニーズや文脈から発展させる（関連事象から発想をジャンプ）
8.課題の主体を変える（所有者以外を巻き込む）
9.現状を変更する（現状の課題をそのまま解決）
10.課題を切り分ける（複数の話題に分けて考える）

出力の指針:
- customer：向き合う顧客を一言で簡潔に表す（誰か。20字以内。例「共働き世帯の30代母親」「地方の中堅製造業の現場責任者」）。詳細はn1Customer・marketSize・targetSegmentsに分けて書き、customer自体は短く保つ。
- problem：向き合うと定めた問題。ステップ4で一般化した、量と確信を両立した一文。problemQualityの4要素で評価する。
- pain：problemの背景要因のうち据える課題。本質度（解くと問題解決につながるか）と解決可能性まで踏み込む。issueQualityの4要素で評価する。
- structureMethod/structureReason：課題を見出すのに使った構造化手法と、その問題に合う理由。
- method／methodFunctions：顧客に提供するソリューション（抽象）と、その具体である機能。
- value／valueExperiences：顧客が得る成果・状態（抽象。before→afterで渇望される状態）と、その具体である体験。
- ideaApproaches：10の着眼点から、この課題に効きそうなものを選び、HMWの問いと手法・価値の案をセットで出す。`,
  strategy: `
このブロック固有の問い:
- 市場の規模・特性・成長性を、希望的観測でなくマクロ視点の根拠とともに語れているか？
- 直接競合だけでなく「顧客が今使っている代替手段（自前運用・Excel・何もしない等）」まで競合に含めたか？
- 「なぜ他社ではなく自社がやるべきか」に必然性があるか？単なる強みの列挙で終わっていないか？
- 仕組み（オペレーション・体制・パートナー）はブロック1のコンセプトと整合しているか？`,
  sustainability: `
このブロック固有の問い:
- 蓄積される資産は、競合が時間や資金をかけても容易に真似できない固有のものか？
- 蓄積→強化→還元の因果ループは、机上でなく実際に回るか？どこが一番弱いか？
- 続けるほど強くなる構造になっているか？それともいつか頭打ちになる一過性の優位か？`,
  revenue: `
このブロック固有の問い:
- フロー型かストック型か明確か？誰の・どんな価値に対して課金するのかを言い切れているか？
- ユニットエコノミクスは成立するか？黒字化の前提（顧客数・単価・継続率）は現実的か？
- 主要コストの最大項目は何か？それが事業の足かせ・参入障壁のどちらに働くか？`,
  project: `
このブロック固有の問い:
- ゴールは決裁者が一読で腹落ちする1文か？抽象的なスローガンになっていないか？
- 3条件（選ばれる・稼げる・続けられる）の根拠は、VDS全体と整合しているか？
- 最大のリスクは何で、firstActionsの一手はそのリスクを最も早く潰せるか？
- どのフェーズから始めれば不確実性を最速で減らせるか——startingPhaseの選択に根拠があるか？`,
};

export const AGENTS: Record<string, AgentDef> = {
  concept: {
    label: "ブロック1：コンセプト", icon: "👤", color: T.blue,
    reviewCriteria: "・ミクロの確信（n1の実在顧客が渇望する手触り）とマクロの確証（顧客群・市場サイズ・将来性）が両立しているか\n・ミクロ熱中型／マクロ依存型のどちらにも偏っていないか\n・顧客が3階層（市場／ターゲット顧客群／n1顧客）で捉えられ、9観点の選定根拠が滲むか\n・問題（量/逼迫性/時流性/意義性）と課題（量/本質度/解決可能性/時流性）が分けて捉えられ、課題が問題の背景要因として構造的に導かれているか\n・課題が本質度（解くと問題解決につながる）と解決可能性を満たすか\n・提供価値がbefore→afterで渇望感を持って表現され、手法・体験が価値と整合しているか",
    system: AGENT_BASE + NEWH_THINKING + BLOCK_THINKING.concept + `\nVDSブロック1「コンセプト」を生成。前述の課題探索4ステップ・顧客選定5ステップ・9観点を内省した結果をJSONで返す。JSONのみ：\n{"oneLineConcept":"『誰の課題を手法によって価値という状態にする』を表す一文","customer":"顧客を一言で（誰か。20字以内・簡潔に）","problem":"向き合う問題（量と確信を両立した一文）","pain":"据える課題（本質度・解決可能性まで踏み込む）","method":"手法（抽象：顧客に何を提供するか）","methodFunctions":["機能（手法の具体）"],"value":"価値（抽象：顧客が何を得るか・before→after）","valueExperiences":["体験（価値の具体）"],"ideaApproaches":[{"lens":"着眼点（例：悪い面をなくす）","hmw":"どうすれば〜できるか","idea":"手法・価値の案"}],"n1Customer":"n1の実在顧客像（1人の手触り）","marketSize":"市場サイズ感（マクロの確証）","problemQuality":{"volume":{"score":3,"comment":"一言"},"urgency":{"score":3,"comment":"一言"},"timeliness":{"score":3,"comment":"一言"},"significance":{"score":3,"comment":"一言"}},"issueQuality":{"volume":{"score":3,"comment":"一言"},"essence":{"score":3,"comment":"一言"},"solvability":{"score":3,"comment":"一言"},"timeliness":{"score":3,"comment":"一言"}},"structureMethod":"イシューマップ|ロジックツリー|ユーザージャーニーマップ","structureReason":"その問題に合う理由","targetSegments":[{"name":"セグメント名","axis":"発散軸（業界/規模/価値観等）","scores":{"quantitativeAppeal":{"score":3,"comment":"一言"},"urgency":{"score":3,"comment":"一言"},"craving":{"score":3,"comment":"一言"},"advantageDifficulty":{"score":3,"comment":"一言"},"requirementDifficulty":{"score":3,"comment":"一言"},"payment":{"score":3,"comment":"一言"},"reachability":{"score":3,"comment":"一言"},"decisionLeadTime":{"score":3,"comment":"一言"},"marketImpact":{"score":3,"comment":"一言"}}}],"segmentsKeyMessage":"この9観点評価から言えるSo what（どのセグメントを優先すべきか・なぜかを一言で。40字以内）","primaryViewpoints":["初期に優先する観点とその理由"],"growthStory":[{"phase":"事業フェーズ","kgi":"フェーズKGI","focus":"重点観点","businessModel":"ビジネスモデル","asset":"得られるアセット"}]}\ntargetSegmentsは2〜3件、growthStoryは2〜3フェーズ、methodFunctions/valueExperiencesは2〜4件、ideaApproachesは2〜4件。scoreは1〜5の整数（5が最も強い/望ましい）。commentは20字以内。`,
    build: (brief) => `クライアント依頼：\n${brief}`,
  },
  strategy: {
    label: "ブロック2：戦略と仕組み", icon: "⚔", color: T.orange,
    reviewCriteria: "・市場規模・成長性がマクロ視点で語られているか\n・直接競合＋代替手段まで競合として捉えているか\n・「なぜ他社でなく自社か」を答えているか\n・仕組みがコンセプトと整合しているか",
    system: AGENT_BASE + NEWH_THINKING + BLOCK_THINKING.strategy + `\nVDSブロック2「戦略と仕組み（マクロ視点）」を生成。JSONのみ：\n{"market":"市場（規模・特性・成長性）","competitor":"競合（直接競合＋代替手段）","advantage":"戦略・優位性（なぜ自社か）","mechanism":"仕組み（オペレーション・体制・パートナー）"}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nブロック1:\n${JSON.stringify(prev.concept, null, 2)}`,
  },
  sustainability: {
    label: "ブロック3：持続戦略", icon: "∞", color: T.green,
    reviewCriteria: "・強みとなる資産が競合が真似できない固有のものか\n・蓄積されるものが実際に積み上がるものか\n・強化ループの因果が明確か\n・続けるほど強くなる構造になっているか",
    system: AGENT_BASE + NEWH_THINKING + BLOCK_THINKING.sustainability + `\nVDSブロック3「持続戦略」を生成。JSONのみ：\n{"assets":"強みとなる資産（競合が真似できない固有資産）","accumulation":"蓄積されるもの（データ・関係性・ノウハウ）","loop":"強化ループ（蓄積→強化→還元の因果）"}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nブロック1:\n${JSON.stringify(prev.concept)}\nブロック2:\n${JSON.stringify(prev.strategy)}`,
  },
  revenue: {
    label: "ブロック4：収支モデル", icon: "¥", color: T.purple,
    reviewCriteria: "・フロー型かストック型か明記されているか\n・誰から何に対して課金するかが明確か\n・主要コスト項目が具体的か\n・黒字化の時期・UEの仮説があるか",
    system: AGENT_BASE + NEWH_THINKING + BLOCK_THINKING.revenue + `\nVDSブロック4「収支モデル」を生成。JSONのみ：\n{"revenueStructure":"収益構造（フロー/ストック・課金設計）","costStructure":"コスト（固定費・変動費の主要項目）","balanceOutlook":"収支見立て（黒字化・UE仮説）"}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nブロック1:\n${JSON.stringify(prev.concept)}\nブロック2:\n${JSON.stringify(prev.strategy)}\nブロック3:\n${JSON.stringify(prev.sustainability)}`,
  },
  project: {
    label: "プロジェクト設計", icon: "◈", color: T.red,
    reviewCriteria: "・ゴールが決裁者が腹落ちできる1文か\n・スコープが明確で認識齟齬を防げるか\n・チーム構成がVDSを実現するのに適切か\n・3条件（選ばれる・稼げる・続けられる）の根拠がVDS全体と整合しているか",
    system: AGENT_BASE + NEWH_THINKING + BLOCK_THINKING.project + `\nNEWhのプロジェクトデザイン案を生成。startingPhaseはsetup/future/research/concept/business/validation/decision/growthのいずれか。JSONのみ：\n{"projectName":"名前（20字以内）","summary":"概要（2〜3文）","goal":"ゴール（1文）","startingPhase":"ID","startingPhaseReason":"理由（1〜2文）","scope":["項目"],"outOfScope":["項目"],"team":[{"role":"","count":1,"responsibility":""}],"stakeholders":[{"type":"決裁者|推進者|協力者|注意人物","name":"","action":""}],"phaseRoadmap":[{"phaseId":"","duration":"","keyOutput":"","priority":"high|medium|low"}],"keyRisks":[{"risk":"","mitigation":""}],"firstActions":[""],"threeConditions":{"selected":"","profitable":"","sustainable":""}}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nVDS全体：\n${JSON.stringify(prev, null, 2)}`,
  },
};

// ============================================================
// CONCEPT ELEMENTS — 要素単位（顧客→課題→手法→価値）の対話生成
// ============================================================
export type ConceptElementKey = "customer" | "issue" | "method" | "value";

export interface ConceptElementDef {
  key: ConceptElementKey;
  label: string;
  hint: string; // この要素で答える問い
  fields: (keyof ConceptResult)[]; // この要素が担うConceptResultのフィールド
  system: string;
  maxTokens: number;
}

// 要素別の指示＋出力スキーマを、コンセプトの思考プロセス全体に重ねる。
const conceptElementSystem = (instruction: string, schema: string) =>
  AGENT_BASE + NEWH_THINKING + BLOCK_THINKING.concept +
  `\n\n【今回のステップ】${instruction}\n確定済みの他要素は尊重し整合させる。ユーザーの意見・修正指示があれば最優先で反映する。以下のフィールドのみをJSONで返す：\n${schema}`;

export const CONCEPT_ELEMENTS: ConceptElementDef[] = [
  {
    key: "customer", label: "顧客", hint: "誰に向き合うか",
    fields: ["customer", "n1Customer", "marketSize", "targetSegments", "segmentsKeyMessage", "primaryViewpoints", "growthStory"],
    maxTokens: 4500,
    system: conceptElementSystem(
      "『誰（顧客）』だけを検討する。顧客3階層（市場/ターゲット顧客群/n1）、選定9観点、選定5ステップ、成長ストーリーを反映し、ミクロの確信とマクロの確証を両立させる。",
      `{"customer":"顧客を一言で（誰か。20字以内・簡潔に）","n1Customer":"n1の実在顧客像（1人の手触り）","marketSize":"市場サイズ感（マクロの確証）","targetSegments":[{"name":"セグメント名","axis":"発散軸（業界/規模/価値観等）","scores":{"quantitativeAppeal":{"score":3,"comment":"一言"},"urgency":{"score":3,"comment":"一言"},"craving":{"score":3,"comment":"一言"},"advantageDifficulty":{"score":3,"comment":"一言"},"requirementDifficulty":{"score":3,"comment":"一言"},"payment":{"score":3,"comment":"一言"},"reachability":{"score":3,"comment":"一言"},"decisionLeadTime":{"score":3,"comment":"一言"},"marketImpact":{"score":3,"comment":"一言"}}}],"segmentsKeyMessage":"この9観点評価から言えるSo what（どのセグメントを優先すべきか・なぜかを一言で。40字以内）","primaryViewpoints":["初期に優先する観点とその理由"],"growthStory":[{"phase":"事業フェーズ","kgi":"フェーズKGI","focus":"重点観点","businessModel":"ビジネスモデル","asset":"得られるアセット"}]}\ntargetSegmentsは2〜3件、growthStoryは2〜3フェーズ、scoreは1〜5の整数、commentは20字以内。`
    ),
  },
  {
    key: "issue", label: "課題", hint: "なぜ起きるのか・何を課題に据えるか",
    fields: ["problem", "pain", "problemQuality", "issueQuality", "structureMethod", "structureReason"],
    maxTokens: 2500,
    system: conceptElementSystem(
      "確定した顧客に対する『問題と課題』だけを検討する。問題と課題を分け、問題の質4要素・課題の質4要素で評価し、適切な構造化手法で課題を導く。課題探索4ステップを踏む。",
      `{"problem":"向き合う問題（量と確信を両立した一文）","pain":"据える課題（本質度・解決可能性まで踏み込む）","problemQuality":{"volume":{"score":3,"comment":"一言"},"urgency":{"score":3,"comment":"一言"},"timeliness":{"score":3,"comment":"一言"},"significance":{"score":3,"comment":"一言"}},"issueQuality":{"volume":{"score":3,"comment":"一言"},"essence":{"score":3,"comment":"一言"},"solvability":{"score":3,"comment":"一言"},"timeliness":{"score":3,"comment":"一言"}},"structureMethod":"イシューマップ|ロジックツリー|ユーザージャーニーマップ","structureReason":"その問題に合う理由"}\nscoreは1〜5の整数、commentは20字以内。`
    ),
  },
  {
    key: "method", label: "手法", hint: "顧客に何を提供するか",
    fields: ["method", "methodFunctions", "ideaApproaches"],
    maxTokens: 2500,
    system: conceptElementSystem(
      "確定した顧客・課題を解く『手法』だけを検討する。手法（抽象）と機能（具体）を分け、10の着眼点でHMWを立てて手法・価値の案（ideaApproaches）を出す。",
      `{"method":"手法（抽象：顧客に何を提供するか）","methodFunctions":["機能（手法の具体）"],"ideaApproaches":[{"lens":"着眼点（例：悪い面をなくす）","hmw":"どうすれば〜できるか","idea":"手法・価値の案"}]}\nmethodFunctionsは2〜4件、ideaApproachesは2〜4件。`
    ),
  },
  {
    key: "value", label: "価値", hint: "顧客は何を得るか",
    fields: ["value", "valueExperiences", "oneLineConcept"],
    maxTokens: 2000,
    system: conceptElementSystem(
      "確定した顧客・課題・手法から、顧客が得る『価値』だけを検討する。価値（抽象）と体験（具体）を分け、before→afterで渇望される状態を描く。最後にコンセプト全体を『誰の課題を手法によって価値という状態にする』の一文（oneLineConcept）に凝縮する。",
      `{"value":"価値（抽象：顧客が何を得るか・before→after）","valueExperiences":["体験（価値の具体）"],"oneLineConcept":"『誰の課題を手法によって価値という状態にする』を表す一文"}\nvalueExperiencesは2〜4件。`
    ),
  },
];

export const REVIEW_SYSTEM = `あなたはNEWhのプリンシパルビジネスデザイナーです。後輩が生成した事業構想の各ブロックをNEWhの基準で厳しくレビューしてください。
表面的・抽象的・ありきたりな記述は容赦なく低評価にする。「具体性」「整合性」「NEWhらしい深さ」の3軸で評価する。
JSONのみ返す：{"score":0〜100,"grade":"S|A|B|C|D","goodPoint":"良い点（1文）","issues":["問題点1","問題点2"],"mustFix":"最重要改善指示","passOrRetry":"pass|retry"}
判定：score60以上→pass、59以下→retry`;

export const SYSTEM_PROMPT = `あなたはNEWh（ニュー）のノウハウを深く理解した新規事業創出支援エージェントです。
NEWhは大企業の新規事業・サービス開発に特化したイノベーションデザイン＆スタジオです。
VDS（バリューデザイン・シンタックス）の目的は「選ばれる」「稼げる」「続けられる」の3条件を事業構想に組み込むこと。
回答は日本語で、簡潔かつ実践的に。`;
