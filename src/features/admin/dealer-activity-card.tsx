import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import type { DealerActivityStatus } from "./queries";

interface ActivityRow {
  id: string;
  company: string;
  contactName: string;
  status: DealerActivityStatus;
  submittedAt: Date | null;
  reminderCount: number;
}

const STATUS_META: Record<
  DealerActivityStatus,
  {
    tone: "success" | "warning" | "danger";
    label: string;
    Icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  SUBMITTED: { tone: "success", label: "Submitted", Icon: CheckCircle2, iconClass: "text-success" },
  PENDING: { tone: "warning", label: "Pending", Icon: Clock, iconClass: "text-warning" },
  OVERDUE: { tone: "danger", label: "Overdue", Icon: AlertTriangle, iconClass: "text-danger" },
};

/**
 * This week's dealer activity, overdue first, then pending, then submitted —
 * the order the sales team actually works the list in.
 */
export function DealerActivityCard({ rows }: { rows: ActivityRow[] }) {
  const order: DealerActivityStatus[] = ["OVERDUE", "PENDING", "SUBMITTED"];
  const sorted = [...rows].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dealer activity — this week</CardTitle>
      </CardHeader>
      {sorted.length === 0 ? (
        <EmptyState icon={Clock} title="No active dealers" />
      ) : (
        <ul className="divide-y divide-line">
          {sorted.map((row) => {
            const meta = STATUS_META[row.status];
            return (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <meta.Icon
                  className={`size-4 shrink-0 ${meta.iconClass}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.company}</p>
                  <p className="truncate text-xs text-muted">
                    {row.contactName}
                    {row.status === "SUBMITTED" && row.submittedAt
                      ? ` · ${formatDate(row.submittedAt)}`
                      : row.reminderCount > 0
                        ? ` · ${row.reminderCount} reminder${row.reminderCount === 1 ? "" : "s"} sent`
                        : ""}
                  </p>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
