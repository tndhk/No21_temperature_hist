import { format, parseISO, subDays, /*addDays,*/ eachDayOfInterval/*, isBefore*/ } from 'date-fns';
// Prisma の TemperatureHistoryCreateInput 型を使いたいが、lib はクライアント/サーバー両用可能性を考慮し直接はインポートしない方が良い場合もある。
// Server Action でのみ使うならインポートしても良い。ここでは一旦 Prisma 型への依存を避ける形で定義。
// 必要であれば TemperatureHistoryCreateInput をインポートする。
// import type { TemperatureHistoryCreateInput } from '@prisma/client';

// --- 定数 (local-etl.ts や環境変数から取得する方が望ましい) ---
const LATITUDE = 35.6895; // 東京の緯度 (例)
const LONGITUDE = 139.6917; // 東京の経度 (例)
const TIMEZONE = 'Asia/Tokyo';

interface OpenMeteoDailyData {
  time: string[]; // "YYYY-MM-DD"
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  temperature_2m_mean: (number | null)[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDailyData;
}

// Prisma の TemperatureHistoryCreateInput に相当する型 (Prismaに依存しない場合)
export interface TemperatureDataInput {
    date: Date;
    tempHigh: number | null;
    tempLow: number | null;
    tempAvg: number | null;
    tempAvg7: number | null; // 計算が必要
}


// 指定された期間の気温データをOpen-Meteo APIから取得する関数
export async function fetchTemperatureDataFromOpenMeteo(
  startDate: Date,
  endDate: Date
): Promise<TemperatureDataInput[]> {

  // 開始日と終了日を 'YYYY-MM-DD' 形式にフォーマット
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  console.log(`Fetching Open-Meteo data from ${startStr} to ${endStr}`);

  // APIエンドポイントURLを構築
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LATITUDE}&longitude=${LONGITUDE}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_mean,temperature_2m_min,temperature_2m_max&timezone=${TIMEZONE}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch Open-Meteo data: Status ${response.status}, ${errorText}`);
    }
    const data: OpenMeteoResponse = await response.json();

    if (!data.daily || !data.daily.time) {
        console.warn("Open-Meteo API response is missing daily data or time array.");
        return [];
    }

    const results: TemperatureDataInput[] = [];
    const dailyData = data.daily;

    for (let i = 0; i < dailyData.time.length; i++) {
      const date = parseISO(dailyData.time[i]); // 'YYYY-MM-DD' を Date オブジェクトに
      const tempHigh = dailyData.temperature_2m_max?.[i] ?? null;
      const tempLow = dailyData.temperature_2m_min?.[i] ?? null;
      const tempAvg = dailyData.temperature_2m_mean?.[i] ?? null;

      results.push({
        date: date,
        tempHigh: tempHigh,
        tempLow: tempLow,
        tempAvg: tempAvg,
        tempAvg7: null, // この時点ではnull。後で計算する。
      });
    }

    console.log(`Fetched ${results.length} records from Open-Meteo.`);
    return results;

  } catch (error) {
    console.error("Error fetching or processing Open-Meteo data:", error);
    throw error; // エラーを呼び出し元に伝播させる
  }
}

// 7日間移動平均を計算するヘルパー関数
export function calculateAvg7(data: TemperatureDataInput[]): TemperatureDataInput[] {
    if (!data || data.length === 0) return [];

    // 日付でソートされていることを確認 (APIレスポンスは通常ソートされている)
    data.sort((a, b) => a.date.getTime() - b.date.getTime());

    const dataWithAvg7: TemperatureDataInput[] = [];
    const dailyAvgMap = new Map<string, number | null>(data.map(d => [format(d.date, 'yyyy-MM-dd'), d.tempAvg]));

    for (const currentData of data) {
        let validDaysCount = 0;
        let sum = 0;

        // 当日を含む過去7日間を計算対象とする
        const interval = eachDayOfInterval({
            start: subDays(currentData.date, 6),
            end: currentData.date
        });

        for (const day of interval) {
            const dayStr = format(day, 'yyyy-MM-dd');
            if (dailyAvgMap.has(dayStr)) {
                const avg = dailyAvgMap.get(dayStr);
                if (avg !== null && typeof avg === 'number') {
                    sum += avg;
                    validDaysCount++;
                }
            }
        }

        const avg7 = validDaysCount > 0 ? sum / validDaysCount : null;

        dataWithAvg7.push({
            ...currentData,
            // 小数点以下1桁に丸める（必要に応じて）
            tempAvg7: avg7 !== null ? parseFloat(avg7.toFixed(1)) : null,
        });
    }

    return dataWithAvg7;
} 