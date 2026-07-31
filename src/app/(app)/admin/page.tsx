import type { Metadata } from "next";
import { CheckCircle2, Clock, Package, RefreshCw, Store, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getCurrentWeekStart, formatWeekRange } from "@/lib/week";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requirePermission("inventory:view:all");
  const weekStart = getCurrentWeekStart();

  // One round trip per metric, issued in parallel. Aggregates run in Postgres
  // rather than pulling rows into the app to sum them.
  const [activeDealers, productCount, submittedCount, totals] = await Promise.all([
    prisma.dealer.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true } }),
    prisma.weeklyReport.count({ where: { week: weekStart, submitted: true } }),
    prisma.dealerInventory.aggregate({
      _sum: { unitsSold: true, replenishQuantity: true },
    }),
  ]);

  const pendingCount = Math.max(0, activeDealers - submittedCount);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Week of ${formatWeekRange(weekStart)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active dealers" value={activeDealers} icon={Store} tone="brand" />
        <StatCard
          label="Reports submitted"
          value={submittedCount}
          hint="This week"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Reports pending"
          value={pendingCount}
          hint="This week"
          icon={Clock}
          tone="warning"
        />
        <StatCard label="Active products" value={productCount} icon={Package} />
        <StatCard
          label="Units sold"
          value={totals._sum.unitsSold ?? 0}
          hint="Across all dealers"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Replenishment needed"
          value={totals._sum.replenishQuantity ?? 0}
          hint="Units to restock"
          icon={RefreshCw}
          tone="danger"
        />
      </div>

      <Card className="mt-6">
        <CardContent>
          <p className="text-sm text-muted">
            Charts, filters, and the overdue dealer list arrive in Phase 3.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
