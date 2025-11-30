-- Supabaseで既存データの7日移動平均を計算して更新するSQL
-- このSQLをSupabase SQL Editorで実行してください

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

-- 更新結果の確認（最新5件）
SELECT
  date,
  "tempHigh",
  "tempHigh7",
  "tempLow",
  "tempLow7"
FROM "TemperatureHistory"
ORDER BY date DESC
LIMIT 5;
