import "server-only";

import ExcelJS from "exceljs";
import { IMPORT_COLUMNS, IMPORT_SCHEMAS, type ImportType } from "./schemas";

/**
 * Spreadsheet parsing + validation.
 *
 * Header matching is case- and space-insensitive so a dealer's "Product Number"
 * column maps to `productNumber` without them having to know our field names.
 * Every row is validated with the type's Zod schema; failures are collected
 * with their row number and message rather than aborting the whole file, so the
 * admin sees exactly which rows to fix.
 */

export interface RowError {
  row: number;
  messages: string[];
}

export interface ParseResult<T> {
  valid: T[];
  errors: RowError[];
  totalRows: number;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

/** Cell value → plain string/undefined, flattening exceljs rich text/formulas. */
function cellToValue(cell: ExcelJS.CellValue): string | undefined {
  if (cell === null || cell === undefined) return undefined;
  if (typeof cell === "object") {
    if ("text" in cell && typeof cell.text === "string") return cell.text;
    if ("result" in cell) return String(cell.result ?? "");
    if (cell instanceof Date) return cell.toISOString();
    return undefined;
  }
  const str = String(cell).trim();
  return str.length ? str : undefined;
}

export async function parseImport<T>(
  buffer: ArrayBuffer,
  type: ImportType,
): Promise<ParseResult<T>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { valid: [], errors: [{ row: 0, messages: ["The file has no sheets."] }], totalRows: 0 };
  }

  const expected = IMPORT_COLUMNS[type];
  const schema = IMPORT_SCHEMAS[type];

  // Map each expected field to its column index by matching the header row.
  const headerRow = sheet.getRow(1);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const value = cellToValue(cell.value);
    if (value) headerIndex.set(normalizeHeader(value), colNumber);
  });

  const fieldToCol = new Map<string, number>();
  const missing: string[] = [];
  for (const field of expected) {
    const col = headerIndex.get(normalizeHeader(field));
    if (col) fieldToCol.set(field, col);
    else if (isRequiredField(type, field)) missing.push(field);
  }

  if (missing.length) {
    return {
      valid: [],
      errors: [{ row: 1, messages: [`Missing required column(s): ${missing.join(", ")}`] }],
      totalRows: 0,
    };
  }

  const valid: T[] = [];
  const errors: RowError[] = [];
  let totalRows = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);

    const raw: Record<string, string | undefined> = {};
    let hasAnyValue = false;
    for (const field of expected) {
      const col = fieldToCol.get(field);
      const value = col ? cellToValue(row.getCell(col).value) : undefined;
      if (value !== undefined) hasAnyValue = true;
      raw[field] = value;
    }

    // Skip completely blank rows silently (trailing rows in most exports).
    if (!hasAnyValue) continue;
    totalRows++;

    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      valid.push(parsed.data as T);
    } else {
      errors.push({
        row: rowNumber,
        messages: parsed.error.issues.map(
          (i) => `${i.path.join(".") || "row"}: ${i.message}`,
        ),
      });
    }
  }

  return { valid, errors, totalRows };
}

function isRequiredField(type: ImportType, field: string): boolean {
  // Optional columns per type; everything else is required to be present.
  const optional: Record<ImportType, string[]> = {
    products: ["color", "size", "category"],
    dealers: ["phone"],
    inventory: ["currentOnHand"],
  };
  return !optional[type].includes(field);
}
