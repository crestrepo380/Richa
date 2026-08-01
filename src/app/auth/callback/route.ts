import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { homeRouteFor } from "@/lib/auth/roles";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";

/**
 * Exchanges the PKCE code from a magic link (or password-reset link) for a
 * session cookie, then routes the user to the dashboard matching their role.
 * This is the endpoint the "Update Inventory" button in reminder emails lands
 * on, so the dealer goes straight from inbox to their inventory form.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });

  await recordAudit({
    userId: data.user.id,
    action: AUDIT_ACTIONS.authLogin,
    metadata: { method: "magic_link" },
  });

  const destination =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : homeRouteFor(profile?.role ?? "DEALER");

  return NextResponse.redirect(`${origin}${destination}`);
}
