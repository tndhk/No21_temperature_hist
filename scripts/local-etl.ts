import { z } from "zod";
import { addDays, format } from "date-fns";
import fs from "fs/promises"; // ファイル書き込み用
import path from "path"; // パス操作用

// --- 設定 --- 
const START_YEAR = 2000; // データ取得開始年
const END_YEAR = new Date().getFullYear(); // データ取得終了年（当年）
const OUTPUT_CSV_PATH = path.join(__dirname, '../output_temperature_history.csv'); // 出力CSVパス (プロジェクトルート)
const LATITUDE = 35.6895; // 東京の緯度
const LONGITUDE = 139.6917; // 東京の経度
const TIMEZONE = "Asia/Tokyo";
const API_SOURCE_NAME = "Open-Meteo";

// --- Zod スキーマ (src/lib/etl.ts と同様) ---
const ResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_mean: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
  }),
});

// --- 7日間移動平均計算 (src/lib/etl.ts と同様) ---
function compute7DayAverage(means: (number | null)[]): (number | null)[] {
  return means.map((_, i) => {
    const windowData = means.slice(Math.max(0, i - 6), i + 1);
    const validValues = windowData.filter(v => v !== null) as number[];
    if (validValues.length === 0) {
        return null; // 有効な値がなければnull
    }
    const sum = validValues.reduce((acc, v) => acc + v, 0);
    return sum / validValues.length;
  });
}

// --- CSVヘッダー ---
const CSV_HEADER = "date,tempHigh,tempLow,tempAvg,tempAvg7,source\n";

// --- メイン処理 ---
async function main() {
  console.log(`データ取得を開始します (${START_YEAR}年 - ${END_YEAR}年)`);
  let allDataRows: string[] = []; // 全期間のCSVデータ行を格納する配列

  try {
    // CSVファイルにヘッダーを書き込み (初回のみ)
    await fs.writeFile(OUTPUT_CSV_PATH, CSV_HEADER);
    console.log(`出力ファイルを作成しました: ${OUTPUT_CSV_PATH}`);

    for (let year = START_YEAR; year <= END_YEAR; year++) {
      console.log(`${year}年のデータを取得・処理中...`);
      const startDate = `${year}-01-01`;
      // 当年の場合は今日まで、過去年の場合は年末まで
      const endDate = (year === new Date().getFullYear()) 
                      ? format(new Date(), 'yyyy-MM-dd') 
                      : `${year}-12-31`;
      
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LATITUDE}&longitude=${LONGITUDE}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean,temperature_2m_min,temperature_2m_max&timezone=${TIMEZONE}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`  ${year}年 APIエラー: ${res.status} ${res.statusText}`);
          continue; // エラーが発生した年はスキップして次へ
        }
        const json = await res.json();
        const parseResult = ResponseSchema.safeParse(json);

        if (!parseResult.success) {
            console.error(`  ${year}年 データ形式エラー:`, parseResult.error.errors);
            continue;
        }
        const data = parseResult.data;

        // 7日間移動平均計算
        const avg7List = compute7DayAverage(data.daily.temperature_2m_mean);

        // CSVデータ行を生成
        const yearDataRows: string[] = [];
        for (let i = 0; i < data.daily.time.length; i++) {
          const mean = data.daily.temperature_2m_mean[i];
          const min = data.daily.temperature_2m_min[i];
          const max = data.daily.temperature_2m_max[i];
          const avg7 = avg7List[i];

          // nullチェック: 主要な値がnullならスキップ
          if (mean === null || min === null || max === null) {
            console.warn(`  スキップ ${data.daily.time[i]}: 欠損値`);
            continue;
          }

          // 日付をISO 8601形式に
          const dateISO = new Date(data.daily.time[i]).toISOString(); 

          // toFixed(1) で小数点以下1桁に丸める (avg7がnullの場合は空文字)
          const avg7Formatted = avg7 !== null ? avg7.toFixed(1) : ''; 

          yearDataRows.push(
            `${dateISO},${max.toFixed(1)},${min.toFixed(1)},${mean.toFixed(1)},${avg7Formatted},${API_SOURCE_NAME}`
          );
        }

        // 年ごとのデータをファイルに追記
        await fs.appendFile(OUTPUT_CSV_PATH, yearDataRows.join('\n') + '\n');
        console.log(`  ${year}年のデータを追記完了 (${yearDataRows.length}件)`);

      } catch (error) {
        console.error(`  ${year}年の処理中にエラーが発生しました:`, error);
      }

      // 連続リクエスト抑制のための待機 (API制限回避)
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    console.log('全データの取得・処理が完了しました。');

  } catch (error) {
    console.error('スクリプト全体でエラーが発生しました:', error);
    process.exit(1); // エラー終了
  }
}

// スクリプト実行
main(); 