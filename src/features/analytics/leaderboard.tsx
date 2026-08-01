import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";
import type { LeaderboardRow } from "./queries";

/**
 * Dealer leaderboard. A slim sell-through meter accompanies each row so the
 * ranking (by units sold) and efficiency (sell-through) are both legible at a
 * glance — the meter is a secondary encoding, not color-coded by value.
 */
export function DealerLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.unitsSold));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top dealers</CardTitle>
      </CardHeader>
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No sales to rank yet" />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row, i) => (
            <li key={row.dealerId} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 text-sm font-semibold text-muted tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.company}</p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(row.unitsSold / max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium tabular-nums">{row.unitsSold}</p>
                <p className="text-xs text-muted tabular-nums">
                  {Math.round(row.sellThrough * 100)}% sold
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
