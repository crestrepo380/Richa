import { describe, expect, it } from "vitest";
import {
  productRowSchema,
  dealerRowSchema,
  inventoryRowSchema,
} from "./schemas";

describe("productRowSchema", () => {
  it("trims text and normalizes the category", () => {
    const result = productRowSchema.parse({
      sku: "  RCH-1 ",
      productNumber: "RCH",
      description: " Jacket ",
      color: " Black ",
      size: "M",
      category: " apparel ",
    });
    expect(result.sku).toBe("RCH-1");
    expect(result.description).toBe("Jacket");
    expect(result.category).toBe("APPAREL");
  });

  it("falls back to OTHER for an unknown category", () => {
    const result = productRowSchema.parse({
      sku: "X",
      productNumber: "X",
      description: "Thing",
      category: "gizmos",
    });
    expect(result.category).toBe("OTHER");
  });

  it("rejects a blank required field", () => {
    expect(
      productRowSchema.safeParse({
        sku: "",
        productNumber: "X",
        description: "Thing",
        category: "PARTS",
      }).success,
    ).toBe(false);
  });
});

describe("dealerRowSchema", () => {
  it("lowercases and trims the email", () => {
    const result = dealerRowSchema.parse({
      company: "Ridgeline",
      contactName: "Rich",
      email: "  RICH@Example.COM ",
    });
    expect(result.email).toBe("rich@example.com");
  });

  it("rejects a malformed email", () => {
    expect(
      dealerRowSchema.safeParse({
        company: "X",
        contactName: "Y",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

describe("inventoryRowSchema", () => {
  it("coerces string quantities from spreadsheet cells", () => {
    const result = inventoryRowSchema.parse({
      dealerEmail: "rich@example.com",
      sku: "RCH-1",
      originalQuantity: "10",
      currentOnHand: "6",
    });
    expect(result.originalQuantity).toBe(10);
    expect(result.currentOnHand).toBe(6);
  });

  it("allows currentOnHand to be omitted", () => {
    const result = inventoryRowSchema.parse({
      dealerEmail: "rich@example.com",
      sku: "RCH-1",
      originalQuantity: 10,
    });
    expect(result.currentOnHand).toBeUndefined();
  });

  it("rejects negative and fractional quantities", () => {
    for (const originalQuantity of [-1, 2.5]) {
      expect(
        inventoryRowSchema.safeParse({
          dealerEmail: "rich@example.com",
          sku: "RCH-1",
          originalQuantity,
        }).success,
      ).toBe(false);
    }
  });
});
