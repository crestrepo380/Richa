import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { recentWeekStarts, formatWeekKey, formatWeekRange } from "@/lib/week";
import { categoryLabel } from "@/lib/constants";
import { sellThroughRate } from "@/lib/business/inventory";

/**
 * Analytics read layer. Deeper, trend-oriented queries that back the Analytics
 * page. Like the dashboard queries, everything aggregates in Postgres.
 *
 * A note on the sales trend queries: `WeeklyReportLine` rows are the immutable
 * snapshot taken at submission time, so trends built from them are historically
 * accurate even as live inventory changes week to week — unlike aggregating the
 * mutable `DealerInventory` table, which only reflects "now".
 */

export interface AnalyticsFilters {
  dealerId?: string;
  category?: string;
  weeks: number;
}

function lineWhere(filters: AnalyticsFilters, earliest: Date): Prisma.WeeklyReportLineWhereInput {
  return {
    weeklyReport: {
      week: { gte: earliest },
      submitted: true,
      ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
    },
    ...(filters.category ? { product: { category: filters.category as never } } : {}),
  };
}

export interface WeeklyTrendPoint {
  week: string;
  label: string;
  unitsSold: number;
  replenish: number;
  submissions: number;
  submissionRate: number;
}

/**
 * Per-week trend: units sold + restock (from snapshots) and submission rate.
 * Weeks with no activity are included as zeroes so the axis is continuous.
 */
export async function getWeeklyTrends(filters: AnalyticsFilters): Promise<WeeklyTrendPoint[]> {
  const starts = recentWeekStarts(filters.weeks).reverse();
  const earliest = starts[0];

  const [lineGroups, reports, activeDealers] = await Promise.all([
    prisma.weeklyReportLine.groupBy({
      by: ["weeklyReportId"],
      where: lineWhere(filters, earliest),
      _sum: { unitsSold: true, replenishQuantity: true },
    }),
    prisma.weeklyReport.findMany({
      where: {
        week: { gte: earliest },
        submitted: true,
        ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      },
      select: { id: true, week: true },
    }),
    filters.dealerId
      ? Promise.resolve(1)
      : prisma.dealer.count({ where: { active: true } }),
  ]);

  const weekByReport = new Map(reports.map((r) => [r.id, formatWeekKey(r.week)]));

  const buckets = new Map<string, { unitsSold: number; replenish: number; submissions: number }>();
  for (const start of starts) {
    buckets.set(formatWeekKey(start), { unitsSold: 0, replenish: 0, submissions: 0 });
  }
  for (const r of reports) {
    const key = formatWeekKey(r.week);
    if (buckets.has(key)) buckets.get(key)!.submissions += 1;
  }
  for (const g of lineGroups) {
    const key = weekByReport.get(g.weeklyReportId);
    if (!key || !buckets.has(key)) continue;
    const bucket = buckets.get(key)!;
    bucket.unitsSold += g._sum.unitsSold ?? 0;
    bucket.replenish += g._sum.replenishQuantity ?? 0;
  }

  const denominator = Math.max(1, activeDealers);
  return starts.map((start) => {
    const key = formatWeekKey(start);
    const b = buckets.get(key)!;
    return {
      week: key,
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      unitsSold: b.unitsSold,
      replenish: b.replenish,
      submissions: b.submissions,
      submissionRate: Math.min(1, b.submissions / denominator),
    };
  });
}

export interface CategoryDatum {
  category: string;
  label: string;
  unitsSold: number;
}

/** Units sold by product category (magnitude comparison — single-hue bar). */
export async function getCategoryBreakdown(filters: AnalyticsFilters): Promise<CategoryDatum[]> {
  const rows = await prisma.dealerInventory.findMany({
    where: {
      ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
      ...(filters.category ? { product: { category: filters.category as never } } : {}),
    },
    select: { unitsSold: true, product: { select: { category: true } } },
  });

  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.product.category, (totals.get(row.product.category) ?? 0) + row.unitsSold);
  }

  return [...totals.entries()]
    .map(([category, unitsSold]) => ({ category, label: categoryLabel(category), unitsSold }))
    .filter((d) => d.unitsSold > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold);
}

export interface LeaderboardRow {
  dealerId: string;
  company: string;
  unitsSold: number;
  received: number;
  sellThrough: number;
}

/** Top dealers by units sold, with sell-through. */
export async function getDealerLeaderboard(filters: AnalyticsFilters, limit = 8): Promise<LeaderboardRow[]> {
  const grouped = await prisma.dealerInventory.groupBy({
    by: ["dealerId"],
    where: filters.category ? { product: { category: filters.category as never } } : {},
    _sum: { unitsSold: true, originalQuantity: true },
    orderBy: { _sum: { unitsSold: "desc" } },
    take: limit,
  });

  const dealers = await prisma.dealer.findMany({
    where: { id: { in: grouped.map((g) => g.dealerId) } },
    select: { id: true, company: true },
  });
  const byId = new Map(dealers.map((d) => [d.id, d.company]));

  return grouped
    .map((g) => {
      const received = g._sum.originalQuantity ?? 0;
      const unitsSold = g._sum.unitsSold ?? 0;
      return {
        dealerId: g.dealerId,
        company: byId.get(g.dealerId) ?? "Unknown",
        unitsSold,
        received,
        sellThrough: sellThroughRate({ originalQuantity: received, unitsSold }),
      };
    })
    .filter((r) => r.unitsSold > 0);
}

export interface AnalyticsSummary {
  totalUnitsSold: number;
  totalReplenish: number;
  avgSellThrough: number;
  submissionRate: number;
  outOfStock: number;
}

/** Headline KPIs for the current selection. */
export async function getAnalyticsSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary> {
  const invWhere: Prisma.DealerInventoryWhereInput = {
    ...(filters.dealerId ? { dealerId: filters.dealerId } : {}),
    ...(filters.category ? { product: { category: filters.category as never } } : {}),
  };

  const [agg, outOfStock, trends] = await Promise.all([
    prisma.dealerInventory.aggregate({
      where: invWhere,
      _sum: { unitsSold: true, replenishQuantity: true, originalQuantity: true },
    }),
    prisma.dealerInventory.count({ where: { ...invWhere, currentOnHand: 0 } }),
    getWeeklyTrends(filters),
  ]);

  const sold = agg._sum.unitsSold ?? 0;
  const received = agg._sum.originalQuantity ?? 0;

  // Average submission rate across the visible weeks that had any activity.
  const active = trends.filter((t) => t.submissions > 0);
  const submissionRate =
    active.length > 0
      ? active.reduce((s, t) => s + t.submissionRate, 0) / active.length
      : 0;

  return {
    totalUnitsSold: sold,
    totalReplenish: agg._sum.replenishQuantity ?? 0,
    avgSellThrough: sellThroughRate({ originalQuantity: received, unitsSold: sold }),
    submissionRate,
    outOfStock,
  };
}

/** Per-dealer drill-down detail shown when a single dealer is selected. */
export async function getDealerDrilldown(dealerId: string) {
  const [dealer, topProducts, submissions] = await Promise.all([
    prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { company: true, contactName: true, email: true },
    }),
    prisma.dealerInventory.findMany({
      where: { dealerId, unitsSold: { gt: 0 } },
      orderBy: { unitsSold: "desc" },
      take: 6,
      select: { unitsSold: true, product: { select: { description: true, sku: true } } },
    }),
    prisma.weeklyReport.findMany({
      where: { dealerId },
      orderBy: { week: "desc" },
      take: 12,
      select: { week: true, submitted: true, status: true, submittedAt: true },
    }),
  ]);

  if (!dealer) return null;

  return {
    dealer,
    topProducts: topProducts.map((p) => ({
      description: p.product.description,
      sku: p.product.sku,
      unitsSold: p.unitsSold,
    })),
    submissions: submissions.map((s) => ({
      week: formatWeekRange(s.week),
      submitted: s.submitted,
      status: s.status,
      submittedAt: s.submittedAt,
    })),
  };
}
