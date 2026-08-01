"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarCheck, Layers } from "lucide-react";

const CHART_1 = "var(--color-chart-1)";

function TrendTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          <span className="text-muted">{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface SubmissionPoint {
  label: string;
  submissionRate: number;
}

/** Weekly submission reliability, as a percentage line. */
export function SubmissionRateChart({ data }: { data: SubmissionPoint[] }) {
  const hasData = data.some((d) => d.submissionRate > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission rate</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState icon={CalendarCheck} title="No submissions in this range" />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-muted)" }}
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  width={44}
                />
                <Tooltip content={<TrendTooltip valueFormatter={(v) => `${Math.round(v * 100)}%`} />} />
                <Line
                  type="monotone"
                  dataKey="submissionRate"
                  name="Submission rate"
                  stroke={CHART_1}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface CategoryPoint {
  label: string;
  unitsSold: number;
}

/** Units sold by category — magnitude comparison, so a single-hue bar. */
export function CategoryBreakdownChart({ data }: { data: CategoryPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by category</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={Layers} title="No category sales yet" />
        ) : (
          <div style={{ height: Math.max(160, data.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barCategoryGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 12, fill: "var(--color-foreground)" }} />
                <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
                <Bar dataKey="unitsSold" name="Units sold" fill={CHART_1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
