import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireDealer } from "@/lib/auth/dal";
import { getSubmissionDetail } from "@/features/inventory/queries";
import { formatWeekRange, parseWeekKey } from "@/lib/week";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Submission detail" };

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const dealer = await requireDealer();
  const { week: weekKey } = await params;

  let week: Date;
  try {
    week = parseWeekKey(weekKey);
  } catch {
    notFound();
  }

  const report = await getSubmissionDetail(dealer.dealerId, week);
  if (!report) notFound();

  return (
    <>
      <Link
        href="/dealer/history"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to submissions
      </Link>

      <PageHeader
        title={`Week of ${formatWeekRange(report.week)}`}
        description={
          report.submittedAt
            ? `Submitted ${formatDateTime(report.submittedAt)}`
            : undefined
        }
        actions={
          <Badge tone={report.submitted ? "success" : "warning"}>
            {report.submitted ? "Submitted" : "Pending"}
          </Badge>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Received</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">On hand</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Sold</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Restock</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr key={line.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.product.description}</p>
                    <p className="text-xs text-muted">
                      {[line.product.color, line.product.size]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{line.product.sku}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{line.originalQuantity}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{line.currentOnHand}</td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium text-success">
                    {line.unitsSold}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium">
                    {line.replenishQuantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
