# Supabaseでのデータベースマイグレーション手順

このドキュメントでは、Supabaseデータベースに対してスキーマ変更を適用する手順を説明します。

## 最新の変更: tempHigh7とtempLow7フィールドの追加

### 変更内容
Max temperature（最高気温）とMin temperature（最低気温）にも7日間移動平均を追加しました。

- `tempHigh7`: 最高気温の7日間移動平均
- `tempLow7`: 最低気温の7日間移動平均

### マイグレーション手順

#### ステップ1: Supabase SQL Editorにアクセス

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック

#### ステップ2: スキーマ変更のSQLを実行

以下のSQLをSQL Editorで実行してください（`prisma/migrations/20251130_add_temp_high7_low7/migration.sql`の内容）:

```sql
-- Add tempHigh7 and tempLow7 columns to TemperatureHistory table
ALTER TABLE "TemperatureHistory" ADD COLUMN "tempHigh7" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "TemperatureHistory" ADD COLUMN "tempLow7" DOUBLE PRECISION NOT NULL DEFAULT 0;
```

実行後、「Success」というメッセージが表示されれば成功です。

#### ステップ3: 既存データの7日移動平均を計算

次に、既存のすべてのレコードに対して7日間移動平均を計算して更新します。

以下のSQLをSQL Editorで実行してください（`scripts/supabase-update-existing-data.sql`の内容）:

```sql
-- 一時的なCTE（Common Table Expression）を使って7日移動平均を計算
WITH ranked_data AS (
  SELECT
    id,
    date,
    "tempHigh",
    "tempLow",
    ROW_NUMBER() OVER (ORDER BY date) AS row_num
  FROM "TemperatureHistory"
  ORDER BY date
),
averages AS (
  SELECT
    rd1.id,
    rd1.date,
    -- 現在の行から過去6行（合計7行）の平均を計算
    AVG(rd2."tempHigh") AS high7,
    AVG(rd2."tempLow") AS low7
  FROM ranked_data rd1
  JOIN ranked_data rd2
    ON rd2.row_num BETWEEN rd1.row_num - 6 AND rd1.row_num
  GROUP BY rd1.id, rd1.date, rd1.row_num
)
UPDATE "TemperatureHistory" t
SET
  "tempHigh7" = ROUND(a.high7::numeric, 1),
  "tempLow7" = ROUND(a.low7::numeric, 1)
FROM averages a
WHERE t.id = a.id;
```

#### ステップ4: 更新結果の確認

以下のSQLで最新5件のデータを確認します:

```sql
SELECT
  date,
  "tempHigh",
  "tempHigh7",
  "tempLow",
  "tempLow7"
FROM "TemperatureHistory"
ORDER BY date DESC
LIMIT 5;
```

`tempHigh7`と`tempLow7`に適切な値が設定されていることを確認してください。

#### ステップ5: アプリケーションのデプロイ

マイグレーションが完了したら、Vercelで最新のコードをデプロイしてください。

1. GitHubに変更をプッシュ（既に完了している場合）
2. Vercelが自動的に新しいデプロイを開始します
3. デプロイ完了後、アプリケーションで新しいグラフが表示されることを確認

## トラブルシューティング

### エラー: column "tempHigh7" already exists

このエラーが出た場合、カラムは既に追加されています。ステップ3（既存データの更新）から続けてください。

### データが更新されない

- SQL EditorでSELECTクエリを実行して、データが正しく更新されているか確認してください
- 大量のデータがある場合、更新に時間がかかることがあります

### パフォーマンスの問題

大量のデータ（数万件以上）がある場合、更新クエリに時間がかかる可能性があります。その場合は、バッチ処理を検討してください。

## 今後のマイグレーション

今後、スキーマ変更が必要な場合は以下の手順で実施してください:

1. ローカルでPrismaスキーマを更新
2. `prisma/migrations/`に新しいマイグレーションフォルダを作成
3. `migration.sql`ファイルを作成
4. Supabase SQL Editorで手動実行
5. 必要に応じて既存データの更新SQLを実行
6. アプリケーションをデプロイ

## 注意事項

- **本番環境でのSQL実行には十分注意してください**
- 重要なデータがある場合は、事前にバックアップを取ることをお勧めします
- SQLの実行前に、テスト環境で動作確認することを推奨します
