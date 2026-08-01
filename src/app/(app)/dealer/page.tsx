import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireDealer } from "@/lib/auth/dal";
import { getCurrentWeekStart, formatWeekRange } from "@/lib/week";
import { getDealerInventory, getWeeklyReport } from "@/features/inventory/queries";
import { InventoryForm } from "@/features/inventory/inventory-form";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My Inventory" };

export default async function DealerDashboardPage() {
  const dealer = await requireDealer();
  const weekStart = getCurrentWeekStart();

  const [{ rows, totals }, report] = await Promise.all([
    getDealerInventory(dealer.dealerId),
    getWeeklyReport(dealer.dealerId, weekStart),
  ]);

  const submitted = report?.submitted ?? false;

  return (
    <>
      <PageHeader
        title={`Week of ${formatWeekRange(weekStart)}`}
        description={
          submitted && report?.submittedAt
            ? `Submitted ${formatDateTime(report.submittedAt)}`
            : "Tell us how many units you have on hand, then submit."
        }
        actions={
          submitted ? (
            <Badge tone="success">Submitted</Badge>
          ) : (
            <Badge tone="warning">Not submitted yet</Badge>
          )
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Boxes}
            title="No products assigned yet"
            description="Once we ship product to your dealership it will appear here for you to count each week."
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Products to count" value={totals.productCount} />
            <StatCard
              label="Units on hand"
              value={totals.totalOnHand}
              hint={`of ${totals.totalOriginal} received`}
            />
            <StatCard
              label="Units sold"
              value={totals.totalUnitsSold}
              tone="success"
            />
            <StatCard
              label="Out of stock"
              value={totals.outOfStockCount}
              hint={`${totals.lowStockCount} running low`}
              tone={totals.outOfStockCount > 0 ? "danger" : "neutral"}
            />
          </div>

          <div className="mb-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
            You only need to update the{" "}
            <strong className="text-foreground">On hand</strong> number for each
            product. We calculate units sold and how many to restock for you.
          </div>

          <InventoryForm rows={rows} alreadySubmitted={submitted} />
        </>
      )}
    </>
  );
}
