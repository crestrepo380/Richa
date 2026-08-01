import "server-only";

import { prisma } from "@/lib/db";
import type { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { PROVIDER_ORDER, getDescriptor, secretKeys } from "./registry";
import type { ProviderDescriptor } from "./types";

/**
 * Read layer for integrations. Merges the static registry (what's possible)
 * with the persisted `IntegrationConnection` rows (what's configured), and
 * REDACTS secret config values before anything reaches the client — the UI
 * only learns whether a secret is set, never its value.
 */

export interface IntegrationView {
  descriptor: ProviderDescriptor;
  status: IntegrationStatus;
  lastSyncAt: Date | null;
  /** Non-secret config values; secret fields collapse to a boolean "is set". */
  config: Record<string, string>;
  secretsSet: Record<string, boolean>;
  connected: boolean;
}

export async function getIntegrations(): Promise<IntegrationView[]> {
  const rows = await prisma.integrationConnection.findMany();
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return PROVIDER_ORDER.map((provider) => {
    const descriptor = getDescriptor(provider);
    const row = byProvider.get(provider);
    const secrets = secretKeys(provider);

    const rawConfig = (row?.config as Record<string, string> | null) ?? {};
    const config: Record<string, string> = {};
    const secretsSet: Record<string, boolean> = {};

    for (const field of descriptor.configFields) {
      if (field.secret) {
        secretsSet[field.key] = Boolean(rawConfig[field.key]);
      } else if (rawConfig[field.key] !== undefined) {
        config[field.key] = rawConfig[field.key];
      }
    }
    // Defensive: ensure no secret ever slips through even if the registry and
    // stored data drift.
    for (const key of secrets) delete config[key];

    return {
      descriptor,
      status: row?.status ?? "DISCONNECTED",
      lastSyncAt: row?.lastSyncAt ?? null,
      config,
      secretsSet,
      connected: (row?.status ?? "DISCONNECTED") === "CONNECTED",
    };
  });
}

/**
 * Server-internal: the full, DECRYPTED config for a connector to use. Never
 * expose the result to the client. Used by test/sync actions.
 */
export async function getDecryptedConfig(
  provider: IntegrationProvider,
): Promise<Record<string, string>> {
  const row = await prisma.integrationConnection.findUnique({ where: { provider } });
  const raw = (row?.config as Record<string, string> | null) ?? {};
  const secrets = secretKeys(provider);

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key] = secrets.has(key) ? decryptSecret(value) : value;
  }
  return result;
}
