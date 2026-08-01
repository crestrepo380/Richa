"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import {
  createDealerSchema,
  dealerSchema,
} from "@/lib/validation/dealer";

export interface DealerActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  dealerId?: string;
}

function fieldErrorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0] != null ? String(issue.path[0]) : "";
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/**
 * Create a dealer, optionally provisioning a linked login.
 *
 * The login is created through the service-role admin client with the dealer's
 * id in user metadata; the Postgres signup trigger reads that metadata and
 * attaches the new profile to this dealer as a DEALER. If login provisioning
 * fails, the dealer record is still created and the admin is told — a partial
 * success beats losing the dealer they just entered.
 */
export async function createDealer(
  _prev: DealerActionState | undefined,
  formData: FormData,
): Promise<DealerActionState> {
  const admin = await requirePermission("dealer:create");

  const parsed = createDealerSchema.safeParse({
    company: formData.get("company"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    createLogin: formData.get("createLogin") === "on" || formData.get("createLogin") === "true",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const data = parsed.data;

  const existing = await prisma.dealer.findUnique({ where: { email: data.email } });
  if (existing) {
    return {
      status: "error",
      message: "A dealer with that email already exists.",
      fieldErrors: { email: "Already in use." },
    };
  }

  const dealer = await prisma.dealer.create({
    data: {
      company: data.company,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      active: data.active,
    },
  });

  let loginNote = "";
  if (data.createLogin) {
    try {
      const supabase = createAdminClient();
      const env = getServerEnv();
      const { error } = await supabase.auth.admin.inviteUserByEmail(data.email, {
        data: { role: "DEALER", dealer_id: dealer.id, full_name: data.contactName },
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      });
      if (error) throw error;
      loginNote = " An invite email was sent to the dealer.";
    } catch (error) {
      console.error("[dealers] login provisioning failed", error);
      loginNote =
        " The dealer was saved, but the login invite could not be sent — invite them later from the users area.";
    }
  }

  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.dealerCreated,
    metadata: { dealerId: dealer.id, company: dealer.company, loginInvited: data.createLogin },
  });

  revalidatePath("/admin/dealers");

  return {
    status: "success",
    dealerId: dealer.id,
    message: `${dealer.company} was created.${loginNote}`,
  };
}

export async function updateDealer(
  dealerId: string,
  _prev: DealerActionState | undefined,
  formData: FormData,
): Promise<DealerActionState> {
  const admin = await requirePermission("dealer:update");

  const parsed = dealerSchema.safeParse({
    company: formData.get("company"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  // Guard the unique email against collisions with a different dealer.
  const clash = await prisma.dealer.findFirst({
    where: { email: parsed.data.email, NOT: { id: dealerId } },
    select: { id: true },
  });
  if (clash) {
    return {
      status: "error",
      message: "Another dealer already uses that email.",
      fieldErrors: { email: "Already in use." },
    };
  }

  await prisma.dealer.update({
    where: { id: dealerId },
    data: parsed.data,
  });

  await recordAudit({
    userId: admin.id,
    action: AUDIT_ACTIONS.dealerUpdated,
    metadata: { dealerId, active: parsed.data.active },
  });

  revalidatePath("/admin/dealers");
  revalidatePath(`/admin/dealers/${dealerId}`);

  return { status: "success", dealerId, message: "Dealer updated." };
}
