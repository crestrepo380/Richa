"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import { deriveInventory } from "@/lib/business/inventory";
import { parseImport, type RowError } from "./parse";
import {
  IMPORT_TYPES,
  IMPORT_SCHEMAS,
  type ImportType,
  type ProductRow,
  type DealerRow,
  type InventoryRow,
} from "./schemas";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB — plenty for these spreadsheets.

export interface ValidateState {
  status: "idle" | "validated" | "error";
  message?: string;
  type?: ImportType;
  validCount?: number;
  errors?: RowError[];
  /** The validated rows, echoed back so the commit step needs no re-upload. */
  rows?: unknown[];
}

function isImportType(value: string): value is ImportType {
  return (IMPORT_TYPES as readonly string[]).includes(value);
}

/**
 * Step 1 — validate an uploaded spreadsheet without writing anything.
 * Returns the clean rows plus a per-row error list for the admin to review.
 */
export async function validateImport(
  _prev: ValidateState | undefined,
  formData: FormData,
): Promise<ValidateState> {
  const user = await requirePermission("inventory:import");

  const rate = checkRateLimit(
    `import:${user.id}`,
    RATE_LIMITS.import.limit,
    RATE_LIMITS.import.windowMs,
  );
  if (!rate.success) {
    return { status: "error", message: "Too many imports. Please wait a moment." };
  }

  const type = String(formData.get("type") ?? "");
  const file = formData.get("file");

  if (!isImportType(type)) {
    return { status: "error", message: "Choose what you're importing." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a spreadsheet file to import." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: "That file is larger than 5 MB." };
  }

  let result;
  try {
    result = await parseImport(await file.arrayBuffer(), type);
  } catch (error) {
    console.error("[import] parse failed", error);
    return {
      status: "error",
      message: "We couldn't read that file. Is it a valid .xlsx spreadsheet?",
    };
  }

  return {
    status: "validated",
    type,
    validCount: result.valid.length,
    errors: result.errors,
    rows: result.valid,
    message:
      result.valid.length === 0
        ? "No valid rows found. Fix the errors below and try again."
        : undefined,
  };
}

export interface CommitState {
  status: "idle" | "success" | "error";
  message?: string;
  imported?: number;
}

/**
 * Step 2 — commit previously validated rows. The rows are re-validated with the
 * same schema (never trusted just because step 1 passed), and each type is
 * written idempotently via upserts so re-running an import updates rather than
 * duplicates.
 */
export async function commitImport(
  type: ImportType,
  rows: unknown[],
): Promise<CommitState> {
  const user = await requirePermission("inventory:import");

  if (!isImportType(type)) {
    return { status: "error", message: "Unknown import type." };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: "error", message: "There is nothing to import." };
  }

  const schema = IMPORT_SCHEMAS[type];
  const parsed = z.array(schema).safeParse(rows);
  if (!parsed.success) {
    return {
      status: "error",
      message: "The data failed validation. Please re-upload and try again.",
    };
  }

  try {
    let imported = 0;
    switch (type) {
      case "products":
        imported = await importProducts(parsed.data as ProductRow[]);
        break;
      case "dealers":
        imported = await importDealers(parsed.data as DealerRow[]);
        break;
      case "inventory":
        imported = await importInventory(parsed.data as InventoryRow[]);
        break;
    }

    await recordAudit({
      userId: user.id,
      action:
        type === "products"
          ? AUDIT_ACTIONS.productImported
          : AUDIT_ACTIONS.inventoryImported,
      metadata: { type, imported },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dealers");

    return {
      status: "success",
      imported,
      message: `Imported ${imported} ${type === "inventory" ? "inventory rows" : type}.`,
    };
  } catch (error) {
    console.error("[import] commit failed", error);
    return { status: "error", message: "The import failed. No changes were saved." };
  }
}

async function importProducts(rows: ProductRow[]): Promise<number> {
  await prisma.$transaction(
    rows.map((row) =>
      prisma.product.upsert({
        where: { sku: row.sku },
        update: {
          productNumber: row.productNumber,
          description: row.description,
          color: row.color || null,
          size: row.size || null,
          category: row.category as never,
        },
        create: {
          sku: row.sku,
          productNumber: row.productNumber,
          description: row.description,
          color: row.color || null,
          size: row.size || null,
          category: row.category as never,
        },
      }),
    ),
  );
  return rows.length;
}

async function importDealers(rows: DealerRow[]): Promise<number> {
  await prisma.$transaction(
    rows.map((row) =>
      prisma.dealer.upsert({
        where: { email: row.email },
        update: { company: row.company, contactName: row.contactName, phone: row.phone || null },
        create: {
          email: row.email,
          company: row.company,
          contactName: row.contactName,
          phone: row.phone || null,
        },
      }),
    ),
  );
  return rows.length;
}

/**
 * Inventory import resolves dealer (by email) and product (by SKU) up front,
 * skips rows referencing unknown dealers/products, and derives sold/replenish
 * from the counts so imported rows obey the same rule as dealer submissions.
 */
async function importInventory(rows: InventoryRow[]): Promise<number> {
  const emails = [...new Set(rows.map((r) => r.dealerEmail))];
  const skus = [...new Set(rows.map((r) => r.sku))];

  const [dealers, products] = await Promise.all([
    prisma.dealer.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } }),
    prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } }),
  ]);

  const dealerByEmail = new Map(dealers.map((d) => [d.email, d.id]));
  const productBySku = new Map(products.map((p) => [p.sku, p.id]));

  const operations = rows.flatMap((row) => {
    const dealerId = dealerByEmail.get(row.dealerEmail);
    const productId = productBySku.get(row.sku);
    if (!dealerId || !productId) return [];

    const derived = deriveInventory({
      originalQuantity: row.originalQuantity,
      currentOnHand: row.currentOnHand ?? row.originalQuantity,
    });

    return [
      prisma.dealerInventory.upsert({
        where: { dealerId_productId: { dealerId, productId } },
        update: derived,
        create: { dealerId, productId, ...derived },
      }),
    ];
  });

  if (operations.length) await prisma.$transaction(operations);
  return operations.length;
}
