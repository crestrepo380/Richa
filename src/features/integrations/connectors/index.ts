import type { IntegrationProvider } from "@prisma/client";
import type { IntegrationCapability, IntegrationConnector } from "../types";
import { BaseConnector } from "./base";

/**
 * Provider adapters. Each is a thin subclass declaring its capabilities; the
 * behaviour is inherited (deferred) from BaseConnector until the provider is
 * genuinely implemented. Grouping them here keeps the "add a provider" surface
 * to one file plus a registry entry.
 */

class ShopifyConnector extends BaseConnector {
  readonly provider: IntegrationProvider = "SHOPIFY";
  readonly capabilities: readonly IntegrationCapability[] = [
    "product.import",
    "inventory.push",
    "inventory.pull",
    "order.import",
  ];
}

class FishbowlConnector extends BaseConnector {
  readonly provider: IntegrationProvider = "FISHBOWL";
  readonly capabilities: readonly IntegrationCapability[] = [
    "product.import",
    "inventory.pull",
    "inventory.push",
  ];
}

class HubspotConnector extends BaseConnector {
  readonly provider: IntegrationProvider = "HUBSPOT";
  readonly capabilities: readonly IntegrationCapability[] = ["contact.sync"];
}

class QuickbooksConnector extends BaseConnector {
  readonly provider: IntegrationProvider = "QUICKBOOKS";
  readonly capabilities: readonly IntegrationCapability[] = ["product.import"];
}

class UpsConnector extends BaseConnector {
  readonly provider: IntegrationProvider = "UPS";
  readonly capabilities: readonly IntegrationCapability[] = ["shipping.rates"];
}

class FedexConnector extends BaseConnector {
  readonly provider: IntegrationProvider = "FEDEX";
  readonly capabilities: readonly IntegrationCapability[] = ["shipping.rates"];
}

const CONNECTORS: Record<IntegrationProvider, IntegrationConnector> = {
  SHOPIFY: new ShopifyConnector(),
  FISHBOWL: new FishbowlConnector(),
  HUBSPOT: new HubspotConnector(),
  QUICKBOOKS: new QuickbooksConnector(),
  UPS: new UpsConnector(),
  FEDEX: new FedexConnector(),
};

export function getConnector(provider: IntegrationProvider): IntegrationConnector {
  return CONNECTORS[provider];
}
