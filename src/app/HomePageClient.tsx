"use client"; // グラフ表示と状態管理のためクライアントコンポーネント化

import { useState } from 'react';
import { format } from 'date-fns';
import { TemperatureHistory } from '@prisma/client'; // Prismaモデルの型

import { SingleMetricChart } from "@/components/SingleMetricChart";
import { TemperatureChartContainer } from "@/components/TemperatureChartContainer";

// 色配列
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#e57373', '#81c784'];

interface HomePageClientProps {
  initialDbData: TemperatureHistory[]; // サーバーから渡される初期データ
  availableYears: number[];
}

// recharts用データ整形関数
function formatDataForChart(dbData: TemperatureHistory[]) {
  const chartData = dbData.reduce((acc, cur) => {
    const dateStr = format(cur.date, 'MM-dd');
    const year = cur.date.getFullYear();
    const existing = acc.find(item => item.date === dateStr);
    const point = {
      [`${year}_avg7`]: cur.tempAvg7,
      [`${year}_high`]: cur.tempHigh,
      [`${year}_low`]: cur.tempLow,
    };
    if (existing) {
      Object.assign(existing, point);
    } else {
      acc.push({ date: dateStr, ...point });
    }
    return acc;
  }, [] as Array<{ date: string; [key: string]: number | string | null }>);
  chartData.sort((a, b) => a.date.localeCompare(b.date));
  return chartData;
}


export function HomePageClient({ initialDbData, availableYears }: HomePageClientProps) {
  const [selectedYears, setSelectedYears] = useState<number[]>(
    availableYears.length >= 2 ? [availableYears[0], availableYears[1]] : availableYears
  );
  const chartData = formatDataForChart(initialDbData);

  return (
    <div className="container mx-auto p-4">
        {/* 年選択UIコンテナ */}
        <TemperatureChartContainer
          availableYears={availableYears}
          onSelectedYearsChange={setSelectedYears}
        />

        {/* グラフ描画エリア */}
        <div className="w-full space-y-8 mt-8">
          <SingleMetricChart
            metricType="avg7"
            metricLabel="平均気温 (7日平均)"
            chartData={chartData}
            selectedYears={selectedYears}
            availableYears={availableYears}
            colors={COLORS}
          />
          <SingleMetricChart
            metricType="high"
            metricLabel="最高気温"
            chartData={chartData}
            selectedYears={selectedYears}
            availableYears={availableYears}
            colors={COLORS}
          />
          <SingleMetricChart
            metricType="low"
            metricLabel="最低気温"
            chartData={chartData}
            selectedYears={selectedYears}
            availableYears={availableYears}
            colors={COLORS}
          />
        </div>
    </div>
  );
} 