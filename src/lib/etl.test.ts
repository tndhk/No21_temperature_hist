import { compute7DayAverage } from "./etl";
import { describe, it, expect } from "vitest";

describe("compute7DayAverage", () => {
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

  it("should compute correct moving averages for more than 7 elements", () => {
    const means = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = compute7DayAverage(means);
    expect(result[7]).toBeCloseTo(5, 5);
  });
}); 