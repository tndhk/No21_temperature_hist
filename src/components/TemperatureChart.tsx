"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Checkbox } from "@/components/ui/checkbox"; // shadcn/uiのCheckbox
import { Label } from "@/components/ui/label"; // shadcn/uiのLabel

// グラフデータの型 (APIレスポンスに合わせた型)
interface ChartDataPoint {
  date: string; // "MM-DD"
  [key: string]: number | string | null; // "YYYY_avg7", "YYYY_high", "YYYY_low"
}

// 利用可能な年 (DBから動的に取得するのが理想だが、一旦固定)
// TODO: DBから取得するように変更
const AVAILABLE_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

// 利用可能な年の初期値 (DBから取得できなかった場合のフォールバック)
const FALLBACK_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

interface TemperatureChartProps {
  availableYears?: number[];
}

// 色の配列 (適宜追加・変更)
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#e57373', '#81c784'];

export function TemperatureChart({ availableYears = FALLBACK_YEARS }: TemperatureChartProps) {
  // 利用可能な年から初期選択年を決定
  const initialYears = availableYears.length >= 2 ? [availableYears[0], availableYears[1]] : availableYears;
  const [selectedYears, setSelectedYears] = useState<number[]>(initialYears);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedYears.length === 0) {
        setChartData([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/temperatures?years=${selectedYears.join(',')}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'データの取得に失敗しました');
        }
        const data = await response.json();
        setChartData(data);
      } catch (err) {
        setError((err as Error).message);
        setChartData([]); // エラー時はデータをクリア
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYears]); // selectedYearsが変更されたら再取得

  const handleYearChange = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year) // 選択解除
        : [...prev, year] // 選択追加
    );
  };

  // 選択された年に基づいて表示するLineを動的に生成 (グラフ種別ごと)
  const lines = useMemo(() => {
    const avg7Lines = selectedYears.map((year, index) => (
      <Line
        key={year}
        type="monotone"
        dataKey={`${year}_avg7`}
        stroke={COLORS[index % COLORS.length]} // 色を循環利用
        dot={false}
        strokeWidth={2}
        connectNulls // nullデータは線をつなぐ
      />
    ));

    const highLines = selectedYears.map((year, index) => (
      <Line
        key={`${year}_high`}
        type="monotone"
        dataKey={`${year}_high`}
        stroke={COLORS[index % COLORS.length]}
        dot={false}
        strokeWidth={2} // 太さを平均に合わせる
        connectNulls
      />
    ));

    const lowLines = selectedYears.map((year, index) => (
      <Line
        key={`${year}_low`}
        type="monotone"
        dataKey={`${year}_low`}
        stroke={COLORS[index % COLORS.length]}
        dot={false}
        strokeWidth={2} // 太さを平均に合わせる
        connectNulls
      />
    ));

    return { avg7Lines, highLines, lowLines };
  }, [selectedYears]);

  return (
    <div className="w-full space-y-8">
      <h2 className="text-xl font-semibold mb-4">年別 気温推移 (7日間移動平均)</h2>

      {/* 年選択UI */}
      <div className="flex flex-wrap gap-4 mb-6">
        {availableYears.map((year) => (
          <div key={year} className="flex items-center space-x-2">
            <Checkbox
              id={`year-${year}`}
              checked={selectedYears.includes(year)}
              onCheckedChange={() => handleYearChange(year)}
            />
            <Label htmlFor={`year-${year}`} className="text-sm font-medium leading-none">
              {year}年
            </Label>
          </div>
        ))}
      </div>

      {/* ローディング・エラー表示 */}
      {loading && <p className="text-center py-4">グラフデータを読み込み中...</p>}
      {error && <p className="text-center py-4 text-red-600">エラー: {error}</p>}

      {/* グラフ表示エリア */}
      {!loading && !error && chartData.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {/* 7日間移動平均グラフ */}
          <div>
            <h3 className="text-lg font-medium mb-2">平均気温 (℃) (7日間移動平均)</h3>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                <YAxis unit="℃" tick={{ fontSize: 12 }} domain={[0, 40]} />
                <Tooltip />
                <Legend />
                {lines.avg7Lines}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 最高気温グラフ */}
          <div>
            <h3 className="text-lg font-medium mb-2">最高気温 (℃)</h3>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                <YAxis unit="℃" tick={{ fontSize: 12 }} domain={[0, 40]} />
                <Tooltip />
                <Legend />
                {lines.highLines}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 最低気温グラフ */}
          <div>
            <h3 className="text-lg font-medium mb-2">最低気温 (℃)</h3>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }}/>
                <YAxis unit="℃" tick={{ fontSize: 12 }} domain={[0, 40]} />
                <Tooltip />
                <Legend />
                {lines.lowLines}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          {!loading && !error && chartData.length === 0 && selectedYears.length > 0 && (
            <p>選択された年のデータがありません。</p>
          )}
          {!loading && !error && selectedYears.length === 0 && (
            <p>表示する年を選択してください。</p>
          )}
        </div>
      )}
    </div>
  );
} 