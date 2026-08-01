import "server-only";

import { prisma } from "@/lib/db";
import { getCurrentWeekStart, recentWeekStarts, formatWeekKey } from "@/lib/week";
import type { Prisma } from "@prisma/client";

/**
 * Admin read layer: the dashboard headline numbers, chart series, and the
 * overdue-dealer list. Every aggregate runs in Postgres; nothing pulls whole
 * tables into the app to sum them.
 */

export interface AdminFilters {
  dealerId?: string;
  category?: string;
}

/** Turns UI filters into a reusable inventory `where` clause. */
function inventoryWhere(filters: AdminFilters): Prisma.DealerInventoryWhereInput {
  return {
    ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
    ...(filters.category
      ? { product: { category: filters.category as never } }
      : {}),
  };
}

export async function getDashboardMetrics(filters: AdminFilters = {}) {
  const week = getCurrentWeekStart();
  const invWhere = inventoryWhere(filters);

  const [
    activeDealers,
    activeProducts,
    submittedThisWeek,
    invTotals,
    lowStockRows,
  ] = await Promise.all([
    prisma.dealer.count({
      where: { active: true, ...(filters.dealerId ? { id: filters.dealerId } : {}) },
    }),
    prisma.product.count({ where: { active: true } }),
    prisma.weeklyReport.count({
      where: {
        week,
        submitted: true,
        ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      },
    }),
    prisma.dealerInventory.aggregate({
      where: invWhere,
      _sum: { unitsSold: true, replenishQuantity: true, currentOnHand: true },
    }),
    // Out-of-stock is counted in SQL rather than fetched.
    prisma.dealerInventory.count({
      where: { ...invWhere, currentOnHand: 0 },
    }),
  ]);

  const pending = Math.max(0, activeDealers - submittedThisWeek);

  return {
    activeDealers,
    activeProducts,
    submittedThisWeek,
    pending,
    unitsSold: invTotals._sum.unitsSold ?? 0,
    replenishNeeded: invTotals._sum.replenishQuantity ?? 0,
    unitsOnHand: invTotals._sum.currentOnHand ?? 0,
    outOfStock: lowStockRows,
  };
}

/** Units sold per week for the last `weeks` weeks (oldest → newest for the axis). */
export async function getWeeklySalesSeries(weeks = 8, filters: AdminFilters = {}) {
  const starts = recentWeekStarts(weeks).reverse();
  const earliest = starts[0];

  const rows = await prisma.weeklyReportLine.groupBy({
    by: ["weeklyReportId"],
    where: {
      weeklyReport: {
        week: { gte: earliest },
        ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      },
      ...(filters.category ? { product: { category: filters.category as never } } : {}),
    },
    _sum: { unitsSold: true, replenishQuantity: true },
  });

  // groupBy can't group by the report's week directly, so map report → week.
  const reports = await prisma.weeklyReport.findMany({
    where: { id: { in: rows.map((r) => r.weeklyReportId) } },
    select: { id: true, week: true },
  });
  const weekById = new Map(reports.map((r) => [r.id, formatWeekKey(r.week)]));

  const byWeek = new Map<string, { unitsSold: number; replenish: number }>();
  for (const start of starts) {
    byWeek.set(formatWeekKey(start), { unitsSold: 0, replenish: 0 });
  }
  for (const row of rows) {
    const key = weekById.get(row.weeklyReportId);
    if (!key || !byWeek.has(key)) continue;
    const bucket = byWeek.get(key)!;
    bucket.unitsSold += row._sum.unitsSold ?? 0;
    bucket.replenish += row._sum.replenishQuantity ?? 0;
  }

  return starts.map((start) => {
    const key = formatWeekKey(start);
    const bucket = byWeek.get(key)!;
    return {
      week: key,
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      unitsSold: bucket.unitsSold,
      replenish: bucket.replenish,
    };
  });
}

/** Top products by lifetime units sold. */
export async function getMostSoldProducts(limit = 6, filters: AdminFilters = {}) {
  const grouped = await prisma.dealerInventory.groupBy({
    by: ["productId"],
    where: inventoryWhere(filters),
    _sum: { unitsSold: true },
    orderBy: { _sum: { unitsSold: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, description: true, sku: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return grouped
    .map((g) => ({
      productId: g.productId,
      description: byId.get(g.productId)?.description ?? "Unknown",
      sku: byId.get(g.productId)?.sku ?? "",
      unitsSold: g._sum.unitsSold ?? 0,
    }))
    .filter((p) => p.unitsSold > 0);
}

/** Products with the least stock remaining (restock priority). */
export async function getLowInventoryProducts(limit = 6, filters: AdminFilters = {}) {
  const grouped = await prisma.dealerInventory.groupBy({
    by: ["productId"],
    where: inventoryWhere(filters),
    _sum: { replenishQuantity: true, currentOnHand: true },
    orderBy: { _sum: { replenishQuantity: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, description: true, sku: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return grouped
    .map((g) => ({
      productId: g.productId,
      description: byId.get(g.productId)?.description ?? "Unknown",
      sku: byId.get(g.productId)?.sku ?? "",
      replenish: g._sum.replenishQuantity ?? 0,
      onHand: g._sum.currentOnHand ?? 0,
    }))
    .filter((p) => p.replenish > 0);
}

export type DealerActivityStatus = "SUBMITTED" | "PENDING" | "OVERDUE";

/**
 * Every active dealer's status for the current week, with the reminder-driven
 * overdue flag surfaced first. "Overdue" mirrors the report row the reminder
 * job maintains (Phase 4); a dealer with no row yet is simply pending.
 */
export async function getDealerActivity() {
  const week = getCurrentWeekStart();

  const dealers = await prisma.dealer.findMany({
    where: { active: true },
    orderBy: { company: "asc" },
    select: {
      id: true,
      company: true,
      contactName: true,
      email: true,
      weeklyReports: {
        where: { week },
        select: { status: true, submitted: true, submittedAt: true, reminderCount: true },
      },
    },
  });

  return dealers.map((d) => {
    const report = d.weeklyReports[0];
    const status: DealerActivityStatus = report?.submitted
      ? "SUBMITTED"
      : report?.status === "OVERDUE"
        ? "OVERDUE"
        : "PENDING";

    return {
      id: d.id,
      company: d.company,
      contactName: d.contactName,
      email: d.email,
      status,
      submittedAt: report?.submittedAt ?? null,
      reminderCount: report?.reminderCount ?? 0,
    };
  });
}

/** Lightweight dealer list for filter dropdowns. */
export async function getDealerOptions() {
  return prisma.dealer.findMany({
    where: { active: true },
    orderBy: { company: "asc" },
    select: { id: true, company: true },
  });
}
