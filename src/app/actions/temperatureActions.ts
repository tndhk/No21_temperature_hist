"use server";

import { PrismaClient, TemperatureHistory } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { fetchTemperatureDataFromOpenMeteo, calculateAvg7, TemperatureDataInput } from '@/lib/openMeteoApi';
import { startOfDay, subDays } from 'date-fns';
import { format } from 'date-fns';

const prisma = new PrismaClient();

interface UpdateResult {
  success: boolean;
  message?: string;
  addedCount?: number;
}

export async function updateTemperatureData(): Promise<UpdateResult> {
  console.log("Server Action: updateTemperatureData called (using Open-Meteo)");
  try {
    // 1. データベース内の最新の日付を取得
    const latestEntry = await prisma.temperatureHistory.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, tempAvg: true },
    });

    // 2. データ取得開始日を決定
    const startDate = latestEntry
      ? startOfDay(new Date(latestEntry.date.getTime() + 24 * 60 * 60 * 1000))
      : startOfDay(new Date('2023-01-01'));

    // 3. データ取得終了日を決定 (今日)
    const endDate = startOfDay(new Date());

    console.log(`Determined fetch period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    if (startDate > endDate) {
        console.log("Data is already up to date.");
        return { success: true, message: 'データは既に最新です。', addedCount: 0 };
    }

    // 4. Open-Meteo API からデータを取得
    const fetchedData = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);

    if (fetchedData.length === 0) {
      console.log("No new data fetched from Open-Meteo.");
       return { success: true, message: '取得できる新しいデータがありませんでした。', addedCount: 0 };
    }

    // 5. 7日間移動平均を計算
    const neededHistoryDate = startOfDay(subDays(startDate, 1));
    const recentHistory = await prisma.temperatureHistory.findMany({
        where: {
            date: {
                gte: subDays(neededHistoryDate, 6),
                lte: neededHistoryDate,
            },
        },
        orderBy: { date: 'asc' },
        select: { date: true, tempAvg: true },
    });

    const combinedDataForAvgCalc: TemperatureDataInput[] = [
        ...recentHistory.map(h => ({
            date: h.date,
            tempAvg: h.tempAvg,
            tempHigh: null,
            tempLow: null,
            tempAvg7: null
        })),
        ...fetchedData,
    ];

    const dataWithAvg7 = calculateAvg7(combinedDataForAvgCalc);

    const newDataToSave = dataWithAvg7.filter(d => d.date >= startDate && d.date <= endDate);

    if (newDataToSave.length === 0) {
        console.log("No data to save after calculating Avg7.");
        return { success: true, message: '保存する新しいデータがありませんでした。', addedCount: 0 };
    }

    // 6. 取得したデータをデータベースに保存
    // Prismaの型に合わせる (TemperatureHistoryCreateInput ではなく Omit<TemperatureHistory, 'id'>)
    const dataForPrisma/*: Omit<TemperatureHistory, 'id'>[]*/ = newDataToSave.map(d => ({
        date: d.date,
        tempHigh: d.tempHigh,
        tempLow: d.tempLow,
        tempAvg: d.tempAvg,
        tempAvg7: d.tempAvg7,
        source: "open-meteo",
    }));

    // 挿入前に、対象期間の既存データをチェックする
    const existingDates = await prisma.temperatureHistory.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            date: true,
        },
    });
    const existingDateStrings = new Set(existingDates.map(d => format(d.date, 'yyyy-MM-dd')));

    // 既存の日付を除外したデータのみを抽出
    const dataToInsertFilteredByDate = (dataForPrisma as any[]).filter(d => !existingDateStrings.has(format(d.date, 'yyyy-MM-dd')));

    // さらに、必須の気温データが null のレコードを除外
    const dataToInsert = dataToInsertFilteredByDate.filter(
        d =>
            d.tempHigh !== null &&
            d.tempLow !== null &&
            d.tempAvg !== null &&
            d.tempAvg7 !== null
    );

    if (dataToInsert.length === 0) {
        console.log("No new data to insert after filtering existing dates and null values.");
        return { success: true, message: 'データベースは既に最新、または取得データに必要な気温情報が含まれていませんでした。', addedCount: 0 };
    }

    // skipDuplicates を削除し、フィルタリング後のデータを渡す
    const createResult = await prisma.temperatureHistory.createMany({
      data: dataToInsert,
      // skipDuplicates: true, // <- ここを削除
    });

    console.log(`Attempted to insert ${dataToInsert.length} records. Result count: ${createResult.count}.`);

    // 7. キャッシュの再検証
    revalidatePath('/');

    return {
        success: true,
        message: `${createResult.count} 件の新しいデータを追加しました。`, // createResult.count を使用
        addedCount: createResult.count
    };

  } catch (error) {
    console.error("Error in updateTemperatureData Server Action:", error);
    let errorMessage = 'データの更新中にエラーが発生しました。';
    if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
    }
    return { success: false, message: errorMessage };
  } finally {
    await prisma.$disconnect();
  }
} 