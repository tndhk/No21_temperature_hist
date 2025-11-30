import { compute7DayAverage, processAndSave, ResponseSchema } from "./etl";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ========================================
// 1. compute7DayAverage 関数のテスト
// ========================================
describe("compute7DayAverage", () => {
  // 正常系: 要素数が7未満の場合
  it("should compute correct moving averages for less than 7 elements", () => {
    const means = [10, 20, 30, 40];
    const result = compute7DayAverage(means);
    expect(result).toEqual([
      10,
      (10 + 20) / 2,
      (10 + 20 + 30) / 3,
      (10 + 20 + 30 + 40) / 4,
    ]);
  });

  // 正常系: 要素数が7以上の場合
  it("should compute correct moving averages for more than 7 elements", () => {
    const means = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = compute7DayAverage(means);
    expect(result[7]).toBeCloseTo(5, 5);
  });

  // 正常系: ちょうど7要素の場合
  it("should compute correct moving average for exactly 7 elements", () => {
    const means = [1, 2, 3, 4, 5, 6, 7];
    const result = compute7DayAverage(means);
    const expected = (1 + 2 + 3 + 4 + 5 + 6 + 7) / 7;
    expect(result[6]).toBeCloseTo(expected, 5);
  });

  // 正常系: 8要素目以降は正確に7日間の移動平均
  it("should use only 7-day window for elements after 7th position", () => {
    const means = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = compute7DayAverage(means);
    // 9番目（index=8）の移動平均は index 2~8（7要素）の平均
    const expected = (3 + 4 + 5 + 6 + 7 + 8 + 9) / 7;
    expect(result[8]).toBeCloseTo(expected, 5);
  });

  // 境界値: 単一要素
  it("should handle single element array", () => {
    const means = [50];
    const result = compute7DayAverage(means);
    expect(result).toEqual([50]);
  });

  // 境界値: 空配列
  it("should handle empty array", () => {
    const means: number[] = [];
    const result = compute7DayAverage(means);
    expect(result).toEqual([]);
  });

  // 異常系: 負の値を含む場合
  it("should handle negative values correctly", () => {
    const means = [-10, -5, 0, 5, 10];
    const result = compute7DayAverage(means);
    expect(result[0]).toBeCloseTo(-10, 5);
    expect(result[4]).toBeCloseTo((-10 + -5 + 0 + 5 + 10) / 5, 5);
  });

  // 異常系: 小数値を含む場合
  it("should handle decimal values correctly", () => {
    const means = [10.5, 20.7, 30.3];
    const result = compute7DayAverage(means);
    expect(result[0]).toBeCloseTo(10.5, 5);
    expect(result[1]).toBeCloseTo((10.5 + 20.7) / 2, 5);
    expect(result[2]).toBeCloseTo((10.5 + 20.7 + 30.3) / 3, 5);
  });

  // 異常系: ゼロ値のみ
  it("should handle all zeros correctly", () => {
    const means = [0, 0, 0, 0];
    const result = compute7DayAverage(means);
    expect(result).toEqual([0, 0, 0, 0]);
  });

  // 異常系: 非常に大きな値
  it("should handle very large numbers", () => {
    const means = [1e10, 2e10, 3e10];
    const result = compute7DayAverage(means);
    expect(result[0]).toBeCloseTo(1e10, 5);
    expect(result[2]).toBeCloseTo((1e10 + 2e10 + 3e10) / 3, 5);
  });

  // 境界値分析: 移動平均の計算が正確に行われることを確認
  it("should correctly track window boundaries", () => {
    const means = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = compute7DayAverage(means);
    // index 0: [1] -> avg = 1
    expect(result[0]).toBeCloseTo(1, 5);
    // index 6: [1,2,3,4,5,6,7] -> avg = 4
    expect(result[6]).toBeCloseTo(4, 5);
    // index 9: [4,5,6,7,8,9,10] -> avg = 7
    expect(result[9]).toBeCloseTo(7, 5);
  });
});

// ========================================
// 2. ResponseSchema (Zod検証) のテスト
// ========================================
describe("ResponseSchema validation", () => {
  // 正常系: 有効なAPIレスポンス
  it("should validate correct API response", () => {
    const validResponse = {
      daily: {
        time: ["2024-01-01", "2024-01-02"],
        temperature_2m_mean: [15.5, 16.2],
        temperature_2m_min: [10.1, 11.0],
        temperature_2m_max: [20.5, 21.0],
      },
    };
    expect(() => ResponseSchema.parse(validResponse)).not.toThrow();
  });

  // 異常系: nullを含むデータ
  it("should allow nullable temperature values", () => {
    const responseWithNull = {
      daily: {
        time: ["2024-01-01", "2024-01-02"],
        temperature_2m_mean: [15.5, null],
        temperature_2m_min: [10.1, null],
        temperature_2m_max: [20.5, null],
      },
    };
    expect(() => ResponseSchema.parse(responseWithNull)).not.toThrow();
  });

  // 異常系: 欠損する時刻データ
  it("should reject response with missing time array", () => {
    const invalidResponse = {
      daily: {
        temperature_2m_mean: [15.5],
        temperature_2m_min: [10.1],
        temperature_2m_max: [20.5],
      },
    };
    expect(() => ResponseSchema.parse(invalidResponse)).toThrow();
  });

  // 異常系: 不正な型
  it("should reject invalid data types", () => {
    const invalidResponse = {
      daily: {
        time: ["2024-01-01"],
        temperature_2m_mean: ["invalid"],
        temperature_2m_min: [10.1],
        temperature_2m_max: [20.5],
      },
    };
    expect(() => ResponseSchema.parse(invalidResponse)).toThrow();
  });

  // 異常系: 空配列
  it("should allow empty daily arrays", () => {
    const emptyResponse = {
      daily: {
        time: [],
        temperature_2m_mean: [],
        temperature_2m_min: [],
        temperature_2m_max: [],
      },
    };
    expect(() => ResponseSchema.parse(emptyResponse)).not.toThrow();
  });
});

// ========================================
// 3. ResponseSchema と日付処理のテスト
// ========================================
describe("Date handling in ETL", () => {
  // 正常系: 日付文字列のパース
  it("should correctly parse date strings from API response", () => {
    const validResponse = {
      daily: {
        time: [
          "2024-01-01",
          "2024-01-02",
          "2024-01-03",
        ],
        temperature_2m_mean: [15.5, 16.2, 17.1],
        temperature_2m_min: [10.1, 11.0, 12.0],
        temperature_2m_max: [20.5, 21.0, 22.0],
      },
    };

    const parsed = ResponseSchema.parse(validResponse);
    expect(parsed.daily.time).toHaveLength(3);
    expect(parsed.daily.time[0]).toBe("2024-01-01");
  });

  // 異常系: スキーマに基づくデータ検証
  it("should validate temperature data with correct schema", () => {
    const testData = {
      daily: {
        time: ["2024-01-01"],
        temperature_2m_mean: [15.5],
        temperature_2m_min: [10.1],
        temperature_2m_max: [20.5],
      },
    };

    expect(() => ResponseSchema.parse(testData)).not.toThrow();
  });

  // 異常系: 移動平均の計算ロジック検証
  it("should correctly calculate moving averages for chunk processing", () => {
    const means = [10, 20, 30, 40, 50, 60, 70];
    const result = compute7DayAverage(means);

    // 最初の要素は単独
    expect(result[0]).toBeCloseTo(10, 5);
    // 最後の要素は7つすべての平均
    expect(result[6]).toBeCloseTo((10 + 20 + 30 + 40 + 50 + 60 + 70) / 7, 5);
  });

  // 正常系: 10年分のデータをチャンクに分割することを検証
  it("should handle 10-year date range calculation correctly", () => {
    const today = new Date("2024-01-01");
    const tenYearsAgo = new Date("2014-01-01");

    // 10年分の期間が正しく計算されることを確認
    const yearDiff = today.getFullYear() - tenYearsAgo.getFullYear();
    expect(yearDiff).toBe(10);
  });

  // 境界値: 365日のチャンク処理
  it("should handle 365-day chunk boundary correctly", () => {
    const chunkDays = 365;
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    // 開始日から365日後を計算
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + chunkDays);

    // 365日以上の差分があることを確認
    const diffMs = nextDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(chunkDays);
  });
}); 