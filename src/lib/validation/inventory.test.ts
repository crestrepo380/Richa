import { describe, expect, it } from "vitest";
import { submitInventorySchema, inventoryLineSchema, MAX_ON_HAND } from "./inventory";

const validId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

describe("inventoryLineSchema", () => {
  it("accepts a non-negative whole count", () => {
    expect(
      inventoryLineSchema.safeParse({ inventoryId: validId, currentOnHand: 6 })
        .success,
    ).toBe(true);
  });

  it("rejects negative, fractional, and oversized counts", () => {
    for (const currentOnHand of [-1, 2.5, MAX_ON_HAND + 1]) {
      expect(
        inventoryLineSchema.safeParse({ inventoryId: validId, currentOnHand })
          .success,
      ).toBe(false);
    }
  });

  it("rejects a non-uuid inventory id", () => {
    expect(
      inventoryLineSchema.safeParse({ inventoryId: "nope", currentOnHand: 1 })
        .success,
    ).toBe(false);
  });
});

describe("submitInventorySchema", () => {
  it("accepts a well-formed submission", () => {
    const result = submitInventorySchema.safeParse({
      lines: [
        { inventoryId: validId, currentOnHand: 6 },
        { inventoryId: otherId, currentOnHand: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty submission", () => {
    expect(submitInventorySchema.safeParse({ lines: [] }).success).toBe(false);
  });

  it("rejects duplicate inventory rows", () => {
    const result = submitInventorySchema.safeParse({
      lines: [
        { inventoryId: validId, currentOnHand: 6 },
        { inventoryId: validId, currentOnHand: 3 },
      ],
    });
    expect(result.success).toBe(false);
  });
});
