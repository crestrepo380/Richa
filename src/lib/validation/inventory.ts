import { z } from "zod";

/**
 * Weekly inventory submission.
 *
 * The dealer only ever sends the count they have on hand per line — never sales
 * or replenishment, which the server derives. `originalQuantity` is deliberately
 * NOT accepted from the client: it is the trusted shipped figure and is read
 * server-side, so a tampered request cannot inflate a dealer's numbers.
 */
export const MAX_ON_HAND = 1_000_000;

export const inventoryLineSchema = z.object({
  inventoryId: z.uuid({ error: "Invalid inventory row." }),
  currentOnHand: z
    .number({ error: "Enter a whole number." })
    .int({ error: "Enter a whole number." })
    .min(0, { error: "Cannot be negative." })
    .max(MAX_ON_HAND, { error: "That number looks too large." }),
});
export type InventoryLineInput = z.infer<typeof inventoryLineSchema>;

export const submitInventorySchema = z.object({
  lines: z
    .array(inventoryLineSchema)
    .min(1, { error: "There is nothing to submit yet." })
    // A dealer cannot legitimately have two rows for the same inventory id.
    .refine(
      (lines) => new Set(lines.map((l) => l.inventoryId)).size === lines.length,
      { error: "Duplicate rows detected. Reload the page and try again." },
    ),
});
export type SubmitInventoryInput = z.infer<typeof submitInventorySchema>;
