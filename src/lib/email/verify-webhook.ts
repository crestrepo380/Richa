import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Resend (Svix) webhook signature.
 *
 * Resend signs with the Svix scheme: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${rawBody}`, keyed by the base64 secret that
 * follows the `whsec_` prefix, encoded base64. The `svix-signature` header may
 * carry several space-separated `v1,<sig>` values; any match passes.
 *
 * Implemented with Node crypto rather than pulling in the svix SDK for one
 * function. Returns false on any malformed input rather than throwing.
 */
export function verifyResendSignature({
  secret,
  headers,
  rawBody,
}: {
  secret: string;
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  };
  rawBody: string;
}): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const key = secret.startsWith("whsec_") ? secret.slice(6) : secret;

  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(key, "base64");
  } catch {
    return false;
  }

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", keyBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Header looks like "v1,sig1 v1,sig2" — compare against each provided sig.
  return signature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const provided = Buffer.from(sig);
    return (
      provided.length === expectedBuf.length &&
      timingSafeEqual(provided, expectedBuf)
    );
  });
}
