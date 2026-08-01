import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/dal";
import { getDealerOptions } from "@/features/admin/queries";
import { generateReport } from "@/features/reports/report-data";
import { REPORT_DEFINITIONS, isReportId, type ReportId } from "@/features/reports/types";
import { ReportToolbar } from "@/features/reports/report-toolbar";
import { ReportTable } from "@/features/reports/report-table";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePermission("report:view:all");
  const sp = await searchParams;

  const reportId: ReportId =
    sp.report && isReportId(sp.report) ? sp.report : "dealer-sales-summary";

  const [dealers, report] = await Promise.all([
    getDealerOptions(),
    generateReport(reportId, {
      dealerId: sp.dealerId || undefined,
      category: sp.category || undefined,
      weekFrom: sp.weekFrom || undefined,
      weekTo: sp.weekTo || undefined,
    }),
  ]);

  const definition = REPORT_DEFINITIONS.find((d) => d.id === reportId)!;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate, preview, and export the reports that used to be spreadsheets."
      />

      <ReportToolbar reportId={reportId} dealers={dealers} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
          <div>
            <h2 className="text-base font-semibold">{report.title}</h2>
            <p className="text-sm text-muted">{definition.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{report.rows.length} rows</Badge>
            <span className="hidden text-xs text-muted sm:inline">
              Generated {formatDateTime(report.generatedAt)}
            </span>
          </div>
        </div>

        <ReportTable report={report} />
      </Card>
    </>
  );
}
