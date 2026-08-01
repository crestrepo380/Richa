import { describe, expect, it } from "vitest";
import { PROVIDER_ORDER, PROVIDER_REGISTRY, secretKeys } from "./registry";
import { getConnector } from "./connectors";

describe("provider registry", () => {
  it("has a descriptor for every ordered provider", () => {
    for (const provider of PROVIDER_ORDER) {
      expect(PROVIDER_REGISTRY[provider]).toBeDefined();
      expect(PROVIDER_REGISTRY[provider].provider).toBe(provider);
    }
  });

  it("pairs every descriptor with a connector whose capabilities match", () => {
    for (const provider of PROVIDER_ORDER) {
      const descriptor = PROVIDER_REGISTRY[provider];
      const connector = getConnector(provider);
      expect(connector.provider).toBe(provider);
      // Registry and connector must advertise the same capabilities.
      expect([...connector.capabilities].sort()).toEqual(
        [...descriptor.capabilities].sort(),
      );
    }
  });

  it("marks credential fields as secret", () => {
    // Every provider needs at least one secret credential field.
    for (const provider of PROVIDER_ORDER) {
      expect(secretKeys(provider).size).toBeGreaterThan(0);
    }
  });
});

describe("deferred connectors", () => {
  it("report not-implemented from testConnection rather than throwing", async () => {
    const result = await getConnector("SHOPIFY").testConnection({ config: {} });
    expect(result.ok).toBe(false);
  });

  it("throw NotImplemented from sync", async () => {
    await expect(
      getConnector("SHOPIFY").sync("product.import", { config: {} }),
    ).rejects.toThrow(/not implemented/i);
  });
});
