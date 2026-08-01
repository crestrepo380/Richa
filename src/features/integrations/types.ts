import type { IntegrationProvider } from "@prisma/client";

/**
 * Integration architecture (Phase 6).
 *
 * This is the *foundation* for future integrations, not the integrations
 * themselves. The goal from the brief: structure the code so Shopify, Fishbowl,
 * HubSpot, QuickBooks, UPS, and FedEx can be added later without touching
 * anything but a registry entry and one connector class.
 *
 * The design is a classic ports-and-adapters split:
 *   - `IntegrationConnector` is the *port* — the stable contract the rest of the
 *     app depends on.
 *   - Each provider ships an *adapter* implementing that port.
 *   - The registry maps a provider enum to its adapter + descriptive metadata.
 *
 * Connectors are intentionally stubbed today (they throw `NotImplemented`), so
 * the UI, persistence, and capability model are all real and testable while the
 * actual provider API calls are deferred.
 */

export type { IntegrationProvider };

/**
 * Named capabilities a connector may support. The portal reasons about what an
 * integration can do in terms of these, never provider-specific concepts, so a
 * feature like "sync inventory to Shopify" is expressed once and lights up for
 * any connector declaring `inventory.push`.
 */
export const INTEGRATION_CAPABILITIES = [
  "product.import", // pull products/catalog in
  "inventory.push", // push on-hand / replenishment out
  "inventory.pull", // pull stock levels in
  "order.import", // pull sales orders in (to auto-derive units sold)
  "contact.sync", // sync dealers as CRM contacts
  "shipping.rates", // fetch carrier rates / tracking
] as const;
export type IntegrationCapability = (typeof INTEGRATION_CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<IntegrationCapability, string> = {
  "product.import": "Import products",
  "inventory.push": "Push inventory",
  "inventory.pull": "Pull stock levels",
  "order.import": "Import orders",
  "contact.sync": "Sync contacts",
  "shipping.rates": "Shipping & tracking",
};

/** A single configuration field a provider needs (rendered by the UI). */
export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
  help?: string;
  /** Secret fields are never sent back to the client once stored. */
  secret?: boolean;
}

export interface ConnectorContext {
  /** Persisted, decrypted config for this connection. */
  config: Record<string, string>;
}

export interface TestResult {
  ok: boolean;
  message: string;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  processed?: number;
}

/**
 * The port every provider adapter implements. Methods a provider can't support
 * simply aren't reflected in its `capabilities`, and the base class throws
 * `NotImplemented` for anything called that isn't wired yet.
 */
export interface IntegrationConnector {
  readonly provider: IntegrationProvider;
  readonly capabilities: readonly IntegrationCapability[];

  /** Verify credentials/reachability without mutating anything. */
  testConnection(ctx: ConnectorContext): Promise<TestResult>;

  /** Run a capability's sync. Deferred — throws NotImplemented for now. */
  sync(capability: IntegrationCapability, ctx: ConnectorContext): Promise<SyncResult>;
}

export class NotImplementedError extends Error {
  constructor(provider: IntegrationProvider, what: string) {
    super(`${provider} integration: "${what}" is not implemented yet.`);
    this.name = "NotImplementedError";
  }
}

/** Descriptive metadata for the registry + UI. */
export interface ProviderDescriptor {
  provider: IntegrationProvider;
  name: string;
  category: "E-commerce" | "Inventory" | "CRM" | "Accounting" | "Shipping";
  description: string;
  capabilities: readonly IntegrationCapability[];
  configFields: ConfigField[];
  docsUrl?: string;
}
