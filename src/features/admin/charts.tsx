"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3, LineChart } from "lucide-react";

/**
 * Chart series colours come from the CSS custom properties validated with the
 * dataviz skill (CVD-safe + contrast on both surfaces), so light/dark theming
 * is automatic and semantics stay consistent with the rest of the app.
 */
const CHART_1 = "var(--color-chart-1)";
const CHART_2 = "var(--color-chart-2)";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span className="text-muted">{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface WeeklySalesPoint {
  label: string;
  unitsSold: number;
  replenish: number;
}

export function WeeklySalesChart({ data }: { data: WeeklySalesPoint[] }) {
  const hasData = data.some((d) => d.unitsSold > 0 || d.replenish > 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Weekly sales</CardTitle>
        {/* Two same-unit series on one axis; both direct-labelled in the legend. */}
        <Legend items={[{ label: "Units sold", color: CHART_1 }, { label: "Restock", color: CHART_2 }]} />
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState icon={LineChart} title="No sales recorded yet" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="soldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_1} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_1} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} allowDecimals={false} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="unitsSold" name="Units sold" stroke={CHART_1} strokeWidth={2} fill="url(#soldFill)" />
                <Area type="monotone" dataKey="replenish" name="Restock" stroke={CHART_2} strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface RankedProduct {
  description: string;
  sku: string;
  unitsSold: number;
}

export function MostSoldProductsChart({ data }: { data: RankedProduct[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most sold products</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={BarChart3} title="No products sold yet" />
        ) : (
          <div style={{ height: Math.max(180, data.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="description"
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
                <Bar dataKey="unitsSold" name="Units sold" fill={CHART_1} radius={[0, 4, 4, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.sku} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-3">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
