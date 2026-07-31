"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { homeRouteFor } from "@/lib/auth/roles";
import { loginSchema, magicLinkSchema } from "@/lib/validation/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import { getServerEnv } from "@/lib/env";

export interface AuthActionState {
  error?: string;
  success?: string;
}

/**
 * Password sign-in.
 *
 * Error messages are intentionally generic ("Invalid email or password") so the
 * form cannot be used to enumerate which addresses have accounts.
 */
export async function signInWithPassword(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const { email, password } = parsed.data;
  const ip = await getRequestIp();

  // Keyed on IP *and* email so one attacker cannot lock out a real user, and a
  // spoofed IP still hits a per-account cap.
  const rate = checkRateLimit(
    `login:${ip}:${email}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs,
  );

  if (!rate.success) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    await recordAudit({
      action: AUDIT_ACTIONS.authLoginFailed,
      metadata: { email, ip },
    });
    return { error: "Invalid email or password." };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });

  await recordAudit({
    userId: data.user.id,
    action: AUDIT_ACTIONS.authLogin,
    metadata: { ip },
  });

  const redirectTo = formData.get("redirectTo");
  const safePath =
    typeof redirectTo === "string" && isSafeRedirect(redirectTo)
      ? redirectTo
      : homeRouteFor(profile?.role ?? "DEALER");

  redirect(safePath);
}

/**
 * Sends a one-click magic link — the path the Monday reminder emails use, so a
 * dealer can go from inbox to inventory form without remembering a password.
 */
export async function sendMagicLink(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const { email } = parsed.data;
  const ip = await getRequestIp();

  const rate = checkRateLimit(
    `magic:${ip}:${email}`,
    RATE_LIMITS.magicLink.limit,
    RATE_LIMITS.magicLink.windowMs,
  );

  if (!rate.success) {
    return { error: "Too many requests. Please try again shortly." };
  }

  const env = getServerEnv();
  const supabase = await createClient();

  await supabase.auth.signInWithOtp({
    email,
    options: {
      // Only pre-existing dealers should be able to get in this way; a magic
      // link must never quietly create a brand-new account.
      shouldCreateUser: false,
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  // Always report success, regardless of whether the address exists — the
  // response must not reveal who is registered.
  return {
    success: "Check your email for a sign-in link. It expires in one hour.",
  };
}

/** Only same-origin absolute paths, to block open-redirect abuse. */
function isSafeRedirect(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
