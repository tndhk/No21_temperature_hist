import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { addDays, format } from "date-fns";

// APIレスポンス検証スキーマ
export const ResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_mean: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
  }),
});

/**
 * 7日間移動平均を計算して返す
 * @param means 日別平均気温配列
 */
export function compute7DayAverage(means: number[]): number[] {
  return means.map((_, i) => {
    const startIdx = Math.max(0, i - 6);
    const window = means.slice(startIdx, i + 1);
    const sum = window.reduce((acc, v) => acc + v, 0);
    return sum / window.length;
  });
}

// メイン ETL 処理
export async function processAndSave() {
  const prisma = new PrismaClient();
  try {
    const today = new Date();
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(today.getFullYear() - 10);
    const CHUNK_DAYS = 365;

    let cursor = tenYearsAgo;
    while (cursor < today) {
      const next = addDays(cursor, CHUNK_DAYS);
      const chunkEnd = next > today ? today : next;
      await fetchAndSave(cursor, chunkEnd, prisma);
      cursor = addDays(chunkEnd, 1);
      // 連続リクエスト抑制
      await new Promise((r) => setTimeout(r, 500));
    }
    return { message: "初期データ取得完了" };
  } finally {
    await prisma.$disconnect();
  }
}

// チャンクごとのデータ取得と永続化
async function fetchAndSave(startDate: Date, endDate: Date, prisma: PrismaClient) {
  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=35.6895&longitude=139.6917&start_date=${start}&end_date=${end}&daily=temperature_2m_mean,temperature_2m_min,temperature_2m_max&timezone=Asia/Tokyo`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API Error ${res.status}`);
  const json = await res.json();
  const data = ResponseSchema.parse(json);

  // 7日間移動平均の計算
  const avg7List = compute7DayAverage(
    data.daily.temperature_2m_mean.map((v) => v ?? 0)
  );

  for (let i = 0; i < data.daily.time.length; i++) {
    const mean = data.daily.temperature_2m_mean[i];
    const min = data.daily.temperature_2m_min[i];
    const max = data.daily.temperature_2m_max[i];
    if (mean === null || min === null || max === null) {
      // 欠損値はスキップ＆ログ
      console.warn(`Skip ${data.daily.time[i]}: 欠損値`);
      continue;
    }
    const date = new Date(data.daily.time[i]);
    await prisma.temperatureHistory.upsert({
      where: { date },
      create: {
        date,
        tempHigh: max,
        tempLow: min,
        tempAvg: mean,
        tempAvg7: avg7List[i] ?? mean,
        source: "Open-Meteo",
      },
      update: {
        tempHigh: max,
        tempLow: min,
        tempAvg: mean,
        tempAvg7: avg7List[i] ?? mean,
        source: "Open-Meteo",
      },
    });
  }
} 