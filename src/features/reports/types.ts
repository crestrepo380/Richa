/**
 * Report contracts shared by the data producers, the on-screen preview table,
 * and the file exporters. A report is just a titled set of typed columns plus a
 * function that yields rows — so adding a report never touches the export code.
 */

export type ReportId =
  | "dealer-sales-summary"
  | "weekly-replenishment"
  | "inventory-history"
  | "dealer-performance";

export type ColumnType = "text" | "number" | "date" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  type: ColumnType;
}

export type ReportRow = Record<string, string | number | Date | null>;

export interface ReportResult {
  id: ReportId;
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  generatedAt: Date;
}

export interface ReportFilters {
  dealerId?: string;
  category?: string;
  /** Inclusive week range (Monday keys, "YYYY-MM-DD"), for history reports. */
  weekFrom?: string;
  weekTo?: string;
}

export const REPORT_DEFINITIONS: Array<{
  id: ReportId;
  title: string;
  description: string;
}> = [
  {
    id: "dealer-sales-summary",
    title: "Dealer Sales Summary",
    description: "Units received, on hand, sold, and to restock — one row per dealer.",
  },
  {
    id: "weekly-replenishment",
    title: "Weekly Replenishment",
    description: "Every product needing restock, grouped by dealer. The pick list.",
  },
  {
    id: "inventory-history",
    title: "Inventory History",
    description: "Submitted weekly snapshots across the selected date range.",
  },
  {
    id: "dealer-performance",
    title: "Dealer Performance",
    description: "Submission reliability and sell-through by dealer.",
  },
];

export function isReportId(value: string): value is ReportId {
  return REPORT_DEFINITIONS.some((d) => d.id === value);
}
