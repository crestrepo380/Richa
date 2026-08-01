"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IMPORT_COLUMNS,
  IMPORT_LABELS,
  IMPORT_TYPES,
  type ImportType,
} from "./schemas";
import {
  commitImport,
  validateImport,
  type ValidateState,
} from "./actions";

/**
 * Two-step import: validate (dry run) → review → commit. The admin always sees
 * exactly how many rows are valid and precisely which rows failed and why,
 * before anything is written.
 */
export function ImportClient() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<ImportType>("products");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateState | null>(null);
  const [isValidating, startValidate] = useTransition();
  const [isCommitting, startCommit] = useTransition();

  function handleValidate(formData: FormData) {
    setResult(null);
    startValidate(async () => {
      const state = await validateImport(undefined, formData);
      setResult(state);
      if (state.status === "error" && state.message) toast.error(state.message);
    });
  }

  function handleCommit() {
    if (!result?.rows || !result.type) return;
    startCommit(async () => {
      const state = await commitImport(result.type!, result.rows!);
      if (state.status === "success") {
        toast.success(state.message ?? "Imported.");
        setResult(null);
        setFileName(null);
        formRef.current?.reset();
        router.refresh();
      } else {
        toast.error(state.message ?? "Import failed.");
      }
    });
  }

  const canCommit =
    result?.status === "validated" && (result.validCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form ref={formRef} action={handleValidate} className="space-y-4">
          <div>
            <label htmlFor="import-type" className="mb-1.5 block text-sm font-medium">
              What are you importing?
            </label>
            <select
              id="import-type"
              name="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as ImportType);
                setResult(null);
              }}
              className="h-10 w-full max-w-xs rounded-lg border border-line bg-surface px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {IMPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {IMPORT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Spreadsheet file</p>
            <label
              htmlFor="import-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-muted px-6 py-10 text-center transition-colors hover:border-brand/50"
            >
              <UploadCloud className="size-7 text-muted" aria-hidden />
              <span className="text-sm font-medium">
                {fileName ?? "Choose an .xlsx file"}
              </span>
              <span className="text-xs text-muted">
                Expected columns: {IMPORT_COLUMNS[type].join(", ")}
              </span>
              <input
                id="import-file"
                name="file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  setFileName(e.target.files?.[0]?.name ?? null);
                  setResult(null);
                }}
              />
            </label>
          </div>

          <Button type="submit" loading={isValidating} disabled={!fileName}>
            <FileUp className="size-4" aria-hidden />
            Validate file
          </Button>
        </form>
      </Card>

      {result?.status === "validated" && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex items-center gap-2">
              <Badge tone="success">
                <CheckCircle2 className="mr-1 size-3" aria-hidden />
                {result.validCount} valid
              </Badge>
              {result.errors && result.errors.length > 0 && (
                <Badge tone="danger">
                  <AlertTriangle className="mr-1 size-3" aria-hidden />
                  {result.errors.length} with errors
                </Badge>
              )}
            </div>

            <Button onClick={handleCommit} loading={isCommitting} disabled={!canCommit}>
              Import {result.validCount} valid row{result.validCount === 1 ? "" : "s"}
            </Button>
          </div>

          {result.message && (
            <p className="border-b border-line px-4 py-3 text-sm text-muted">
              {result.message}
            </p>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="w-20 px-4 py-2 font-medium">Row</th>
                    <th scope="col" className="px-4 py-2 font-medium">Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((err) => (
                    <tr key={err.row} className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-xs text-muted">{err.row}</td>
                      <td className="px-4 py-2 text-danger">{err.messages.join("; ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
