/**
 * Shared enum-label maps. Kept in one framework-free module so forms, filters,
 * imports, and exports all present the same options in the same order.
 */

export const PRODUCT_CATEGORIES = [
  { value: "APPAREL", label: "Apparel" },
  { value: "PARTS", label: "Parts" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "HELMETS", label: "Helmets" },
  { value: "OTHER", label: "Other" },
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number]["value"];

export const PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map((c) => c.value);

export function categoryLabel(value: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const REPORT_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  OVERDUE: "Overdue",
};
