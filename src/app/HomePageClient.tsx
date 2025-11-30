"use client"; // グラフ表示と状態管理のためクライアントコンポーネント化

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { TemperatureHistory } from '@prisma/client'; // Prismaモデルの型

import { SingleMetricChart } from "@/components/SingleMetricChart";
import { TemperatureChartContainer } from "@/components/TemperatureChartContainer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // Import toast from sonner
import { Loader2 } from "lucide-react";
import { updateTemperatureData } from '@/app/actions/temperatureActions';
import { useRouter } from 'next/navigation';

// 色配列
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#e57373', '#81c784'];

interface HomePageClientProps {
  initialDbData: TemperatureHistory[]; // サーバーから渡される初期データ
  availableYears: number[];
}

// recharts用データ整形関数
function formatDataForChart(dbData: TemperatureHistory[]) {
  const chartData = dbData.reduce((acc, cur) => {
    const dateStr = format(cur.date, 'MM/dd');
    const year = cur.date.getFullYear();
    const existing = acc.find(item => item.date === dateStr);
    const point = {
      [`${year}_avg7`]: cur.tempAvg7,
      [`${year}_high`]: cur.tempHigh7,
      [`${year}_low`]: cur.tempLow7,
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUpdateData = async () => {
    startTransition(async () => {
      try {
        const result = await updateTemperatureData();

        if (result.success) {
          toast.success("データ更新完了", {
            description: result.message || "データの更新が完了しました。",
          });
          router.refresh();
        } else {
          toast.error("データ更新エラー", {
            description: result.message || "データの更新に失敗しました。",
          });
        }
      } catch (error) {
        console.error("Failed to call updateTemperatureData:", error);
        toast.error("エラー", {
          description: "データ更新処理を呼び出せませんでした。",
        });
      }
    });
  };

  return (
    <div className="container mx-auto p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
             <TemperatureChartContainer
                availableYears={availableYears}
                onSelectedYearsChange={setSelectedYears}
             />
            <Button onClick={handleUpdateData} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                '最新データを取得'
              )}
            </Button>
        </div>

        <div className="w-full space-y-8 mt-4">
          <SingleMetricChart
            metricType="avg7"
            metricLabel="Avg Temp (7-day Mean)"
            chartData={chartData}
            selectedYears={selectedYears}
            availableYears={availableYears}
            colors={COLORS}
          />
          <SingleMetricChart
            metricType="high"
            metricLabel="Max Temp (7-day Mean)"
            chartData={chartData}
            selectedYears={selectedYears}
            availableYears={availableYears}
            colors={COLORS}
          />
          <SingleMetricChart
            metricType="low"
            metricLabel="Min Temp (7-day Mean)"
            chartData={chartData}
            selectedYears={selectedYears}
            availableYears={availableYears}
            colors={COLORS}
          />
        </div>
    </div>
  );
} 