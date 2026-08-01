"use server";

import { revalidatePath } from "next/cache";
import type { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { encryptSecret } from "@/lib/crypto";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import { getDescriptor, secretKeys } from "./registry";
import { getConnector } from "./connectors";
import { getDecryptedConfig } from "./queries";

export interface IntegrationActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

function isProvider(value: string): value is IntegrationProvider {
  return ["SHOPIFY", "FISHBOWL", "HUBSPOT", "QUICKBOOKS", "UPS", "FEDEX"].includes(value);
}

/**
 * Save an integration's configuration and mark it connected.
 *
 * Secret fields are encrypted before storage; a blank secret means "keep the
 * existing value" so editing non-secret fields never wipes stored credentials.
 * Everything is gated on the super-admin `integration:manage` permission.
 */
export async function saveIntegration(
  provider: string,
  _prev: IntegrationActionState | undefined,
  formData: FormData,
): Promise<IntegrationActionState> {
  const user = await requirePermission("integration:manage");

  if (!isProvider(provider)) {
    return { status: "error", message: "Unknown provider." };
  }

  const descriptor = getDescriptor(provider);
  const secrets = secretKeys(provider);
  const existing = await getDecryptedConfig(provider);

  const config: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};

  for (const field of descriptor.configFields) {
    const submitted = String(formData.get(field.key) ?? "").trim();

    if (field.secret) {
      // Blank secret = keep the previously stored one.
      const value = submitted || existing[field.key] || "";
      if (field.required && !value) fieldErrors[field.key] = "Required.";
      if (value) config[field.key] = value;
    } else {
      if (field.required && !submitted) fieldErrors[field.key] = "Required.";
      if (submitted) config[field.key] = submitted;
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please complete the required fields.", fieldErrors };
  }

  // Encrypt secrets at rest.
  const storedConfig: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    storedConfig[key] = secrets.has(key) ? encryptSecret(value) : value;
  }

  await prisma.integrationConnection.upsert({
    where: { provider },
    update: { config: storedConfig, status: "CONNECTED" },
    create: { provider, config: storedConfig, status: "CONNECTED" },
  });

  await recordAudit({
    userId: user.id,
    action: AUDIT_ACTIONS.integrationUpdated,
    metadata: { provider, connected: true },
  });

  revalidatePath("/super-admin/integrations");
  return { status: "success", message: `${descriptor.name} settings saved.` };
}

export async function disconnectIntegration(
  provider: string,
): Promise<IntegrationActionState> {
  const user = await requirePermission("integration:manage");
  if (!isProvider(provider)) {
    return { status: "error", message: "Unknown provider." };
  }

  // Clear stored config (including secrets) on disconnect.
  await prisma.integrationConnection.upsert({
    where: { provider },
    update: { status: "DISCONNECTED", config: {} },
    create: { provider, status: "DISCONNECTED", config: {} },
  });

  await recordAudit({
    userId: user.id,
    action: AUDIT_ACTIONS.integrationUpdated,
    metadata: { provider, connected: false },
  });

  revalidatePath("/super-admin/integrations");
  return { status: "success", message: `${getDescriptor(provider).name} disconnected.` };
}

/**
 * Test a connection using the stored (decrypted) config. Connectors are
 * deferred, so today this reports the scaffolded status and flips the row to
 * ERROR/CONNECTED accordingly — the wiring is real even though the provider
 * call is not.
 */
export async function testIntegration(
  provider: string,
): Promise<IntegrationActionState> {
  await requirePermission("integration:manage");
  if (!isProvider(provider)) {
    return { status: "error", message: "Unknown provider." };
  }

  const config = await getDecryptedConfig(provider);
  const connector = getConnector(provider);

  try {
    const result = await connector.testConnection({ config });
    await prisma.integrationConnection.updateMany({
      where: { provider },
      data: { status: result.ok ? "CONNECTED" : "ERROR" },
    });
    revalidatePath("/super-admin/integrations");
    return { status: result.ok ? "success" : "error", message: result.message };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Test failed.",
    };
  }
}
