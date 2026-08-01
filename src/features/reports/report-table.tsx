import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCell } from "./format";
import type { ReportResult } from "./types";

/**
 * Server-rendered preview of a report result. Numeric columns are right-aligned
 * and tabular so the on-screen table reads like the exported spreadsheet.
 */
export function ReportTable({ report }: { report: ReportResult }) {
  if (report.rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No data for this report"
        description="Try widening your filters or selecting a different report."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {report.columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-4 py-3 font-medium",
                  col.type !== "text" && "text-right",
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {report.columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5",
                    col.type !== "text" && "text-right tabular-nums",
                  )}
                >
                  {formatCell(row[col.key], col.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
