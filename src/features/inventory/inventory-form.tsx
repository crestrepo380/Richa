"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImageOff, RefreshCw, Save, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deriveInventory } from "@/lib/business/inventory";
import { cn } from "@/lib/utils";
import type { InventoryRow } from "./queries";
import { QuantityInput } from "./quantity-input";
import { submitWeeklyInventory } from "./actions";

interface FormRow extends InventoryRow {
  draftOnHand: number;
}

/**
 * The dealer's weekly count form.
 *
 * State model: each row holds a `draftOnHand`. Sold and replenishment are never
 * edited — they are derived live via the same pure `deriveInventory` the server
 * uses, so the preview a dealer sees is exactly what will be saved. A row is
 * "changed" when its draft differs from the stored value; only changed rows
 * need submitting, and the sticky bar reflects that.
 */
export function InventoryForm({
  rows: initialRows,
  alreadySubmitted,
}: {
  rows: InventoryRow[];
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<FormRow[]>(() =>
    initialRows.map((r) => ({ ...r, draftOnHand: r.currentOnHand })),
  );

  function updateRow(inventoryId: string, draftOnHand: number) {
    setRows((prev) =>
      prev.map((r) => (r.inventoryId === inventoryId ? { ...r, draftOnHand } : r)),
    );
  }

  const changedCount = useMemo(
    () => rows.filter((r) => r.draftOnHand !== r.currentOnHand).length,
    [rows],
  );

  // Live totals reflect the draft, so the dealer sees the impact before saving.
  const preview = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const d = deriveInventory({
          originalQuantity: r.originalQuantity,
          currentOnHand: r.draftOnHand,
        });
        acc.unitsSold += d.unitsSold;
        acc.replenish += d.replenishQuantity;
        return acc;
      },
      { unitsSold: 0, replenish: 0 },
    );
  }, [rows]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitWeeklyInventory({
        lines: rows.map((r) => ({
          inventoryId: r.inventoryId,
          currentOnHand: r.draftOnHand,
        })),
      });

      if (result.status === "success") {
        toast.success(result.message ?? "Submitted.");
        // Commit drafts locally so the "changed" count resets without a reload.
        setRows((prev) => prev.map((r) => ({ ...r, currentOnHand: r.draftOnHand })));
        router.refresh();
      } else {
        toast.error(result.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface lg:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Product</th>
              <th scope="col" className="px-4 py-3 font-medium">SKU</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">Received</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">On hand</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">Sold</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">Restock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const derived = deriveInventory({
                originalQuantity: row.originalQuantity,
                currentOnHand: row.draftOnHand,
              });
              const changed = row.draftOnHand !== row.currentOnHand;

              return (
                <tr
                  key={row.inventoryId}
                  className={cn(
                    "border-t border-line",
                    changed && "bg-brand-muted/40",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb row={row} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.description}</p>
                        <p className="text-xs text-muted">
                          {[row.color, row.size].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.sku}</td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {row.originalQuantity}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <QuantityInput
                        value={row.draftOnHand}
                        onChange={(v) => updateRow(row.inventoryId, v)}
                        label={`On hand for ${row.description}`}
                        disabled={isPending}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium text-success">
                    {derived.unitsSold}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium">
                    {derived.replenishQuantity > 0 ? (
                      <Badge tone="danger">{derived.replenishQuantity}</Badge>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => {
          const derived = deriveInventory({
            originalQuantity: row.originalQuantity,
            currentOnHand: row.draftOnHand,
          });
          const changed = row.draftOnHand !== row.currentOnHand;

          return (
            <div
              key={row.inventoryId}
              className={cn(
                "rounded-xl border border-line bg-surface p-4",
                changed && "ring-1 ring-brand/40",
              )}
            >
              <div className="flex items-center gap-3">
                <ProductThumb row={row} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.description}</p>
                  <p className="text-xs text-muted">
                    {[row.color, row.size].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="font-mono text-xs text-muted">{row.sku}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">On hand</p>
                  <p className="text-xs text-muted">
                    Received {row.originalQuantity}
                  </p>
                </div>
                <QuantityInput
                  value={row.draftOnHand}
                  onChange={(v) => updateRow(row.inventoryId, v)}
                  label={`On hand for ${row.description}`}
                  disabled={isPending}
                />
              </div>

              <div className="mt-3 flex gap-4 border-t border-line pt-3 text-sm">
                <span className="text-muted">
                  Sold{" "}
                  <strong className="text-success">{derived.unitsSold}</strong>
                </span>
                <span className="text-muted">
                  Restock{" "}
                  <strong className={derived.replenishQuantity > 0 ? "text-danger" : ""}>
                    {derived.replenishQuantity}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:pl-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted">
              <TrendingUp className="size-4 text-success" aria-hidden />
              {preview.unitsSold} sold
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <RefreshCw className="size-4" aria-hidden />
              {preview.replenish} to restock
            </span>
            {changedCount > 0 ? (
              <Badge tone="brand">{changedCount} changed</Badge>
            ) : alreadySubmitted ? (
              <Badge tone="success">
                <CheckCircle2 className="mr-1 size-3" aria-hidden />
                Submitted
              </Badge>
            ) : null}
          </div>

          <Button
            size="lg"
            onClick={handleSubmit}
            loading={isPending}
            disabled={rows.length === 0}
          >
            <Save className="size-4" aria-hidden />
            {alreadySubmitted && changedCount === 0
              ? "Re-submit weekly inventory"
              : "Submit weekly inventory"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductThumb({ row }: { row: InventoryRow }) {
  if (row.imageUrl) {
    // Product images come from arbitrary external CDNs, so next/image's remote
    // patterns can't be pre-declared; a plain <img> is the pragmatic choice.
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.imageUrl}
          alt=""
          className="size-11 shrink-0 rounded-lg object-cover"
        />
      </>
    );
  }
  return (
    <div
      className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-muted text-muted"
      aria-hidden
    >
      <ImageOff className="size-4" />
    </div>
  );
}
