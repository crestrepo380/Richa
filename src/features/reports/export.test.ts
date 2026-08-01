import { describe, expect, it } from "vitest";
import { formatCell, toCsv, exportFilename } from "./format";
import type { ReportResult } from "./types";

const report: ReportResult = {
  id: "dealer-sales-summary",
  title: "Dealer Sales Summary",
  generatedAt: new Date("2026-08-01T00:00:00Z"),
  columns: [
    { key: "Dealer", label: "Dealer", type: "text" },
    { key: "Units sold", label: "Units sold", type: "number" },
    { key: "Sell-through", label: "Sell-through", type: "percent" },
  ],
  rows: [
    { Dealer: "Ridgeline Motorsports", "Units sold": 42, "Sell-through": 0.4 },
    { Dealer: 'Coastal "Cycle", Co.', "Units sold": 0, "Sell-through": 0 },
  ],
};

describe("formatCell", () => {
  it("renders percents as whole-number percentages", () => {
    expect(formatCell(0.4, "percent")).toBe("40%");
    expect(formatCell(0, "percent")).toBe("0%");
  });

  it("formats dates and handles blanks", () => {
    expect(formatCell(null, "text")).toBe("");
    expect(formatCell(new Date("2026-08-01T00:00:00Z"), "date")).toContain("2026");
  });
});

describe("toCsv", () => {
  it("emits a header row plus one line per data row", () => {
    const lines = toCsv(report).split("\r\n");
    expect(lines[0]).toBe("Dealer,Units sold,Sell-through");
    expect(lines).toHaveLength(3);
  });

  it("escapes quotes and commas per RFC 4180", () => {
    const csv = toCsv(report);
    expect(csv).toContain('"Coastal ""Cycle"", Co."');
  });

  it("carries the formatted percent through to the cell", () => {
    expect(toCsv(report)).toContain("40%");
  });
});

describe("exportFilename", () => {
  it("includes the report id, date, and extension", () => {
    expect(exportFilename(report, "xlsx")).toBe("dealer-sales-summary_2026-08-01.xlsx");
    expect(exportFilename(report, "csv")).toBe("dealer-sales-summary_2026-08-01.csv");
  });
});
