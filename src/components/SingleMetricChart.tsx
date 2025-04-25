"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// --- 型定義 ---
interface ChartDataPoint {
  date: string; // "MM-DD"
  [key: string]: number | string | null; // "YYYY_avg7", "YYYY_high", "YYYY_low"
}
type ChartType = 'line' | 'diff';
type MetricType = 'avg7' | 'high' | 'low';

interface SingleMetricChartProps {
  metricType: MetricType;
  metricLabel: string; // グラフタイトル用 ("平均気温 (7日平均)"など)
  chartData: ChartDataPoint[];
  selectedYears: number[];
  availableYears: number[]; // 基準年選択用
  colors: string[]; // 色配列
}

export function SingleMetricChart({
  metricType,
  metricLabel,
  chartData,
  selectedYears,
  availableYears,
  colors,
}: SingleMetricChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  // 利用可能な選択年から基準年の初期値を設定
  const initialBaseYear = selectedYears.length > 1
    ? selectedYears.find(y => y !== selectedYears[0]) ?? selectedYears[1] // 最初の年以外を探す、なければ2番目
    : selectedYears[0];
  const [baseYear, setBaseYear] = useState<number>(initialBaseYear);

  // 選択年が変更されたら、基準年が選択年に含まれているか確認し、なければ更新
  useEffect(() => {
    if (!selectedYears.includes(baseYear)) {
      // 選択された年の最初の要素、または利用可能な年の最初の要素を基準年にする
      const newBaseYear = selectedYears.length > 0 ? selectedYears[0] : availableYears[0];
      setBaseYear(newBaseYear);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYears]); // baseYearは依存配列に含めない


  // --- グラフ要素生成 ---
  const chartElements = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const metricSuffix = metricType;

    // 折れ線
    const lineElements = selectedYears.map((year, index) => (
      <Line
        key={`${year}_${metricSuffix}_line`}
        type="monotone"
        dataKey={`${year}_${metricSuffix}`}
        stroke={colors[index % colors.length]}
        dot={false}
        strokeWidth={2}
        connectNulls
        name={`${year}年`}
      />
    ));

    // 差分エリア
    const diffAreaElements = selectedYears
      .filter((year) => year !== baseYear)
      .map((year, index) => {
        const diffDataKey = `${year}_diff_${baseYear}_${metricSuffix}`;
        return (
          <Area
            key={`${year}_diff_${metricSuffix}`}
            type="monotone"
            dataKey={diffDataKey}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.3}
            connectNulls
            name={`${year}年 vs ${baseYear}年 差`}
          />
        );
      });

    // 差分グラフ用データ加工
    const processedDiffChartData = chartData.map(d => {
      const newDataPoint = { ...d };
      selectedYears.filter(y => y !== baseYear).forEach(year => {
        const diffDataKey = `${year}_diff_${baseYear}_${metricSuffix}`;
        const yearValue = d[`${year}_${metricSuffix}`];
        const baseValue = d[`${baseYear}_${metricSuffix}`];
        newDataPoint[diffDataKey] = typeof yearValue === 'number' && typeof baseValue === 'number'
          ? yearValue - baseValue
          : null;
      });
      return newDataPoint;
    });

    // 基準年の線
    const baseYearLineElement = (
      <Line
          key={`${baseYear}_${metricSuffix}_base`}
          type="monotone"
          dataKey={`${baseYear}_${metricSuffix}`}
          stroke="#ccc" // 基準年はグレー
          dot={false}
          strokeWidth={1}
          connectNulls
          name={`${baseYear}年 (基準)`}
        />
    );

    return { lineElements, diffAreaElements, processedDiffChartData, baseYearLineElement };

  }, [chartData, selectedYears, baseYear, metricType, colors]);

  // --- レンダリング ---
  if (!chartElements) {
    // データがない、または選択年がない場合は何も表示しないか、メッセージを表示
    return (
        <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-medium mb-2">{metricLabel} (℃)</h3>
            <p className="text-sm text-gray-500">表示する年を選択してください。</p>
        </div>
    );
  }

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-4">{metricLabel} (℃)</h3>

      {/* --- グラフオプション --- */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
        <Tabs value={chartType} onValueChange={(value) => setChartType(value as ChartType)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="line">折れ線比較</TabsTrigger>
            <TabsTrigger value="diff" disabled={selectedYears.length < 2}>基準年との差 (エリア)</TabsTrigger>
          </TabsList>
        </Tabs>

        {chartType === 'diff' && (
          <div className="flex items-center gap-2">
            <Label htmlFor={`baseYearSelect-${metricType}`} className="text-sm">基準年:</Label>
            <Select
              value={String(baseYear)}
              onValueChange={(value) => setBaseYear(Number(value))}
              disabled={selectedYears.length < 2}
            >
              <SelectTrigger id={`baseYearSelect-${metricType}`} className="w-[120px]">
                <SelectValue placeholder="基準年" />
              </SelectTrigger>
              <SelectContent>
                {/* 基準年は選択されている年リストから選ぶ */}
                {selectedYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* --- グラフ描画エリア (TabsContentを使わず条件分岐で表示) --- */}
      <div className="mt-4"> {/* 以前TabsContentにあったマージンを追加 */} 
        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
              <YAxis unit="℃" tick={{ fontSize: 12 }} domain={[0, 40]} />
              <Tooltip />
              <Legend formatter={(value, entry: any) => entry?.payload?.name ?? value}/>
              {chartElements.lineElements}
            </LineChart>
          </ResponsiveContainer>
        )}
        {chartType === 'diff' && (
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart data={chartElements.processedDiffChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
              <YAxis unit="℃" tick={{ fontSize: 12 }} /> {/* 差分は自動スケール */}
              <Tooltip />
              <Legend formatter={(value, entry: any) => entry?.payload?.name ?? value}/>
              {chartElements.baseYearLineElement} {/* 基準年の線 */} 
              {chartElements.diffAreaElements}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
} 