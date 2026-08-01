import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/roles";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import { generateReport } from "@/features/reports/report-data";
import {
  EXPORT_CONTENT_TYPES,
  exportFilename,
  toCsv,
  toXlsx,
  type ExportFormat,
} from "@/features/reports/export";
import { isReportId } from "@/features/reports/types";

/**
 * Report export endpoint.
 *
 * Server Actions can't stream a file download, so this is a Route Handler — but
 * it re-runs every guard the rest of the app does: authenticate, check the
 * `report:export` permission, rate-limit, and audit. It never trusts the
 * requester's role from anything but the verified session.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasPermission(user.role, "report:export")) {
    return new Response("Forbidden", { status: 403 });
  }

  const rate = checkRateLimit(
    `export:${user.id}`,
    RATE_LIMITS.export.limit,
    RATE_LIMITS.export.windowMs,
  );
  if (!rate.success) {
    return new Response("Too many exports. Please wait a moment.", {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const { searchParams } = request.nextUrl;
  const reportId = searchParams.get("report") ?? "";
  const format = (searchParams.get("format") ?? "xlsx") as ExportFormat;

  if (!isReportId(reportId)) {
    return new Response("Unknown report", { status: 400 });
  }
  if (format !== "xlsx" && format !== "csv") {
    return new Response("Unsupported format", { status: 400 });
  }

  const report = await generateReport(reportId, {
    dealerId: searchParams.get("dealerId") || undefined,
    category: searchParams.get("category") || undefined,
    weekFrom: searchParams.get("weekFrom") || undefined,
    weekTo: searchParams.get("weekTo") || undefined,
  });

  await recordAudit({
    userId: user.id,
    action: AUDIT_ACTIONS.reportExported,
    metadata: { report: reportId, format, rows: report.rows.length },
  });

  const body = format === "xlsx" ? await toXlsx(report) : toCsv(report);
  const filename = exportFilename(report, format);

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": EXPORT_CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
