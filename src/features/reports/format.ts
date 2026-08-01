import { formatDate } from "@/lib/utils";
import type { ColumnType, ReportResult, ReportRow } from "./types";

/**
 * Pure report formatting — CSV, cell rendering, filenames. Kept free of
 * `server-only` and exceljs so it can be shared with the on-screen preview
 * table and unit-tested directly. The Excel writer (server-only) lives in
 * ./export and re-exports these.
 */

export type ExportFormat = "xlsx" | "csv";

/** Human-readable cell value for CSV and the on-screen preview. */
export function formatCell(value: ReportRow[string], type: ColumnType): string {
  if (value === null || value === undefined) return "";
  switch (type) {
    case "percent":
      return `${Math.round(Number(value) * 100)}%`;
    case "date":
      return value instanceof Date ? formatDate(value) : String(value);
    case "number":
      return String(value);
    default:
      return String(value);
  }
}

export function toCsv(report: ReportResult): string {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const header = report.columns.map((c) => escape(c.label)).join(",");
  const lines = report.rows.map((row) =>
    report.columns
      .map((col) => escape(formatCell(row[col.key], col.type)))
      .join(","),
  );

  return [header, ...lines].join("\r\n");
}

export function exportFilename(report: ReportResult, format: ExportFormat): string {
  const date = report.generatedAt.toISOString().slice(0, 10);
  return `${report.id}_${date}.${format}`;
}

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
};
