import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";

/**
 * Builds the "Update Inventory" link for a dealer.
 *
 * Preferred path: a genuine Supabase magic link that signs the dealer in and
 * lands them on their inventory form — inbox to form, no password. If the
 * dealer has no auth account yet (or link generation fails), it falls back to
 * the login page with a redirect, so the button always works.
 */
export async function buildDealerInventoryLink(email: string): Promise<string> {
  const env = getServerEnv();
  const redirectTo = `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dealer`;
  const fallback = `${env.NEXT_PUBLIC_APP_URL}/login?redirectTo=/dealer`;

  if (!env.SUPABASE_SERVICE_ROLE_KEY) return fallback;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) return fallback;
    return data.properties.action_link;
  } catch {
    return fallback;
  }
}
