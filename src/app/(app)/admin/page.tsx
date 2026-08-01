import type { Metadata } from "next";
import { Suspense } from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  Store,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { requirePermission } from "@/lib/auth/dal";
import { getCurrentWeekStart, formatWeekRange } from "@/lib/week";
import {
  getDashboardMetrics,
  getDealerActivity,
  getDealerOptions,
  getLowInventoryProducts,
  getMostSoldProducts,
  getWeeklySalesSeries,
  type AdminFilters,
} from "@/features/admin/queries";
import { DashboardFilters } from "@/features/admin/dashboard-filters";
import { MostSoldProductsChart, WeeklySalesChart } from "@/features/admin/charts";
import { DealerActivityCard } from "@/features/admin/dealer-activity-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dealerId?: string; category?: string }>;
}) {
  await requirePermission("inventory:view:all");
  const sp = await searchParams;
  const filters: AdminFilters = {
    dealerId: sp.dealerId || undefined,
    category: sp.category || undefined,
  };
  const weekStart = getCurrentWeekStart();

  const dealers = await getDealerOptions();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Week of ${formatWeekRange(weekStart)}`}
      />

      <DashboardFilters dealers={dealers} />

      {/* Streamed independently so filters feel instant and one slow query
          never blocks the rest of the page. */}
      <Suspense fallback={<MetricsSkeleton />} key={JSON.stringify(filters)}>
        <MetricsSection filters={filters} />
      </Suspense>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Card className="h-80" />} key={`sales-${JSON.stringify(filters)}`}>
          <WeeklySalesSection filters={filters} />
        </Suspense>
        <Suspense fallback={<Card className="h-80" />} key={`sold-${JSON.stringify(filters)}`}>
          <MostSoldSection filters={filters} />
        </Suspense>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Card><TableSkeleton rows={4} /></Card>}>
          <DealerActivitySection />
        </Suspense>
        <Suspense fallback={<Card><TableSkeleton rows={4} /></Card>} key={`low-${JSON.stringify(filters)}`}>
          <LowInventorySection filters={filters} />
        </Suspense>
      </div>
    </>
  );
}

async function MetricsSection({ filters }: { filters: AdminFilters }) {
  const m = await getDashboardMetrics(filters);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Active dealers" value={m.activeDealers} icon={Store} tone="brand" />
      <StatCard label="Reports submitted" value={m.submittedThisWeek} hint="This week" icon={CheckCircle2} tone="success" />
      <StatCard label="Reports pending" value={m.pending} hint="This week" icon={Clock} tone="warning" />
      <StatCard label="Active products" value={m.activeProducts} icon={Package} />
      <StatCard label="Units sold" value={m.unitsSold} hint="Across selection" icon={TrendingUp} tone="success" />
      <StatCard label="Replenishment needed" value={m.replenishNeeded} hint={`${m.outOfStock} out of stock`} icon={RefreshCw} tone="danger" />
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-24" />
      ))}
    </div>
  );
}

async function WeeklySalesSection({ filters }: { filters: AdminFilters }) {
  const data = await getWeeklySalesSeries(8, filters);
  return <WeeklySalesChart data={data} />;
}

async function MostSoldSection({ filters }: { filters: AdminFilters }) {
  const data = await getMostSoldProducts(6, filters);
  return <MostSoldProductsChart data={data} />;
}

async function DealerActivitySection() {
  const rows = await getDealerActivity();
  return <DealerActivityCard rows={rows} />;
}

async function LowInventorySection({ filters }: { filters: AdminFilters }) {
  const rows = await getLowInventoryProducts(6, filters);
  return (
    <Card>
      <div className="border-b border-line p-4">
        <h2 className="text-base font-semibold">Low inventory</h2>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Package} title="Nothing needs restocking" />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.productId} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.description}</p>
                <p className="font-mono text-xs text-muted">{r.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-danger tabular-nums">
                  {r.replenish} to restock
                </p>
                <p className="text-xs text-muted tabular-nums">{r.onHand} on hand</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
