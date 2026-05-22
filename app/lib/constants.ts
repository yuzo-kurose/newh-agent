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
  hypothesis: string;
  rationale: string;
  validation: string;
  output: string;
}

export type TaskHypothesisValue = string | TaskHypothesis;
export type TaskHypothesisMap = Record<string, TaskHypothesisValue>;

export interface TaskSlide {
  title: string;
  subtitle: string;
  keyMessage: string;
  designId: string;
  designName: string;
  designRationale: string;
  sections: { heading: string; bullets: string[] }[];
  speakerNote: string;
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
    name: "IBM Carbon Enterprise",
    bestFor: "大企業、製造、金融、BtoB、技術信頼性、上申資料",
    designMd: "White and light-gray enterprise canvas, charcoal type, one confident IBM blue accent, square geometry, thin borders, no shadows, data and logic first.",
    colors: { canvas: "#FFFFFF", surface: "#F4F4F4", ink: "#161616", muted: "#525252", accent: "#0F62FE" },
  },
  {
    id: "apple-premium",
    name: "Apple Premium Minimal",
    bestFor: "消費者向け、体験価値、プレミアム商材、プロダクト構想",
    designMd: "Large white space, cinematic product-like composition, restrained monochrome, soft gray surfaces, precise typography, emotional but quiet.",
    colors: { canvas: "#FBFBFD", surface: "#F5F5F7", ink: "#1D1D1F", muted: "#6E6E73", accent: "#0071E3" },
  },
  {
    id: "stripe-growth",
    name: "Stripe Growth Gradient",
    bestFor: "Fintech、SaaS、成長戦略、決済、プラットフォーム事業",
    designMd: "Clean SaaS precision with elegant purple-blue accents, subtle gradients, crisp cards, metrics-forward layout, sophisticated growth narrative.",
    colors: { canvas: "#FFFFFF", surface: "#F6F9FC", ink: "#0A2540", muted: "#425466", accent: "#635BFF" },
  },
  {
    id: "notion-warm",
    name: "Notion Warm Workspace",
    bestFor: "共創、ワークショップ、組織変革、ナレッジ、教育",
    designMd: "Warm minimal workspace, paper-like surfaces, calm typography, gentle borders, note-taking structure, human and collaborative.",
    colors: { canvas: "#FBFAF8", surface: "#F1EFEC", ink: "#2F3437", muted: "#787774", accent: "#A65F2B" },
  },
  {
    id: "linear-precision",
    name: "Linear Precision Dark",
    bestFor: "開発組織、プロダクトマネジメント、実行計画、ロードマップ",
    designMd: "Ultra-minimal dark precision, compact information density, violet accent, crisp hierarchy, roadmap and execution oriented.",
    colors: { canvas: "#0D0E12", surface: "#17181F", ink: "#F7F8F8", muted: "#A1A1AA", accent: "#8B5CF6" },
  },
  {
    id: "miro-workshop",
    name: "Miro Workshop Canvas",
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
      hypothesis: "このタスクでは、現状の前提に未検証の論点が残っている可能性がある。",
      rationale: "案件固有の情報がまだ不足しているため、まずは前提を明文化する必要がある。",
      validation: "関係者ヒアリングや既存資料確認で、事実・期待・制約を確認する。",
      output: "検証すべき論点と次に集める情報のリスト",
    };
  }
  if (typeof value === "string") {
    return {
      hypothesis: value,
      rationale: "入力情報とNEWhの標準プロセスから導いた初期仮説。",
      validation: "この仮説が成り立つか、関係者・顧客・市場情報で確認する。",
      output: "更新された仮説と次アクション",
    };
  }
  return {
    hypothesis: value.hypothesis || "仮説が未設定です。",
    rationale: value.rationale || "根拠が未設定です。",
    validation: value.validation || "確認ポイントが未設定です。",
    output: value.output || "成果物が未設定です。",
  };
}

export function getTaskHypothesis(phaseId: string, taskId: string, generated: TaskHypothesisMap = {}): TaskHypothesis {
  const key = `${phaseId}-${taskId}`;
  return normalizeTaskHypothesis(generated[key] ?? TASK_HYPOTHESES[key]);
}

// ============================================================
// AGENT PROMPTS
// ============================================================
const AGENT_BASE = `あなたはNEWhのシニアビジネスデザイナーです。JSONのみを返してください。前置き・説明・Markdownコードブロック不要。`;

export const AGENTS: Record<string, AgentDef> = {
  concept: {
    label: "ブロック1：コンセプト", icon: "👤", color: T.blue,
    reviewCriteria: "・顧客セグメントが具体的か（業種・規模・役職等）\n・困りごとが構造的に深掘りされているか\n・提供価値がbefore→afterで渇望感を持って表現されているか\n・手法・体験が価値と整合しているか",
    system: AGENT_BASE + `\nVDSブロック1「コンセプト（ミクロ視点）」を生成。JSONのみ：\n{"customer":"顧客（具体的セグメント）","pain":"困りごと（構造的に深掘り）","value":"提供価値（before→after）","method":"手法・体験"}`,
    build: (brief) => `クライアント依頼：\n${brief}`,
  },
  strategy: {
    label: "ブロック2：戦略と仕組み", icon: "⚔", color: T.orange,
    reviewCriteria: "・市場規模・成長性がマクロ視点で語られているか\n・直接競合＋代替手段まで競合として捉えているか\n・「なぜ他社でなく自社か」を答えているか\n・仕組みがコンセプトと整合しているか",
    system: AGENT_BASE + `\nVDSブロック2「戦略と仕組み（マクロ視点）」を生成。JSONのみ：\n{"market":"市場（規模・特性・成長性）","competitor":"競合（直接競合＋代替手段）","advantage":"戦略・優位性（なぜ自社か）","mechanism":"仕組み（オペレーション・体制・パートナー）"}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nブロック1:\n${JSON.stringify(prev.concept, null, 2)}`,
  },
  sustainability: {
    label: "ブロック3：持続戦略", icon: "∞", color: T.green,
    reviewCriteria: "・強みとなる資産が競合が真似できない固有のものか\n・蓄積されるものが実際に積み上がるものか\n・強化ループの因果が明確か\n・続けるほど強くなる構造になっているか",
    system: AGENT_BASE + `\nVDSブロック3「持続戦略」を生成。JSONのみ：\n{"assets":"強みとなる資産（競合が真似できない固有資産）","accumulation":"蓄積されるもの（データ・関係性・ノウハウ）","loop":"強化ループ（蓄積→強化→還元の因果）"}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nブロック1:\n${JSON.stringify(prev.concept)}\nブロック2:\n${JSON.stringify(prev.strategy)}`,
  },
  revenue: {
    label: "ブロック4：収支モデル", icon: "¥", color: T.purple,
    reviewCriteria: "・フロー型かストック型か明記されているか\n・誰から何に対して課金するかが明確か\n・主要コスト項目が具体的か\n・黒字化の時期・UEの仮説があるか",
    system: AGENT_BASE + `\nVDSブロック4「収支モデル」を生成。JSONのみ：\n{"revenueStructure":"収益構造（フロー/ストック・課金設計）","costStructure":"コスト（固定費・変動費の主要項目）","balanceOutlook":"収支見立て（黒字化・UE仮説）"}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nブロック1:\n${JSON.stringify(prev.concept)}\nブロック2:\n${JSON.stringify(prev.strategy)}\nブロック3:\n${JSON.stringify(prev.sustainability)}`,
  },
  project: {
    label: "プロジェクト設計", icon: "◈", color: T.red,
    reviewCriteria: "・ゴールが決裁者が腹落ちできる1文か\n・スコープが明確で認識齟齬を防げるか\n・チーム構成がVDSを実現するのに適切か\n・3条件（選ばれる・稼げる・続けられる）の根拠がVDS全体と整合しているか",
    system: AGENT_BASE + `\nNEWhのプロジェクトデザイン案を生成。startingPhaseはsetup/future/research/concept/business/validation/decision/growthのいずれか。JSONのみ：\n{"projectName":"名前（20字以内）","summary":"概要（2〜3文）","goal":"ゴール（1文）","startingPhase":"ID","startingPhaseReason":"理由（1〜2文）","scope":["項目"],"outOfScope":["項目"],"team":[{"role":"","count":1,"responsibility":""}],"stakeholders":[{"type":"決裁者|推進者|協力者|注意人物","name":"","action":""}],"phaseRoadmap":[{"phaseId":"","duration":"","keyOutput":"","priority":"high|medium|low"}],"keyRisks":[{"risk":"","mitigation":""}],"firstActions":[""],"threeConditions":{"selected":"","profitable":"","sustainable":""}}`,
    build: (brief, prev) => `クライアント依頼：\n${brief}\n\nVDS全体：\n${JSON.stringify(prev, null, 2)}`,
  },
};

export const REVIEW_SYSTEM = `あなたはNEWhのプリンシパルビジネスデザイナーです。後輩が生成した事業構想の各ブロックをNEWhの基準で厳しくレビューしてください。
表面的・抽象的・ありきたりな記述は容赦なく低評価にする。「具体性」「整合性」「NEWhらしい深さ」の3軸で評価する。
JSONのみ返す：{"score":0〜100,"grade":"S|A|B|C|D","goodPoint":"良い点（1文）","issues":["問題点1","問題点2"],"mustFix":"最重要改善指示","passOrRetry":"pass|retry"}
判定：score60以上→pass、59以下→retry`;

export const SYSTEM_PROMPT = `あなたはNEWh（ニュー）のノウハウを深く理解した新規事業創出支援エージェントです。
NEWhは大企業の新規事業・サービス開発に特化したイノベーションデザイン＆スタジオです。
VDS（バリューデザイン・シンタックス）の目的は「選ばれる」「稼げる」「続けられる」の3条件を事業構想に組み込むこと。
回答は日本語で、簡潔かつ実践的に。`;
