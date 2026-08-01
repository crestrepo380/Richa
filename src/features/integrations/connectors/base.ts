import type { IntegrationProvider } from "@prisma/client";
import {
  NotImplementedError,
  type IntegrationCapability,
  type IntegrationConnector,
  type SyncResult,
  type TestResult,
} from "../types";

/**
 * Shared connector base. Concrete providers extend this and, for now, inherit
 * the deferred behaviour: `testConnection` reports "not configured yet" and
 * `sync` throws `NotImplemented`. When a provider is actually built, it
 * overrides just the methods it supports — nothing else in the app changes.
 */
export abstract class BaseConnector implements IntegrationConnector {
  abstract readonly provider: IntegrationProvider;
  abstract readonly capabilities: readonly IntegrationCapability[];

  // Params from the interface are omitted here (a narrower signature still
  // satisfies IntegrationConnector); real adapters add them back as needed.
  async testConnection(): Promise<TestResult> {
    return {
      ok: false,
      message:
        "This integration is scaffolded but not implemented yet. Connection saved; syncing is coming soon.",
    };
  }

  async sync(capability: IntegrationCapability): Promise<SyncResult> {
    throw new NotImplementedError(this.provider, `sync:${capability}`);
  }

  protected supports(capability: IntegrationCapability): boolean {
    return this.capabilities.includes(capability);
  }
}
