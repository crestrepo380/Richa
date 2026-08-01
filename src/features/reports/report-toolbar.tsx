"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { REPORT_DEFINITIONS, type ReportId } from "./types";

/**
 * Report chooser + filters + export actions. State lives in the URL so a
 * generated report is shareable, and the export links carry the same query so
 * the file matches exactly what's on screen. "Print / PDF" uses the browser's
 * print-to-PDF against a print-optimized stylesheet — a real PDF with no heavy
 * client dependency.
 */
export function ReportToolbar({
  reportId,
  dealers,
}: {
  reportId: ReportId;
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

  const query = params.toString();
  const dealerId = params.get("dealerId") ?? "";
  const category = params.get("category") ?? "";
  const isHistory = reportId === "inventory-history";

  return (
    <div className="mb-6 space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={reportId}
          onChange={(e) => setParam("report", e.target.value)}
          aria-label="Report type"
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {REPORT_DEFINITIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a href={`/api/reports/export?${query}&format=xlsx`}>
            <Button variant="secondary" size="sm">
              <FileSpreadsheet className="size-4" aria-hidden />
              Excel
            </Button>
          </a>
          <a href={`/api/reports/export?${query}&format=csv`}>
            <Button variant="secondary" size="sm">
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          </a>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

        {isHistory && (
          <>
            <input
              type="date"
              value={params.get("weekFrom") ?? ""}
              onChange={(e) => setParam("weekFrom", e.target.value)}
              aria-label="From week"
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
            <input
              type="date"
              value={params.get("weekTo") ?? ""}
              onChange={(e) => setParam("weekTo", e.target.value)}
              aria-label="To week"
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
          </>
        )}
      </div>
    </div>
  );
}
