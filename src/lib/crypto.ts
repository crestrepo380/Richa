import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/**
 * Authenticated encryption for secrets stored at rest (integration configs).
 *
 * AES-256-GCM with a random 12-byte IV per message; the sealed value is
 * `enc:v1:<iv>:<authTag>:<ciphertext>` (all base64). GCM's auth tag means a
 * tampered ciphertext fails to decrypt rather than returning garbage.
 *
 * If INTEGRATION_ENCRYPTION_KEY is unset (local dev), values are stored in
 * plaintext with a one-time warning — never do that in production. `isEncrypted`
 * lets readers detect and handle legacy/plaintext values transparently.
 */

const PREFIX = "enc:v1:";
let warned = false;

function getKey(): Buffer | null {
  const { INTEGRATION_ENCRYPTION_KEY } = getServerEnv();
  if (!INTEGRATION_ENCRYPTION_KEY) return null;
  const key = Buffer.from(INTEGRATION_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (!warned) {
      console.warn(
        "[crypto] INTEGRATION_ENCRYPTION_KEY not set — storing integration secrets in plaintext. Set it before production.",
      );
      warned = true;
    }
    return plaintext;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return (
    PREFIX +
    [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":")
  );
}

export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) return value; // legacy/plaintext

  const key = getKey();
  if (!key) {
    throw new Error("Cannot decrypt: INTEGRATION_ENCRYPTION_KEY is not set.");
  }

  const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
