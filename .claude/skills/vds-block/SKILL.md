---
name: vds-block
description: newh-agent で VDS方法論（書籍由来の考え方）を生成ブロックに組み込む。「VDSに〜の考え方を組み込む」「戦略/持続/収支ブロックを深掘り」「この方法論をエージェントに反映」「コンセプトに〜の観点を追加」などのときに使う。思考プロセス＋出力スキーマ＋レビュー基準＋表示UIの4点セットで一貫改修する手順を案内する。
---

# VDSブロックへの方法論組み込み

newh-agent（NEWh 新規事業創出支援エージェント）では、書籍由来のVDS方法論を各生成ブロックに組み込んでいる。ユーザーが方法論テキスト（フレーム・観点・ステップ）を渡してきたら、このスキルの**4点セット**で一貫して改修する。

対象ブロック：`concept`（コンセプト）/ `strategy`（戦略と仕組み）/ `sustainability`（持続戦略）/ `revenue`（収支）/ `project`（PJ設計）。

## まず確認すること

1. **どのブロックの話か**（顧客・課題・手法・価値 → concept、競合・競争優位 → strategy、蓄積・継続 → sustainability、課金・採算 → revenue）。
2. **組み込みの深さ**：
   - **構造化出力＋UI**（推奨）… 観点をスコア表・カード・テーブルで見せる。type/schema/表示を追加。
   - **プロンプトのみ**（軽量）… 思考プロセスとレビュー基準だけ拡充。出力スキーマ・UIは現状維持。
   迷ったら `AskUserQuestion` で1問だけ聞く。

## 4点セット（構造化出力＋UIの場合）

すべて起点は [app/lib/constants.ts](../../../app/lib/constants.ts) と [app/components/](../../../app/components/)。

### ① 型・定数（constants.ts）
- 観点リストは `as const` 配列で定数化し、`label`/`desc` を持たせる（例：`CONCEPT_VIEWPOINTS`, `COMPETITOR_TIERS`, `JUDGEMENT_AXES`, `APPEAL_AXES`）。`key` から派生型を作る（`(typeof X)[number]["key"]`）。
- ブロックの出力型（`ConceptResult` / `StrategyResult` 等）に新フィールドを追加。スコアは `ConceptScore { score:number; comment:string }` を再利用。
- 配置はブロックごとのコメント区切り（`// === CONCEPT ===` / `// === STRATEGY ===`）の中。

### ② 思考プロセス（constants.ts の `BLOCK_THINKING[blockId]`）
- 「出力前に内省する問い」として方法論の手順を書く。思考過程は出力させず**結論だけ**をJSONに書かせる方針（`NEWH_THINKING` の規約に従う）。
- ステップ手法（例：選定5ステップ、課題探索4ステップ、競合4階層→競争軸特定）を順序立てて明記する。

### ③ 出力スキーマ＋レビュー基準（constants.ts の `AGENTS[blockId]`）
- `AGENTS[blockId].system` 末尾のJSONスキーマ例に新フィールドを追記。件数の指示（「2〜4件」「5〜8本」等）と値域（「scoreは1〜5の整数」）も書く。
- `AGENTS[blockId].reviewCriteria` に評価観点を追加（`REVIEW_SYSTEM` が60点未満でリトライ）。
- 出力が増えたら [app/lib/generate.ts](../../../app/lib/generate.ts) の `MAX_TOKENS[blockId]` を増やす。

### ④ 表示UI
- **コンセプト**：要素別ビューは [app/components/conceptParts.tsx](../../../app/components/conceptParts.tsx)（`CustomerView`/`IssueView`/`MethodView`/`ValueView`）。対話スタジオは `ConceptStudio.tsx`。
- **後続ブロック**：[app/components/VdsTab.tsx](../../../app/components/VdsTab.tsx)。フラットなフィールドは `BLOCK_FIELD_LABELS[blockId]` に key→ラベルを足すと自動表示。構造化部分（表・カード）は専用コンポーネントを作り、ブロック詳細の `!busy && res` ブロック内で `id === "<blockId>"` 条件でレンダリング（`StrategyExtras` が参考実装）。
- **正本図**：[app/components/VdsCanvas.tsx](../../../app/components/VdsCanvas.tsx) は書籍のVDS正本図。固定スロット構成なので、ここは安易に増やさない（フラットなcanvas対応フィールドのみ反映）。
- スタイルは既存の `T`（デザイントークン）と `conceptParts` の `Field`/`scoreColor`/`QualityFactors` に合わせる。So whatは色付きの左ボーダーボックスで強調するのが慣例。

## 仕上げ

- `npx tsc --noEmit` でエラー0、`npx eslint <変更ファイル>` で新規警告0を確認（`conceptReady` 未使用は既存の警告なので無視可）。
- 変更内容を**日本語で**ファイルリンク付きで報告する。
- ファイル削除が必要なら**事前に影響を説明して許可を取る**（CLAUDE.md / [[user-profile]] のルール）。

## 参考：実装済みの組み込み例

| ブロック | 組み込んだ方法論 | 主な定数 |
|----------|------------------|----------|
| concept | ミクロ×マクロ／顧客3階層／選定9観点・5ステップ／問題と課題の質4要素／構造化手法／10着眼点／成長ストーリー | `CONCEPT_VIEWPOINTS` `PROBLEM_QUALITY_FACTORS` `ISSUE_QUALITY_FACTORS` `IDEATION_LENSES` |
| strategy | 競合4階層（時間/目的/問題/完全）／競争軸（判断軸×訴求軸、競争軸＝独自×決定・優劣×決定・優劣×要件）／優位性ツリー（競争軸→フック→肝→源泉、顧客起点×アセット起点）／ロック＝選ばれ続ける理由（顧客ロック・競合ロックの5パターン、蓄積→強化→ロックの3つの問い）／持続サイクル図（好循環の因果ループ） | `COMPETITOR_TIERS` `JUDGEMENT_AXES` `APPEAL_AXES` `ADVANTAGE_TREE_LEVELS` `LOCK_APPROACHES` `LOCK_PATTERNS` |
| revenue | 売上＝単価×客数×時間／コスト4分類（価値提供/規模実現/維持運営/立上げ強化＋会計費目・増え方）／収益性4階層（バリュー/ユニット/ビジネス/インベスト＋関係性図10-15）／事業成立の急所（ヘビーコスト→増え方→回収軸、コスト構造4パターン）／収益モデル（回収エンジン3種＝提供価値/隣接課題/アセット、料金モデル4要素＝誰が・何に・どのように・いくらで、6観点の整合〈意思決定/課題特性/競争戦略/コスト構造/価値特性/事業目標〉、設計思想）。表示は VdsTab の RevenueView（左メニュー：収益基本構造/収益モデル/収益性構造/事業成立の急所/サマリ） | `COST_CATEGORIES` `ECONOMICS_LAYERS` `COST_PATTERNS` `RECOVERY_ENGINES` `PRICING_ELEMENTS` `PRICING_FIT_POINTS` |

> 注：旧「ブロック3：持続戦略」は strategy ブロックに統合済み（DOWNSTREAMから除外、accumulated/strengthened/locks/sustainCycle が strategy に内包）。旧 sustainability の保存データは VdsTab の `migrateSustainability` で非破壊的に strategy へ引き継ぐ。VdsCanvas の「持続戦略」列は strategy データから描画。
