import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireDealer } from "@/lib/auth/dal";
import { getDealerSubmissionHistory } from "@/features/inventory/queries";
import { formatWeekKey, formatWeekRange } from "@/lib/week";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Submissions" };

const STATUS_TONES = {
  SUBMITTED: "success",
  PENDING: "warning",
  OVERDUE: "danger",
} as const;

export default async function DealerHistoryPage() {
  const dealer = await requireDealer();
  const history = await getDealerSubmissionHistory(dealer.dealerId);

  const submitted = history.filter((h) => h.submitted);

  return (
    <>
      <PageHeader
        title="My Submissions"
        description="Your weekly inventory history. Click a week to see the details."
      />

      <Card className="overflow-hidden">
        {submitted.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No submissions yet"
            description="Once you submit your first weekly inventory it will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Week</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Products</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Units sold</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Restock</th>
                  <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((report) => (
                  <tr key={report.id} className="border-t border-line hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dealer/history/${formatWeekKey(report.week)}`}
                        className="font-medium text-brand underline-offset-4 hover:underline"
                      >
                        {formatWeekRange(report.week)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONES[report.status]}>
                        {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{report.productCount}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-medium text-success">
                      {report.unitsSold}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{report.replenishQuantity}</td>
                    <td className="px-4 py-3 text-muted">
                      {report.submittedAt ? formatDate(report.submittedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
