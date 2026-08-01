import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  hasPermission,
  homeRouteFor,
  type Permission,
  type Role,
} from "@/lib/auth/roles";

/**
 * Data Access Layer — the single authority on "who is asking".
 *
 * Every server-side read or mutation should start here rather than trusting a
 * route's position in the folder tree. The proxy only performs an optimistic
 * cookie check to keep redirects fast; real authorization lives in this file,
 * as close to the data as possible.
 *
 * `cache()` memoizes per render pass, so calling `requireUser()` in a layout
 * and again in a page costs one Supabase call and one query, not two.
 */

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  dealerId: string | null;
  dealerName: string | null;
}

/** Returns the signed-in user, or null. Never redirects. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  // getUser() revalidates the JWT with Supabase. Never trust getSession()
  // for authorization — its payload comes straight from the cookie.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      dealerId: true,
      dealer: { select: { company: true, active: true } },
    },
  });

  // Authenticated with Supabase but no profile row yet: the sync trigger has
  // not fired, or the account was provisioned outside the normal flow.
  if (!profile) return null;

  // A deactivated dealer keeps valid credentials but loses access.
  if (profile.role === "DEALER" && profile.dealer && !profile.dealer.active) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    dealerId: profile.dealerId,
    dealerName: profile.dealer?.company ?? null,
  };
});

/** Requires a signed-in user, redirecting to login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Requires a specific capability. Users who are signed in but lack the
 * permission go to their own dashboard rather than a dead end.
 */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireUser();

  if (!hasPermission(user.role, permission)) {
    redirect(`/unauthorized?from=${encodeURIComponent(permission)}`);
  }

  return user;
}

/** Requires a dealer-scoped account with a dealer actually attached. */
export async function requireDealer(): Promise<SessionUser & { dealerId: string }> {
  const user = await requireUser();

  if (user.role !== "DEALER") {
    redirect(homeRouteFor(user.role));
  }

  if (!user.dealerId) {
    redirect("/unauthorized?from=no-dealer-assigned");
  }

  return user as SessionUser & { dealerId: string };
}

/**
 * Resolves which dealer the caller may act on.
 *
 * Dealers are pinned to their own record regardless of what the request asks
 * for — this is the check that stops one dealer from reading another's numbers
 * by editing a URL. Admins may target any dealer.
 */
export async function resolveDealerScope(
  requestedDealerId?: string | null,
): Promise<{ user: SessionUser; dealerId: string | null }> {
  const user = await requireUser();

  if (user.role === "DEALER") {
    return { user, dealerId: user.dealerId };
  }

  return { user, dealerId: requestedDealerId ?? null };
}
