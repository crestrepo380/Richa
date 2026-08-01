import "server-only";

import { prisma } from "@/lib/db";
import {
  deriveInventory,
  isLowStock,
  summarizeInventory,
  type DerivedInventory,
} from "@/lib/business/inventory";

/**
 * Read helpers for dealer inventory. Kept separate from the mutation actions so
 * Server Components can import them without pulling in `"use server"` exports.
 */

export interface InventoryRow extends DerivedInventory {
  inventoryId: string;
  sku: string;
  productNumber: string;
  description: string;
  color: string | null;
  size: string | null;
  category: string;
  imageUrl: string | null;
  lowStock: boolean;
  updatedAt: Date;
}

/**
 * A dealer's live inventory, product details joined in, ordered for a stable,
 * scannable list. Returns the rows plus the headline totals so the page does
 * not have to recompute them.
 */
export async function getDealerInventory(dealerId: string) {
  const records = await prisma.dealerInventory.findMany({
    where: { dealerId },
    orderBy: [
      { product: { description: "asc" } },
      { product: { size: "asc" } },
    ],
    select: {
      id: true,
      originalQuantity: true,
      currentOnHand: true,
      unitsSold: true,
      replenishQuantity: true,
      updatedAt: true,
      product: {
        select: {
          sku: true,
          productNumber: true,
          description: true,
          color: true,
          size: true,
          category: true,
          imageUrl: true,
        },
      },
    },
  });

  const rows: InventoryRow[] = records.map((r) => {
    // Re-derive from the stored counts rather than trusting the stored
    // unitsSold/replenish columns, so the display can never drift from the rule.
    const derived = deriveInventory({
      originalQuantity: r.originalQuantity,
      currentOnHand: r.currentOnHand,
    });

    return {
      inventoryId: r.id,
      ...derived,
      sku: r.product.sku,
      productNumber: r.product.productNumber,
      description: r.product.description,
      color: r.product.color,
      size: r.product.size,
      category: r.product.category,
      imageUrl: r.product.imageUrl,
      lowStock: isLowStock(derived),
      updatedAt: r.updatedAt,
    };
  });

  return { rows, totals: summarizeInventory(rows) };
}

/** The dealer's report row for a given week, if it exists. */
export async function getWeeklyReport(dealerId: string, week: Date) {
  return prisma.weeklyReport.findUnique({
    where: { dealerId_week: { dealerId, week } },
    select: {
      id: true,
      status: true,
      submitted: true,
      submittedAt: true,
    },
  });
}

/** Past submissions for the dealer, newest first, with per-report totals. */
export async function getDealerSubmissionHistory(dealerId: string, take = 26) {
  const reports = await prisma.weeklyReport.findMany({
    where: { dealerId },
    orderBy: { week: "desc" },
    take,
    select: {
      id: true,
      week: true,
      status: true,
      submitted: true,
      submittedAt: true,
      lines: {
        select: { unitsSold: true, replenishQuantity: true, currentOnHand: true },
      },
    },
  });

  return reports.map((report) => {
    const totals = report.lines.reduce(
      (acc, line) => {
        acc.unitsSold += line.unitsSold;
        acc.replenishQuantity += line.replenishQuantity;
        acc.onHand += line.currentOnHand;
        return acc;
      },
      { unitsSold: 0, replenishQuantity: 0, onHand: 0 },
    );

    return {
      id: report.id,
      week: report.week,
      status: report.status,
      submitted: report.submitted,
      submittedAt: report.submittedAt,
      productCount: report.lines.length,
      ...totals,
    };
  });
}

/** A single past submission with its immutable line snapshot. */
export async function getSubmissionDetail(dealerId: string, week: Date) {
  const report = await prisma.weeklyReport.findUnique({
    where: { dealerId_week: { dealerId, week } },
    select: {
      id: true,
      week: true,
      status: true,
      submitted: true,
      submittedAt: true,
      lines: {
        orderBy: { product: { description: "asc" } },
        select: {
          id: true,
          originalQuantity: true,
          currentOnHand: true,
          unitsSold: true,
          replenishQuantity: true,
          product: {
            select: {
              sku: true,
              description: true,
              color: true,
              size: true,
            },
          },
        },
      },
    },
  });

  return report;
}
