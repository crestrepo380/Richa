/**
 * Core replenishment math.
 *
 * The single most important rule in this product: **dealers never enter sales.**
 * They report only how many units they currently have on hand, and everything
 * else is derived here. Keeping the derivation in one pure, dependency-free
 * module means the API routes, the import pipeline, the reports, and the tests
 * all agree on the numbers by construction.
 *
 *   originalQuantity  10   (what we shipped them)
 *   currentOnHand      6   (what the dealer counted)
 *   -> unitsSold       4
 *   -> replenish       4   (restock back up to the original level)
 */

export interface InventoryCounts {
  originalQuantity: number;
  currentOnHand: number;
}

export interface DerivedInventory {
  originalQuantity: number;
  currentOnHand: number;
  unitsSold: number;
  replenishQuantity: number;
}

/**
 * Derives sold + replenishment figures from a pair of counts.
 *
 * `unitsSold` is clamped at zero: a dealer reporting more on hand than we
 * shipped means they received stock from elsewhere or miscounted, and negative
 * sales would silently corrupt every downstream total. Replenishment restores
 * the dealer to their original shipped level, which is the business's standing
 * policy for these consignment-style placements.
 */
export function deriveInventory({
  originalQuantity,
  currentOnHand,
}: InventoryCounts): DerivedInventory {
  const original = normalizeCount(originalQuantity);
  const onHand = normalizeCount(currentOnHand);

  const unitsSold = Math.max(0, original - onHand);
  const replenishQuantity = unitsSold;

  return {
    originalQuantity: original,
    currentOnHand: onHand,
    unitsSold,
    replenishQuantity,
  };
}

/** Non-negative integer, defaulting to 0 for anything unusable. */
function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export interface InventoryTotals {
  productCount: number;
  totalOriginal: number;
  totalOnHand: number;
  totalUnitsSold: number;
  totalReplenish: number;
  /** Products with zero units left — the urgent restock list. */
  outOfStockCount: number;
  /** Products at or below the low-stock threshold but not yet at zero. */
  lowStockCount: number;
}

export const LOW_STOCK_RATIO = 0.25;

/**
 * Aggregates a dealer's (or the whole system's) inventory rows into the
 * headline numbers shown on dashboards and in reports.
 */
export function summarizeInventory(
  rows: readonly DerivedInventory[],
  lowStockRatio = LOW_STOCK_RATIO,
): InventoryTotals {
  return rows.reduce<InventoryTotals>(
    (acc, row) => {
      acc.productCount += 1;
      acc.totalOriginal += row.originalQuantity;
      acc.totalOnHand += row.currentOnHand;
      acc.totalUnitsSold += row.unitsSold;
      acc.totalReplenish += row.replenishQuantity;

      if (row.currentOnHand === 0) {
        acc.outOfStockCount += 1;
      } else if (isLowStock(row, lowStockRatio)) {
        acc.lowStockCount += 1;
      }

      return acc;
    },
    {
      productCount: 0,
      totalOriginal: 0,
      totalOnHand: 0,
      totalUnitsSold: 0,
      totalReplenish: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
    },
  );
}

export function isLowStock(
  row: Pick<DerivedInventory, "originalQuantity" | "currentOnHand">,
  ratio = LOW_STOCK_RATIO,
): boolean {
  if (row.originalQuantity <= 0) return false;
  return row.currentOnHand / row.originalQuantity <= ratio;
}

/** Percentage of the originally shipped quantity that has sold through. */
export function sellThroughRate(
  row: Pick<DerivedInventory, "originalQuantity" | "unitsSold">,
): number {
  if (row.originalQuantity <= 0) return 0;
  return row.unitsSold / row.originalQuantity;
}
