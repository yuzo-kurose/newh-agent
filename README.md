# NEWh 新規事業創出支援エージェント

NEWhのプロジェクトデザイン・VDSノウハウをもとに、新規事業創出をリードするエージェント。

## セットアップ

### 1. リポジトリをクローン
```bash
git clone <your-repo-url>
cd newh-agent
npm install
```

### 2. 環境変数の設定（ローカル）
```bash
cp .env.local.example .env.local
```
`.env.local` を開き、`ANTHROPIC_API_KEY` に実際のキーを入力：
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 3. 開発サーバー起動
```bash
npm run dev
```
http://localhost:3000 で動作確認。

---

## Vercelへのデプロイ

### 方法A：Vercel CLI（推奨）
```bash
npm install -g vercel
vercel login
vercel
```
初回デプロイ時に対話形式で設定。以降は `vercel --prod` で本番デプロイ。

### 方法B：GitHub連携
1. GitHubにリポジトリをpush
2. https://vercel.com/new を開く
3. リポジトリを選択してImport
4. 「Environment Variables」に以下を追加：
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...`
5. Deployをクリック

### 環境変数の更新（Vercelダッシュボード）
- Vercelダッシュボード → プロジェクト → Settings → Environment Variables
- `ANTHROPIC_API_KEY` を追加・更新
- 「Redeploy」を実行して反映

---

## APIキーの管理方針

| 環境 | 保管場所 | 方法 |
|------|----------|------|
| ローカル開発 | `.env.local` | Gitには含まれない（.gitignore済） |
| 本番（Vercel） | Vercel Environment Variables | 暗号化して保管、コードには含まれない |

**APIキーは絶対にコードや会話に貼り付けないこと。**

---

## プロジェクト構造

```
app/
├── api/agent/route.ts   # サーバーサイドAPI（Anthropic SDK使用）
├── components/
│   ├── Sidebar.tsx
│   ├── PhaseHeader.tsx
│   ├── TasksTab.tsx
│   ├── ChecksTab.tsx
│   ├── ChatTab.tsx
│   └── GeneratorModal.tsx
├── lib/constants.ts     # フェーズデータ・プロンプト・型定義
└── page.tsx
```
