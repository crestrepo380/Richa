import { z } from "zod";
import { PRODUCT_CATEGORY_VALUES } from "@/lib/constants";

/**
 * Import row schemas. The same schemas validate a row whether it came from a
 * parsed spreadsheet cell or from the client's confirmed payload, so a tampered
 * confirm request can't slip past the checks the preview showed.
 */

export const IMPORT_TYPES = ["products", "dealers", "inventory"] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

const trimmedString = z.string().transform((s) => s.trim());
const requiredString = trimmedString.pipe(z.string().min(1));

// Trim BEFORE validating the address — spreadsheet cells often carry stray
// whitespace, and z.email() would otherwise reject "  a@b.com ".
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.email());

const categoryEnum = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z.enum(PRODUCT_CATEGORY_VALUES as unknown as [string, ...string[]]),
  )
  .catch("OTHER");

export const productRowSchema = z.object({
  sku: requiredString,
  productNumber: requiredString,
  description: requiredString,
  color: trimmedString.optional().nullable(),
  size: trimmedString.optional().nullable(),
  category: categoryEnum,
});
export type ProductRow = z.infer<typeof productRowSchema>;

export const dealerRowSchema = z.object({
  company: requiredString,
  contactName: requiredString,
  email: emailField,
  phone: trimmedString.optional().nullable(),
});
export type DealerRow = z.infer<typeof dealerRowSchema>;

const quantity = z.coerce
  .number()
  .int({ error: "must be a whole number" })
  .min(0, { error: "cannot be negative" })
  .max(1_000_000, { error: "is too large" });

export const inventoryRowSchema = z.object({
  // A dealer is matched by email (unique). SKU matches the product.
  dealerEmail: emailField,
  sku: requiredString,
  originalQuantity: quantity,
  // Optional: if provided, sets the current count; otherwise defaults to the
  // original (a fresh shipment, nothing sold yet).
  currentOnHand: quantity.optional(),
});
export type InventoryRow = z.infer<typeof inventoryRowSchema>;

export const IMPORT_SCHEMAS = {
  products: productRowSchema,
  dealers: dealerRowSchema,
  inventory: inventoryRowSchema,
} as const;

/** The headers each import type expects, used for the template and mapping. */
export const IMPORT_COLUMNS: Record<ImportType, string[]> = {
  products: ["sku", "productNumber", "description", "color", "size", "category"],
  dealers: ["company", "contactName", "email", "phone"],
  inventory: ["dealerEmail", "sku", "originalQuantity", "currentOnHand"],
};

export const IMPORT_LABELS: Record<ImportType, string> = {
  products: "Products",
  dealers: "Dealers",
  inventory: "Dealer Inventory",
};
