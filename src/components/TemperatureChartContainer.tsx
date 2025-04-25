"use client";

import { useState, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// --- 定数 ---
const FALLBACK_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005];

// --- Props --- 
interface TemperatureChartContainerProps {
  availableYears?: number[];
  onSelectedYearsChange: (selectedYears: number[]) => void; // 親に選択年を通知
}

export function TemperatureChartContainer({
  availableYears = FALLBACK_YEARS,
  onSelectedYearsChange,
}: TemperatureChartContainerProps) {
  // --- State定義 ---
  const initialYears = availableYears.length >= 2 ? [availableYears[0], availableYears[1]] : availableYears;
  const [selectedYears, setSelectedYears] = useState<number[]>(initialYears);

  // --- イベントハンドラ ---
  const handleYearChange = (year: number) => {
    const newSelectedYears = selectedYears.includes(year)
      ? selectedYears.filter((y) => y !== year)
      : [...selectedYears, year];
    setSelectedYears(newSelectedYears);
    onSelectedYearsChange(newSelectedYears); // 変更を親に通知
  };

  // 初期選択を親に通知
  useEffect(() => {
    onSelectedYearsChange(selectedYears);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ

  // --- レンダリング ---
  return (
    <div className="w-full space-y-4 border-b pb-4 mb-8">
      <h2 className="text-xl font-semibold">表示する年を選択</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {availableYears.map((year) => (
          <div key={year} className="flex items-center space-x-2">
            <Checkbox
              id={`year-${year}`}
              checked={selectedYears.includes(year)}
              onCheckedChange={() => handleYearChange(year)}
            />
            <Label
              htmlFor={`year-${year}`}
              className="text-sm font-medium leading-none cursor-pointer"
            >
              {year}年
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
} 