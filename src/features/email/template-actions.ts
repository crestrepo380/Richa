"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import { emailTemplateSchema, templateNameSchema } from "@/lib/validation/email-template";
import { extractVariables, renderHtml, renderText } from "@/lib/email/template";
import { renderEmailShell, emailButton } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/resend";

export interface TemplateActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Create or update a named email template. Variables are recomputed from the
 * saved subject/body so the stored `variables` list can never drift from the
 * tokens actually used.
 */
export async function saveTemplate(
  name: string,
  _prev: TemplateActionState | undefined,
  formData: FormData,
): Promise<TemplateActionState> {
  const user = await requirePermission("email_template:manage");

  if (!templateNameSchema.safeParse(name).success) {
    return { status: "error", message: "Invalid template name." };
  }

  const parsed = emailTemplateSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] != null ? String(issue.path[0]) : "";
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const { subject, body, active } = parsed.data;
  const variables = extractVariables(subject, body);

  await prisma.emailTemplate.upsert({
    where: { name },
    update: { subject, body, active, variables },
    create: { name, subject, body, active, variables },
  });

  await recordAudit({
    userId: user.id,
    action: AUDIT_ACTIONS.emailTemplateSaved,
    metadata: { name },
  });

  revalidatePath("/super-admin/email-templates");
  revalidatePath(`/super-admin/email-templates/${name}`);

  return { status: "success", message: "Template saved." };
}

/** Reverts a template to the built-in default by deleting the DB override. */
export async function resetTemplate(name: string): Promise<TemplateActionState> {
  await requirePermission("email_template:manage");
  await prisma.emailTemplate.deleteMany({ where: { name } });
  revalidatePath("/super-admin/email-templates");
  revalidatePath(`/super-admin/email-templates/${name}`);
  return { status: "success", message: "Reverted to the default template." };
}

/** Sends the template to the current admin with sample values, to preview it. */
export async function sendTestEmail(
  name: string,
  subject: string,
  body: string,
): Promise<TemplateActionState> {
  const user = await requirePermission("email_template:manage");

  const sampleVars: Record<string, string> = {
    dealer_name: "Sample Dealer",
    week: "Jul 27 – Aug 2, 2026",
    reminder_number: "1",
  };

  const renderedSubject = renderText(subject, sampleVars);
  const bodyHtml = renderHtml(body, sampleVars).replace(
    /\{\{\s*update_button\s*\}\}/g,
    emailButton("Update Inventory", "#"),
  );
  const html = renderEmailShell({
    heading: renderedSubject,
    bodyHtml,
    preview: renderedSubject,
  });

  const result = await sendEmail({
    to: user.email,
    subject: `[Test] ${renderedSubject}`,
    html,
    text: renderText(body, { ...sampleVars, update_button: "https://example.com" }),
  });

  if (result.ok) {
    return { status: "success", message: `Test email sent to ${user.email}.` };
  }
  if (result.skipped) {
    return {
      status: "error",
      message: "Email isn't configured yet (set RESEND_API_KEY). The preview above still reflects your changes.",
    };
  }
  return { status: "error", message: "Could not send the test email." };
}
