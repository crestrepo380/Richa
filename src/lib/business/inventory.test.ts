import { describe, expect, it } from "vitest";
import {
  deriveInventory,
  isLowStock,
  sellThroughRate,
  summarizeInventory,
} from "./inventory";

describe("deriveInventory", () => {
  it("derives units sold and replenishment from the counts (the spec example)", () => {
    expect(deriveInventory({ originalQuantity: 10, currentOnHand: 6 })).toEqual({
      originalQuantity: 10,
      currentOnHand: 6,
      unitsSold: 4,
      replenishQuantity: 4,
    });
  });

  it("reports nothing sold when the dealer's count is unchanged", () => {
    const result = deriveInventory({ originalQuantity: 10, currentOnHand: 10 });
    expect(result.unitsSold).toBe(0);
    expect(result.replenishQuantity).toBe(0);
  });

  it("treats a fully depleted dealer as having sold everything", () => {
    const result = deriveInventory({ originalQuantity: 10, currentOnHand: 0 });
    expect(result.unitsSold).toBe(10);
    expect(result.replenishQuantity).toBe(10);
  });

  it("never reports negative sales when on hand exceeds what was shipped", () => {
    const result = deriveInventory({ originalQuantity: 10, currentOnHand: 14 });
    expect(result.unitsSold).toBe(0);
    expect(result.replenishQuantity).toBe(0);
  });

  it("normalizes negative, fractional, and non-finite counts", () => {
    expect(deriveInventory({ originalQuantity: 10, currentOnHand: -5 })).toMatchObject({
      currentOnHand: 0,
      unitsSold: 10,
    });
    expect(deriveInventory({ originalQuantity: 10, currentOnHand: 6.7 })).toMatchObject({
      currentOnHand: 6,
      unitsSold: 4,
    });
    expect(
      deriveInventory({ originalQuantity: Number.NaN, currentOnHand: 3 }),
    ).toMatchObject({ originalQuantity: 0, unitsSold: 0 });
  });
});

describe("summarizeInventory", () => {
  const rows = [
    deriveInventory({ originalQuantity: 10, currentOnHand: 6 }),
    deriveInventory({ originalQuantity: 20, currentOnHand: 0 }),
    deriveInventory({ originalQuantity: 8, currentOnHand: 8 }),
    deriveInventory({ originalQuantity: 12, currentOnHand: 2 }),
  ];

  it("totals every column across the rows", () => {
    const totals = summarizeInventory(rows);
    expect(totals.productCount).toBe(4);
    expect(totals.totalOriginal).toBe(50);
    expect(totals.totalOnHand).toBe(16);
    expect(totals.totalUnitsSold).toBe(34);
    expect(totals.totalReplenish).toBe(34);
  });

  it("counts out-of-stock and low-stock products separately", () => {
    const totals = summarizeInventory(rows);
    expect(totals.outOfStockCount).toBe(1); // 20 -> 0
    expect(totals.lowStockCount).toBe(1); // 12 -> 2 (16.7%)
  });

  it("returns zeroed totals for an empty dealer", () => {
    expect(summarizeInventory([])).toMatchObject({
      productCount: 0,
      totalUnitsSold: 0,
      outOfStockCount: 0,
    });
  });
});

describe("isLowStock", () => {
  it("flags stock at or below the threshold ratio", () => {
    expect(isLowStock({ originalQuantity: 10, currentOnHand: 2 })).toBe(true);
    expect(isLowStock({ originalQuantity: 10, currentOnHand: 3 })).toBe(false);
  });

  it("is not low stock when nothing was ever shipped", () => {
    expect(isLowStock({ originalQuantity: 0, currentOnHand: 0 })).toBe(false);
  });
});

describe("sellThroughRate", () => {
  it("expresses units sold as a share of what was shipped", () => {
    expect(sellThroughRate({ originalQuantity: 10, unitsSold: 4 })).toBeCloseTo(0.4);
  });

  it("avoids dividing by zero", () => {
    expect(sellThroughRate({ originalQuantity: 0, unitsSold: 0 })).toBe(0);
  });
});
