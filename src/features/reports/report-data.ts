import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { sellThroughRate } from "@/lib/business/inventory";
import { formatWeekRange, parseWeekKey } from "@/lib/week";
import { categoryLabel } from "@/lib/constants";
import type {
  ReportFilters,
  ReportId,
  ReportResult,
  ReportRow,
} from "./types";
import { REPORT_DEFINITIONS } from "./types";

/**
 * Report data producers. Each returns typed columns + rows so the same result
 * feeds the preview table and every export format unchanged. All aggregation
 * happens in Postgres.
 */

function inventoryWhere(filters: ReportFilters): Prisma.DealerInventoryWhereInput {
  return {
    ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
    ...(filters.category ? { product: { category: filters.category as never } } : {}),
  };
}

function titleFor(id: ReportId): string {
  return REPORT_DEFINITIONS.find((d) => d.id === id)!.title;
}

export async function generateReport(
  id: ReportId,
  filters: ReportFilters = {},
): Promise<ReportResult> {
  const generatedAt = new Date();
  const base = { id, title: titleFor(id), generatedAt };

  switch (id) {
    case "dealer-sales-summary":
      return { ...base, ...(await dealerSalesSummary(filters)) };
    case "weekly-replenishment":
      return { ...base, ...(await weeklyReplenishment(filters)) };
    case "inventory-history":
      return { ...base, ...(await inventoryHistory(filters)) };
    case "dealer-performance":
      return { ...base, ...(await dealerPerformance(filters)) };
  }
}

async function dealerSalesSummary(filters: ReportFilters) {
  const grouped = await prisma.dealerInventory.groupBy({
    by: ["dealerId"],
    where: inventoryWhere(filters),
    _sum: {
      originalQuantity: true,
      currentOnHand: true,
      unitsSold: true,
      replenishQuantity: true,
    },
    _count: { _all: true },
  });

  const dealers = await prisma.dealer.findMany({
    where: { id: { in: grouped.map((g) => g.dealerId) } },
    select: { id: true, company: true, contactName: true },
  });
  const byId = new Map(dealers.map((d) => [d.id, d]));

  const rows: ReportRow[] = grouped
    .map((g) => {
      const dealer = byId.get(g.dealerId);
      const original = g._sum.originalQuantity ?? 0;
      const sold = g._sum.unitsSold ?? 0;
      return {
        Dealer: dealer?.company ?? "Unknown",
        Contact: dealer?.contactName ?? "",
        Products: g._count._all,
        Received: original,
        "On hand": g._sum.currentOnHand ?? 0,
        "Units sold": sold,
        "To restock": g._sum.replenishQuantity ?? 0,
        "Sell-through": original > 0 ? sold / original : 0,
      };
    })
    .sort((a, b) => (b["Units sold"] as number) - (a["Units sold"] as number));

  return {
    columns: [
      { key: "Dealer", label: "Dealer", type: "text" as const },
      { key: "Contact", label: "Contact", type: "text" as const },
      { key: "Products", label: "Products", type: "number" as const },
      { key: "Received", label: "Received", type: "number" as const },
      { key: "On hand", label: "On hand", type: "number" as const },
      { key: "Units sold", label: "Units sold", type: "number" as const },
      { key: "To restock", label: "To restock", type: "number" as const },
      { key: "Sell-through", label: "Sell-through", type: "percent" as const },
    ],
    rows,
  };
}

async function weeklyReplenishment(filters: ReportFilters) {
  const records = await prisma.dealerInventory.findMany({
    where: { ...inventoryWhere(filters), replenishQuantity: { gt: 0 } },
    orderBy: [{ dealer: { company: "asc" } }, { replenishQuantity: "desc" }],
    select: {
      replenishQuantity: true,
      currentOnHand: true,
      originalQuantity: true,
      dealer: { select: { company: true } },
      product: {
        select: { sku: true, description: true, color: true, size: true, category: true },
      },
    },
  });

  const rows: ReportRow[] = records.map((r) => ({
    Dealer: r.dealer.company,
    SKU: r.product.sku,
    Product: r.product.description,
    Color: r.product.color ?? "",
    Size: r.product.size ?? "",
    Category: categoryLabel(r.product.category),
    "On hand": r.currentOnHand,
    "Restock qty": r.replenishQuantity,
  }));

  return {
    columns: [
      { key: "Dealer", label: "Dealer", type: "text" as const },
      { key: "SKU", label: "SKU", type: "text" as const },
      { key: "Product", label: "Product", type: "text" as const },
      { key: "Color", label: "Color", type: "text" as const },
      { key: "Size", label: "Size", type: "text" as const },
      { key: "Category", label: "Category", type: "text" as const },
      { key: "On hand", label: "On hand", type: "number" as const },
      { key: "Restock qty", label: "Restock qty", type: "number" as const },
    ],
    rows,
  };
}

async function inventoryHistory(filters: ReportFilters) {
  const weekFilter: Prisma.WeeklyReportWhereInput = {};
  if (filters.weekFrom) weekFilter.week = { gte: parseWeekKey(filters.weekFrom) };
  if (filters.weekTo) {
    weekFilter.week = { ...(weekFilter.week as object), lte: parseWeekKey(filters.weekTo) };
  }

  const reports = await prisma.weeklyReport.findMany({
    where: {
      submitted: true,
      ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      ...weekFilter,
    },
    orderBy: [{ week: "desc" }, { dealer: { company: "asc" } }],
    select: {
      week: true,
      submittedAt: true,
      dealer: { select: { company: true } },
      lines: {
        where: filters.category ? { product: { category: filters.category as never } } : undefined,
        select: { unitsSold: true, replenishQuantity: true, currentOnHand: true, originalQuantity: true },
      },
    },
  });

  const rows: ReportRow[] = reports.map((report) => {
    const totals = report.lines.reduce(
      (acc, l) => {
        acc.received += l.originalQuantity;
        acc.onHand += l.currentOnHand;
        acc.sold += l.unitsSold;
        acc.restock += l.replenishQuantity;
        return acc;
      },
      { received: 0, onHand: 0, sold: 0, restock: 0 },
    );

    return {
      Week: formatWeekRange(report.week),
      Dealer: report.dealer.company,
      Submitted: report.submittedAt,
      Products: report.lines.length,
      Received: totals.received,
      "On hand": totals.onHand,
      "Units sold": totals.sold,
      "To restock": totals.restock,
    };
  });

  return {
    columns: [
      { key: "Week", label: "Week", type: "text" as const },
      { key: "Dealer", label: "Dealer", type: "text" as const },
      { key: "Submitted", label: "Submitted", type: "date" as const },
      { key: "Products", label: "Products", type: "number" as const },
      { key: "Received", label: "Received", type: "number" as const },
      { key: "On hand", label: "On hand", type: "number" as const },
      { key: "Units sold", label: "Units sold", type: "number" as const },
      { key: "To restock", label: "To restock", type: "number" as const },
    ],
    rows,
  };
}

async function dealerPerformance(filters: ReportFilters) {
  const dealers = await prisma.dealer.findMany({
    where: { active: true, ...(filters.dealerId ? { id: filters.dealerId } : {}) },
    orderBy: { company: "asc" },
    select: {
      id: true,
      company: true,
      weeklyReports: { select: { submitted: true } },
      inventory: {
        where: filters.category ? { product: { category: filters.category as never } } : undefined,
        select: { originalQuantity: true, unitsSold: true },
      },
    },
  });

  const rows: ReportRow[] = dealers.map((d) => {
    const totalReports = d.weeklyReports.length;
    const submitted = d.weeklyReports.filter((r) => r.submitted).length;
    const original = d.inventory.reduce((s, i) => s + i.originalQuantity, 0);
    const sold = d.inventory.reduce((s, i) => s + i.unitsSold, 0);

    return {
      Dealer: d.company,
      "Weeks tracked": totalReports,
      "Weeks submitted": submitted,
      "Submission rate": totalReports > 0 ? submitted / totalReports : 0,
      "Units sold": sold,
      "Sell-through": sellThroughRate({ originalQuantity: original, unitsSold: sold }),
    };
  });

  return {
    columns: [
      { key: "Dealer", label: "Dealer", type: "text" as const },
      { key: "Weeks tracked", label: "Weeks tracked", type: "number" as const },
      { key: "Weeks submitted", label: "Weeks submitted", type: "number" as const },
      { key: "Submission rate", label: "Submission rate", type: "percent" as const },
      { key: "Units sold", label: "Units sold", type: "number" as const },
      { key: "Sell-through", label: "Sell-through", type: "percent" as const },
    ],
    rows,
  };
}
