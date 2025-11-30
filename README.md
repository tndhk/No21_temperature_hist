# 気温履歴可視化ツール

## プロジェクト概要
このプロジェクトは、指定された地域の過去の気温データを取得し、年ごとの気温推移を比較可能なグラフとして表示するWebアプリケーションです。Next.js, React, TypeScript を使用して構築されています。

## 技術スタック
- フロントエンド: Next.js, React, TypeScript
- UI: Shadcn/ui, Tailwind CSS, Radix UI, Lucide React
- 認証: Clerk (現時点では未使用)
- データベース: Prisma (ORM), Local SQLite (開発), Supabase (本番)
- フォーム処理: Server Actions, Zod
- ユーティリティ: date-fns
- 開発ツール: Docker, ESLint, Autoprefixer, PostCSS
- デプロイ: Vercel

## セットアップ

### 1. リポジトリのクローン
```bash
git clone [リポジトリのURL]
cd [プロジェクトディレクトリ]
```

### 2. 依存関係のインストール
プロジェクトルートで以下のコマンドを実行します。
```bash
npm install
# または yarn install
```

### 3. 環境変数の設定
プロジェクトルートに `.env` ファイルを作成し、`.env.example` を参考に必要な環境変数を設定してください。

```env
# .env.example の内容をコピーし、実際の値を設定してください
# データベースURL (開発用 SQLite の場合):
DATABASE_URL="file:./dev.db"

# Supabase 接続情報 (本番用、またはローカル開発で Supabase を使う場合):
# DATABASE_URL="postgresql://user:password@host:port/database"
# NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

### 4. データベースのセットアップ

#### ローカル開発環境（SQLite）
Prisma を使用してデータベーススキーマを適用します。

```bash
npx prisma migrate dev --name init
```
これにより、SQLite データベースファイル (`./dev.db`) が作成され、スキーマが適用されます。

#### Supabase（本番環境）
Supabaseを使用する場合は、`SUPABASE_MIGRATION.md`を参照してマイグレーションを実行してください。

## データの準備

アプリケーションで表示する気温データは、CSVファイルからデータベースにインポートする必要があります。以下の手順でデータを準備します。

### 1. 気温CSVファイルの生成
`src/data/generate_temperature_csv.py` スクリプトを使用して、指定した地域の気温データを取得し、CSVファイルを生成します。

必要なPythonライブラリをインストールします。
```bash
pip install requests pandas beautifulsoup4
```

スクリプトを実行します。
```bash
python src/data/generate_temperature_csv.py
```
成功すると、`src/data/temperature_data.csv` が生成されます。

スクリプトの詳細は、ファイル内のコメントを参照してください（例: データ取得期間や地域コードの指定方法）。

### 2. データをデータベースにインポート
開発環境の SQLite (`./dev.db`) または Supabase データベースにデータをインポートします。

**Supabase へのインポート:**
Supabase UI の「Table Editor」から、`TemperatureHistory` テーブルを選択し、**「Insert」->「Import data from CSV」** オプションを使用して `src/data/temperature_data.csv` ファイルをアップロードしてください。カラムのマッピングを確認し、インポートを実行します。

**ローカル SQLite へのインポート:**
Prisma には標準のインポートツールがありません。SQLite クライアントツールを使用するか、別途インポートスクリプトを作成する必要があります。
（例: `sqlite3 dev.db ".mode csv" ".import src/data/temperature_data.csv TemperatureHistory"` コマンド。ただし、CSVヘッダーとテーブルカラム名の厳密な一致、データ型の互換性が必要です。）

## ローカルでの実行

依存関係のインストール、環境変数の設定、データベースのセットアップ、およびデータインポートが完了したら、以下のコマンドで開発サーバーを起動します。

```bash
npm run dev
# または yarn dev
```

ブラウザで `http://localhost:3000` を開き、アプリケーションを確認してください。

## Vercel へのデプロイ

Vercel は Next.js アプリケーションのデプロイに最適化されています。

1.  Vercel アカウントにログインし、新しいプロジェクトをインポートします。
2.  GitHub, GitLab, または Bitbucket から本リポジトリを選択します。
3.  プロジェクト設定で、フレームワークプリセットが「Next.js」になっていることを確認します。
4.  **環境変数の設定:** Vercel プロジェクト設定の「Environment Variables」セクションで、`.env` ファイルに設定した以下の環境変数を追加します。
    -   `DATABASE_URL` (Supabase の接続文字列)
    -   `NEXT_PUBLIC_SUPABASE_URL` (もしクライアントサイドで Supabase を利用する場合)
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (もしクライアントサイドで Supabase を利用する場合)

5.  デプロイを実行します。
Vercel はリポジトリのコミットごとに自動的にデプロイを実行するよう設定できます。

## Docker (開発環境)
開発環境向けの Dockerfile と docker-compose.yml が含まれています。Docker を使用して環境を構築・実行することも可能です。

```bash
docker-compose build
docker-compose up
```

詳細は Dockerfile および docker-compose.yml を参照してください。

## 最新の変更

### v2.0.0 - 7日間移動平均の追加（2024年11月）

全ての気温データ（平均、最高、最低）に7日間移動平均を適用し、より見やすいグラフを実現しました。

#### 変更内容
- **データベーススキーマ更新**: `tempHigh7`と`tempLow7`フィールドを追加
- **計算ロジック改善**: 最高・最低気温の7日間移動平均を計算
- **UI更新**: 全てのグラフで7日間移動平均を表示
  - Avg Temp (7-day Mean)
  - Max Temp (7-day Mean)
  - Min Temp (7-day Mean)

#### マイグレーション

**Supabaseを使用している場合:**
`SUPABASE_MIGRATION.md`を参照して、以下の手順を実行してください：
1. Supabase SQL Editorでスキーマ変更を実行
2. 既存データの7日移動平均を計算・更新
3. アプリケーションを再デプロイ

**ローカル開発環境:**
依存関係をインストールした後、以下のコマンドを実行：
```bash
# データベーススキーマを更新
node scripts/update-schema.js

# 既存データの7日移動平均を計算
node scripts/update-existing-data.js
```

---

**注意:** 本番環境では、開発用 SQLite (`file:./dev.db`) ではなく、Supabase のような永続化されたデータベースサービスを使用してください。`DATABASE_URL` を適切に設定することが重要です。
