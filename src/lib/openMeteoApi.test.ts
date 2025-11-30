import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchTemperatureDataFromOpenMeteo,
  calculateAvg7,
  TemperatureDataInput,
} from "./openMeteoApi";

// ========================================
// 1. fetchTemperatureDataFromOpenMeteo 関数のテスト
// ========================================
describe("fetchTemperatureDataFromOpenMeteo", () => {
  beforeEach(() => {
    // fetchをリセット
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 正常系: 有効なデータを返す場合
  it("should fetch and return temperature data successfully", async () => {
    const mockResponse = {
      daily: {
        time: ["2024-01-01", "2024-01-02"],
        temperature_2m_max: [20.5, 21.0],
        temperature_2m_min: [10.1, 11.0],
        temperature_2m_mean: [15.5, 16.2],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);

    expect(result).toHaveLength(2);
    expect(result[0].date).toEqual(new Date("2024-01-01"));
    expect(result[0].tempHigh).toBe(20.5);
    expect(result[0].tempLow).toBe(10.1);
    expect(result[0].tempAvg).toBe(15.5);
    expect(result[0].tempAvg7).toBeNull();
    expect(result[0].tempHigh7).toBeNull();
    expect(result[0].tempLow7).toBeNull();
  });

  // 異常系: APIがHTTPエラーを返す場合
  it("should throw error when API returns non-ok status", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    await expect(
      fetchTemperatureDataFromOpenMeteo(startDate, endDate)
    ).rejects.toThrow("Failed to fetch Open-Meteo data");
  });

  // 異常系: APIが500エラーを返す場合
  it("should throw error for 500 server error", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    await expect(
      fetchTemperatureDataFromOpenMeteo(startDate, endDate)
    ).rejects.toThrow("Status 500");
  });

  // 異常系: APIレスポンスにdailyデータがない場合
  it("should handle missing daily data gracefully", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);
    expect(result).toEqual([]);
  });

  // 異常系: APIレスポンスにtimeがない場合
  it("should handle missing time array", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            daily: {
              temperature_2m_max: [20.5],
            },
          }),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);
    expect(result).toEqual([]);
  });

  // 異常系: APIレスポンスがnull値を含む場合
  it("should handle null values in temperature arrays", async () => {
    const mockResponse = {
      daily: {
        time: ["2024-01-01", "2024-01-02", "2024-01-03"],
        temperature_2m_max: [20.5, null, 21.0],
        temperature_2m_min: [10.1, 11.0, null],
        temperature_2m_mean: [15.5, null, 16.2],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-03");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);

    expect(result).toHaveLength(3);
    expect(result[0].tempHigh).toBe(20.5);
    expect(result[1].tempHigh).toBeNull();
    expect(result[2].tempLow).toBeNull();
  });

  // 異常系: ネットワークエラー
  it("should throw error on network failure", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network error"))
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    await expect(
      fetchTemperatureDataFromOpenMeteo(startDate, endDate)
    ).rejects.toThrow("Network error");
  });

  // 境界値: 単一日付
  it("should handle single day date range", async () => {
    const mockResponse = {
      daily: {
        time: ["2024-01-01"],
        temperature_2m_max: [20.5],
        temperature_2m_min: [10.1],
        temperature_2m_mean: [15.5],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-01");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);
    expect(result).toHaveLength(1);
  });

  // 境界値: 空のdailyデータ
  it("should handle empty time array", async () => {
    const mockResponse = {
      daily: {
        time: [],
        temperature_2m_max: [],
        temperature_2m_min: [],
        temperature_2m_mean: [],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);
    expect(result).toEqual([]);
  });

  // 異常系: JSON解析エラー
  it("should throw error on invalid JSON response", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-02");

    await expect(
      fetchTemperatureDataFromOpenMeteo(startDate, endDate)
    ).rejects.toThrow("Invalid JSON");
  });

  // 正常系: 負の気温値
  it("should handle negative temperature values", async () => {
    const mockResponse = {
      daily: {
        time: ["2024-01-01"],
        temperature_2m_max: [-5.5],
        temperature_2m_min: [-15.1],
        temperature_2m_mean: [-10.3],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-01");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);
    expect(result[0].tempHigh).toBe(-5.5);
    expect(result[0].tempLow).toBe(-15.1);
  });

  // 正常系: 小数点以下3桁の気温値
  it("should handle high precision temperature values", async () => {
    const mockResponse = {
      daily: {
        time: ["2024-01-01"],
        temperature_2m_max: [20.123],
        temperature_2m_min: [10.456],
        temperature_2m_mean: [15.789],
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as any)
    );

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-01");

    const result = await fetchTemperatureDataFromOpenMeteo(startDate, endDate);
    expect(result[0].tempHigh).toBe(20.123);
    expect(result[0].tempLow).toBe(10.456);
  });
});

// ========================================
// 2. calculateAvg7 関数のテスト
// ========================================
describe("calculateAvg7", () => {
  // 正常系: 7日以上のデータで正確に計算される
  it("should calculate 7-day moving average correctly for 7+ days", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: 21.0,
        tempLow: 11.0,
        tempAvg: 16.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-03"),
        tempHigh: 22.0,
        tempLow: 12.0,
        tempAvg: 17.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-04"),
        tempHigh: 23.0,
        tempLow: 13.0,
        tempAvg: 18.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-05"),
        tempHigh: 24.0,
        tempLow: 14.0,
        tempAvg: 19.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-06"),
        tempHigh: 25.0,
        tempLow: 15.0,
        tempAvg: 20.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-07"),
        tempHigh: 26.0,
        tempLow: 16.0,
        tempAvg: 21.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 7日目は全ての値が平均
    expect(result[6].tempAvg7).toBeCloseTo(18.0, 1);
    expect(result[6].tempHigh7).toBeCloseTo(23.0, 1);
    expect(result[6].tempLow7).toBeCloseTo(13.0, 1);
  });

  // 境界値: 7日未満のデータ
  it("should handle less than 7 days of data", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: 21.0,
        tempLow: 11.0,
        tempAvg: 16.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 2日目の平均は2日分の平均
    expect(result[1].tempAvg7).toBeCloseTo(15.5, 1);
    expect(result[1].tempHigh7).toBeCloseTo(20.5, 1);
    expect(result[1].tempLow7).toBeCloseTo(10.5, 1);
  });

  // 境界値: 単一日のデータ
  it("should handle single day of data", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    expect(result[0].tempAvg7).toBeCloseTo(15.0, 1);
    expect(result[0].tempHigh7).toBeCloseTo(20.0, 1);
    expect(result[0].tempLow7).toBeCloseTo(10.0, 1);
  });

  // 異常系: 空配列
  it("should handle empty array", () => {
    const data: TemperatureDataInput[] = [];
    const result = calculateAvg7(data);
    expect(result).toEqual([]);
  });

  // 異常系: nullデータを含む場合
  it("should skip null values in moving average calculation", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: null,
        tempLow: null,
        tempAvg: null,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-03"),
        tempHigh: 22.0,
        tempLow: 12.0,
        tempAvg: 17.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 3日目は2つの有効なデータのみで平均
    expect(result[2].tempAvg7).toBeCloseTo(16.0, 1);
  });

  // 異常系: 全てnullのデータ
  it("should return null when all values in window are null", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: null,
        tempLow: null,
        tempAvg: null,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: null,
        tempLow: null,
        tempAvg: null,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    expect(result[1].tempAvg7).toBeNull();
    expect(result[1].tempHigh7).toBeNull();
    expect(result[1].tempLow7).toBeNull();
  });

  // 正常系: 負の気温値
  it("should handle negative temperature values", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: -5.0,
        tempLow: -15.0,
        tempAvg: -10.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: -4.0,
        tempLow: -14.0,
        tempAvg: -9.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    expect(result[1].tempAvg7).toBeCloseTo(-9.5, 1);
    expect(result[1].tempHigh7).toBeCloseTo(-4.5, 1);
    expect(result[1].tempLow7).toBeCloseTo(-14.5, 1);
  });

  // 正常系: 小数点以下1桁に丸められる
  it("should round to 1 decimal place", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: 21.0,
        tempLow: 11.0,
        tempAvg: 16.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 小数点以下1桁に丸められる
    // (15 + 16) / 2 = 15.5
    expect(result[1].tempAvg7).toBeCloseTo(15.5, 1);
  });

  // 正常系: データが日付でソートされていない場合も対応
  it("should sort data by date before calculation", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-03"),
        tempHigh: 22.0,
        tempLow: 12.0,
        tempAvg: 17.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: 21.0,
        tempLow: 11.0,
        tempAvg: 16.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 最初のデータ（元々は3番目）の平均が1つの値で計算される
    expect(result[0].tempAvg7).toBeCloseTo(15.0, 1);
  });

  // 異常系: nullデータを含みながら7日以上のデータ
  it("should handle mixed valid and null values for 7+ days", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: null,
        tempLow: null,
        tempAvg: null,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-03"),
        tempHigh: 22.0,
        tempLow: 12.0,
        tempAvg: 17.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-04"),
        tempHigh: 23.0,
        tempLow: 13.0,
        tempAvg: 18.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-05"),
        tempHigh: 24.0,
        tempLow: 14.0,
        tempAvg: 19.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-06"),
        tempHigh: 25.0,
        tempLow: 15.0,
        tempAvg: 20.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-07"),
        tempHigh: 26.0,
        tempLow: 16.0,
        tempAvg: 21.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 7日目は6つの有効なデータのみで平均
    const validAvgSum = 15.0 + 17.0 + 18.0 + 19.0 + 20.0 + 21.0;
    const expectedAvg = validAvgSum / 6;
    expect(result[6].tempAvg7).toBeCloseTo(expectedAvg, 1);
  });

  // 正常系: 8日以上のデータで過去7日の計算を確認
  it("should calculate moving average for 8+ days correctly", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 10.0,
        tempLow: 0.0,
        tempAvg: 5.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: 11.0,
        tempLow: 1.0,
        tempAvg: 6.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-03"),
        tempHigh: 12.0,
        tempLow: 2.0,
        tempAvg: 7.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-04"),
        tempHigh: 13.0,
        tempLow: 3.0,
        tempAvg: 8.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-05"),
        tempHigh: 14.0,
        tempLow: 4.0,
        tempAvg: 9.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-06"),
        tempHigh: 15.0,
        tempLow: 5.0,
        tempAvg: 10.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-07"),
        tempHigh: 16.0,
        tempLow: 6.0,
        tempAvg: 11.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-08"),
        tempHigh: 17.0,
        tempLow: 7.0,
        tempAvg: 12.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    // 8日目は2~8日（7日間）の平均
    const expectedAvg = (6.0 + 7.0 + 8.0 + 9.0 + 10.0 + 11.0 + 12.0) / 7;
    expect(result[7].tempAvg7).toBeCloseTo(expectedAvg, 1);
    expect(result[7].tempAvg7).toBeCloseTo(9.0, 1);
  });

  // 境界値: 全てnull以外のデータ
  it("should calculate correctly for all non-null values", () => {
    const data: TemperatureDataInput[] = [
      {
        date: new Date("2024-01-01"),
        tempHigh: 20.0,
        tempLow: 10.0,
        tempAvg: 15.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-02"),
        tempHigh: 21.0,
        tempLow: 11.0,
        tempAvg: 16.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
      {
        date: new Date("2024-01-03"),
        tempHigh: 22.0,
        tempLow: 12.0,
        tempAvg: 17.0,
        tempAvg7: null,
        tempHigh7: null,
        tempLow7: null,
      },
    ];

    const result = calculateAvg7(data);

    expect(result).toHaveLength(3);
    expect(result[0].tempAvg7).not.toBeNull();
    expect(result[1].tempAvg7).not.toBeNull();
    expect(result[2].tempAvg7).not.toBeNull();
  });
});
