import { headers } from "next/headers";

/**
 * Best-effort client IP for rate-limit keys.
 *
 * Only trustworthy behind a proxy that overwrites these headers (Vercel does).
 * Rate-limit keys should therefore combine the IP with a stable identifier such
 * as the submitted email, so a spoofed header cannot lift the cap outright.
 */
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return headerList.get("x-real-ip") ?? "unknown";
}
