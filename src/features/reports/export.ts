import "server-only";

import ExcelJS from "exceljs";
import type { ReportResult } from "./types";

/**
 * Excel writer (server-only, depends on exceljs). Pure CSV/formatting helpers
 * live in ./format and are re-exported here so callers have one import site.
 *
 * exceljs is used instead of the requested SheetJS: the patched SheetJS build
 * is only distributed from a CDN blocked by this environment, and the npm build
 * carries unpatched high-severity advisories on the exact parse path the
 * importer uses — see README "Notes on `xlsx`".
 */

export {
  formatCell,
  toCsv,
  exportFilename,
  EXPORT_CONTENT_TYPES,
  type ExportFormat,
} from "./format";

export async function toXlsx(report: ReportResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dealer Inventory Portal";
  workbook.created = report.generatedAt;

  const sheet = workbook.addWorksheet(report.title.slice(0, 31));

  sheet.columns = report.columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.max(col.label.length + 2, 14),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB91C1C" },
  };
  headerRow.alignment = { vertical: "middle" };

  for (const row of report.rows) {
    const excelRow: Record<string, string | number | Date | null> = {};
    for (const col of report.columns) {
      const raw = row[col.key];
      // Keep numbers/percents/dates as native types so Excel can sum and sort;
      // percents are stored as their 0–1 fraction with a % number format.
      if (col.type === "percent" || col.type === "number") {
        excelRow[col.key] = raw === null || raw === undefined ? null : Number(raw);
      } else if (col.type === "date") {
        excelRow[col.key] = raw instanceof Date ? raw : (raw as string | null);
      } else {
        excelRow[col.key] = raw === null || raw === undefined ? "" : String(raw);
      }
    }
    sheet.addRow(excelRow);
  }

  report.columns.forEach((col, index) => {
    const column = sheet.getColumn(index + 1);
    if (col.type === "percent") column.numFmt = "0%";
    if (col.type === "date") column.numFmt = "yyyy-mm-dd";
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
