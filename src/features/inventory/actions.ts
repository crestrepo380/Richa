"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDealer } from "@/lib/auth/dal";
import { deriveInventory } from "@/lib/business/inventory";
import { submitInventorySchema } from "@/lib/validation/inventory";
import { getCurrentWeekStart } from "@/lib/week";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";

export interface SubmitInventoryState {
  status: "idle" | "success" | "error";
  message?: string;
  /** Field-level errors keyed by inventoryId, for inline display. */
  fieldErrors?: Record<string, string>;
  submittedAt?: string;
}

/**
 * Submit the dealer's weekly inventory.
 *
 * This is the whole point of the product: the dealer sends only on-hand counts,
 * and the server does everything else. Every step re-establishes trust rather
 * than believing the request —
 *
 *   1. Authenticate and resolve the dealer from the session (never the payload).
 *   2. Validate the shape with Zod.
 *   3. Load the dealer's OWN inventory rows and intersect with the submission,
 *      so a tampered inventoryId belonging to another dealer is simply ignored.
 *   4. Derive unitsSold / replenishment from the trusted originalQuantity.
 *   5. Persist the live counts, the weekly report, and an immutable per-line
 *      snapshot — all in one transaction so a failure leaves nothing partial.
 */
export async function submitWeeklyInventory(
  input: unknown,
): Promise<SubmitInventoryState> {
  const dealer = await requireDealer();

  const rate = checkRateLimit(
    `report-submit:${dealer.dealerId}`,
    RATE_LIMITS.reportSubmit.limit,
    RATE_LIMITS.reportSubmit.windowMs,
  );
  if (!rate.success) {
    return {
      status: "error",
      message: "You're submitting too quickly. Please wait a moment.",
    };
  }

  const parsed = submitInventorySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      // Path looks like ["lines", <index>, "currentOnHand"]; we can't map the
      // index back to an id here, so surface a general message plus any that
      // carry enough context.
      if (issue.path[0] === "lines" && typeof issue.path[1] === "number") {
        continue;
      }
    }
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Some values weren't valid. Please review and try again.",
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }

  const week = getCurrentWeekStart();

  // Trusted server-side view of what this dealer actually owns.
  const owned = await prisma.dealerInventory.findMany({
    where: { dealerId: dealer.dealerId },
    select: { id: true, productId: true, originalQuantity: true },
  });
  const ownedById = new Map(owned.map((row) => [row.id, row]));

  const updates = parsed.data.lines
    .map((line) => {
      const record = ownedById.get(line.inventoryId);
      if (!record) return null; // Not this dealer's row — silently skip.

      const derived = deriveInventory({
        originalQuantity: record.originalQuantity,
        currentOnHand: line.currentOnHand,
      });

      return { record, derived };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length === 0) {
    return {
      status: "error",
      message: "None of the submitted items matched your inventory.",
    };
  }

  const submittedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update the live counts.
      for (const { record, derived } of updates) {
        await tx.dealerInventory.update({
          where: { id: record.id },
          data: {
            currentOnHand: derived.currentOnHand,
            unitsSold: derived.unitsSold,
            replenishQuantity: derived.replenishQuantity,
          },
        });
      }

      // 2. Upsert the weekly report and mark it submitted.
      const report = await tx.weeklyReport.upsert({
        where: { dealerId_week: { dealerId: dealer.dealerId, week } },
        update: { status: "SUBMITTED", submitted: true, submittedAt },
        create: {
          dealerId: dealer.dealerId,
          week,
          status: "SUBMITTED",
          submitted: true,
          submittedAt,
        },
        select: { id: true },
      });

      // 3. Rewrite the immutable snapshot for this week. Clearing first makes
      //    re-submission within the same week idempotent.
      await tx.weeklyReportLine.deleteMany({
        where: { weeklyReportId: report.id },
      });
      await tx.weeklyReportLine.createMany({
        data: updates.map(({ record, derived }) => ({
          weeklyReportId: report.id,
          productId: record.productId,
          originalQuantity: derived.originalQuantity,
          currentOnHand: derived.currentOnHand,
          unitsSold: derived.unitsSold,
          replenishQuantity: derived.replenishQuantity,
        })),
      });
    });
  } catch (error) {
    console.error("[inventory] submission failed", error);
    return {
      status: "error",
      message: "We couldn't save your submission. Please try again.",
    };
  }

  await recordAudit({
    userId: dealer.id,
    action: AUDIT_ACTIONS.reportSubmitted,
    metadata: {
      dealerId: dealer.dealerId,
      week: week.toISOString().slice(0, 10),
      lineCount: updates.length,
    },
  });

  // Refresh the dealer's inventory view and their history list.
  revalidatePath("/dealer");
  revalidatePath("/dealer/history");

  return {
    status: "success",
    message: "Your weekly inventory has been submitted.",
    submittedAt: submittedAt.toISOString(),
  };
}
