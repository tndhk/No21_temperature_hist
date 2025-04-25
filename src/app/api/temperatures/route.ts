import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const prisma = new PrismaClient();

// クエリパラメータのスキーマ
const QuerySchema = z.object({
  years: z.string().transform((val) => val.split(',').map(Number).filter(n => !isNaN(n))),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const query = QuerySchema.parse({ years: searchParams.get('years') ?? '' });

    if (!query.years || query.years.length === 0) {
      return NextResponse.json({ error: "年を指定してください (例: ?years=2023,2024)" }, { status: 400 });
    }

    // 指定された年のデータを取得
    const dataPromises = query.years.map(year =>
      prisma.temperatureHistory.findMany({
        where: {
          date: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        },
        orderBy: { date: 'asc' },
        select: { date: true, tempAvg7: true, tempHigh: true, tempLow: true },
      })
    );

    const results = await Promise.all(dataPromises);

    // recharts用にデータを整形
    const chartData = results.flatMap((yearData, index) => {
      const year = query.years[index];
      return yearData.map(d => ({
        date: d.date.toISOString().slice(5, 10), // MM-DD形式
        [`${year}_avg7`]: d.tempAvg7,
        [`${year}_high`]: d.tempHigh,
        [`${year}_low`]: d.tempLow,
      }));
    });

    // 日付でマージする（異なる年の同じ日付を1つのオブジェクトに）
    const mergedData = chartData.reduce((acc, cur) => {
      const existing = acc.find(item => item.date === cur.date);
      if (existing) {
        Object.assign(existing, cur);
      } else {
        acc.push(cur);
      }
      return acc;
    }, [] as Array<{ date: string; [key: string]: number | string | null }>);

    // 日付順にソート
    mergedData.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(mergedData);

  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 