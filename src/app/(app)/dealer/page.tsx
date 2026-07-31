import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireDealer } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getCurrentWeekStart, formatWeekRange } from "@/lib/week";

export const metadata: Metadata = { title: "My Inventory" };

export default async function DealerDashboardPage() {
  const user = await requireDealer();
  const weekStart = getCurrentWeekStart();

  const [productCount, thisWeekReport] = await Promise.all([
    prisma.dealerInventory.count({ where: { dealerId: user.dealerId } }),
    prisma.weeklyReport.findUnique({
      where: { dealerId_week: { dealerId: user.dealerId, week: weekStart } },
      select: { submitted: true, submittedAt: true },
    }),
  ]);

  const submitted = thisWeekReport?.submitted ?? false;

  return (
    <>
      <PageHeader
        title={`Week of ${formatWeekRange(weekStart)}`}
        description={user.dealerName ?? undefined}
        actions={
          submitted ? (
            <Badge tone="success">Submitted</Badge>
          ) : (
            <Badge tone="warning">Not submitted yet</Badge>
          )
        }
      />

      <Card>
        {productCount === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products assigned yet"
            description="Once we ship product to your dealership it will appear here for you to count each week."
          />
        ) : (
          <CardContent className="space-y-2">
            <p className="text-sm">
              You have{" "}
              <strong>
                {productCount} product{productCount === 1 ? "" : "s"}
              </strong>{" "}
              to count this week.
            </p>
            <p className="text-sm text-muted">
              The weekly count form arrives in Phase 2. You will enter only how
              many units you currently have on hand — units sold and
              replenishment are calculated for you.
            </p>
          </CardContent>
        )}
      </Card>
    </>
  );
}
