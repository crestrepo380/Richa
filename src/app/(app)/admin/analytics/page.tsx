import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  Mail,
  Package,
  Percent,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/dal";
import { getDealerOptions } from "@/features/admin/queries";
import {
  getAnalyticsSummary,
  getCategoryBreakdown,
  getDealerDrilldown,
  getDealerLeaderboard,
  getWeeklyTrends,
  type AnalyticsFilters,
} from "@/features/analytics/queries";
import { AnalyticsFilters as FilterBar } from "@/features/analytics/analytics-filters";
import { WeeklySalesChart } from "@/features/admin/charts";
import { CategoryBreakdownChart, SubmissionRateChart } from "@/features/analytics/charts";
import { DealerLeaderboard } from "@/features/analytics/leaderboard";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

function parseFilters(sp: Record<string, string | undefined>): AnalyticsFilters {
  const weeks = Number(sp.weeks);
  return {
    dealerId: sp.dealerId || undefined,
    category: sp.category || undefined,
    weeks: [8, 12, 26].includes(weeks) ? weeks : 8,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("report:view:all");
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const key = JSON.stringify(filters);

  const dealers = await getDealerOptions();

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Trends, category mix, and dealer performance across the selected range."
      />

      <FilterBar dealers={dealers} />

      <Suspense fallback={<SummarySkeleton />} key={`sum-${key}`}>
        <SummarySection filters={filters} />
      </Suspense>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Card className="h-80" />} key={`sales-${key}`}>
          <SalesTrendSection filters={filters} />
        </Suspense>
        <Suspense fallback={<Card className="h-80" />} key={`rate-${key}`}>
          <SubmissionSection filters={filters} />
        </Suspense>
        <Suspense fallback={<Card className="h-80" />} key={`cat-${key}`}>
          <CategorySection filters={filters} />
        </Suspense>
        <Suspense fallback={<Card className="h-80" />} key={`lead-${key}`}>
          <LeaderboardSection filters={filters} />
        </Suspense>
      </div>

      {filters.dealerId && (
        <Suspense fallback={<Card className="mt-4 h-64" />} key={`drill-${key}`}>
          <DrilldownSection dealerId={filters.dealerId} />
        </Suspense>
      )}
    </>
  );
}

async function SummarySection({ filters }: { filters: AnalyticsFilters }) {
  const s = await getAnalyticsSummary(filters);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Units sold" value={s.totalUnitsSold} icon={TrendingUp} tone="success" />
      <StatCard label="Sell-through" value={`${Math.round(s.avgSellThrough * 100)}%`} icon={Percent} tone="brand" />
      <StatCard label="To restock" value={s.totalReplenish} icon={RefreshCw} tone="danger" />
      <StatCard label="Submission rate" value={`${Math.round(s.submissionRate * 100)}%`} icon={Mail} />
      <StatCard label="Out of stock" value={s.outOfStock} icon={Package} tone={s.outOfStock > 0 ? "warning" : "neutral"} />
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="h-24" />
      ))}
    </div>
  );
}

async function SalesTrendSection({ filters }: { filters: AnalyticsFilters }) {
  const data = await getWeeklyTrends(filters);
  return <WeeklySalesChart data={data} />;
}

async function SubmissionSection({ filters }: { filters: AnalyticsFilters }) {
  const data = await getWeeklyTrends(filters);
  return <SubmissionRateChart data={data} />;
}

async function CategorySection({ filters }: { filters: AnalyticsFilters }) {
  const data = await getCategoryBreakdown(filters);
  return <CategoryBreakdownChart data={data} />;
}

async function LeaderboardSection({ filters }: { filters: AnalyticsFilters }) {
  const rows = await getDealerLeaderboard(filters);
  return <DealerLeaderboard rows={rows} />;
}

async function DrilldownSection({ dealerId }: { dealerId: string }) {
  const detail = await getDealerDrilldown(dealerId);
  if (!detail) return null;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-base font-semibold">{detail.dealer.company}</h2>
          <Link
            href={`/admin/dealers/${dealerId}`}
            className="text-sm text-brand underline-offset-4 hover:underline"
          >
            Edit dealer
          </Link>
        </div>
        {detail.topProducts.length === 0 ? (
          <EmptyState icon={Package} title="No products sold yet" />
        ) : (
          <ul className="divide-y divide-line">
            {detail.topProducts.map((p) => (
              <li key={p.sku} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.description}</p>
                  <p className="font-mono text-xs text-muted">{p.sku}</p>
                </div>
                <span className="text-sm font-medium text-success tabular-nums">{p.unitsSold}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="border-b border-line p-4">
          <h2 className="text-base font-semibold">Recent submissions</h2>
        </div>
        <ul className="divide-y divide-line">
          {detail.submissions.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm">{s.week}</span>
              <div className="flex items-center gap-2">
                {s.submittedAt && (
                  <span className="text-xs text-muted">{formatDate(s.submittedAt)}</span>
                )}
                <Badge tone={s.submitted ? "success" : s.status === "OVERDUE" ? "danger" : "warning"}>
                  {s.submitted ? "Submitted" : s.status === "OVERDUE" ? "Overdue" : "Pending"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
