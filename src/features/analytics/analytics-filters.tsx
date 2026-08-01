"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

const WEEK_RANGES = [
  { value: "8", label: "Last 8 weeks" },
  { value: "12", label: "Last 12 weeks" },
  { value: "26", label: "Last 26 weeks" },
];

/**
 * Analytics filters (URL-backed): time range, dealer, category. Selecting a
 * single dealer turns the page into that dealer's drill-down.
 */
export function AnalyticsFilters({
  dealers,
}: {
  dealers: Array<{ id: string; company: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`);
  }

  const weeks = params.get("weeks") ?? "8";
  const dealerId = params.get("dealerId") ?? "";
  const category = params.get("category") ?? "";
  const hasFilters = Boolean(dealerId || category || weeks !== "8");

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <select
        value={weeks}
        onChange={(e) => setParam("weeks", e.target.value)}
        aria-label="Time range"
        className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {WEEK_RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <select
        value={dealerId}
        onChange={(e) => setParam("dealerId", e.target.value)}
        aria-label="Filter by dealer"
        className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <option value="">All dealers</option>
        {dealers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.company}
          </option>
        ))}
      </select>

      <select
        value={category}
        onChange={(e) => setParam("category", e.target.value)}
        aria-label="Filter by category"
        className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <option value="">All categories</option>
        {PRODUCT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace("?")}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
          Reset
        </button>
      )}
    </div>
  );
}
