import "server-only";

import { prisma } from "@/lib/db";

/**
 * Named email templates. Code ships sensible defaults; a super-admin can
 * override any of them in the database (Email Templates screen). Resolving a
 * template always falls back to the default, so a missing/renamed DB row never
 * stops an email from going out.
 */

export interface TemplateContent {
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export const DEFAULT_TEMPLATES: Record<string, TemplateContent> = {
  weekly_reminder: {
    name: "weekly_reminder",
    subject: "Weekly Inventory Reminder — {{week}}",
    body: [
      "Hello {{dealer_name}},",
      "",
      "Please update your inventory for the week of {{week}}.",
      "",
      "It takes about two minutes — just tell us how many units you have on hand, and we calculate the rest.",
      "",
      "{{update_button}}",
    ].join("\n"),
    variables: ["dealer_name", "week", "update_button"],
  },
  overdue_notice: {
    name: "overdue_notice",
    subject: "Overdue: Weekly Inventory for {{week}}",
    body: [
      "Hello {{dealer_name}},",
      "",
      "We haven't received your inventory update for the week of {{week}}, so your dealership is now marked overdue.",
      "",
      "Please submit as soon as you can:",
      "",
      "{{update_button}}",
    ].join("\n"),
    variables: ["dealer_name", "week", "update_button"],
  },
  welcome: {
    name: "welcome",
    subject: "Welcome to the Inventory Portal",
    body: [
      "Hello {{dealer_name}},",
      "",
      "Your access to the Inventory Portal is ready. Each week you'll update your on-hand counts here:",
      "",
      "{{update_button}}",
    ].join("\n"),
    variables: ["dealer_name", "update_button"],
  },
};

/** Resolve a template by name: DB override if present and active, else default. */
export async function resolveTemplate(name: string): Promise<TemplateContent> {
  const fromDb = await prisma.emailTemplate.findUnique({ where: { name } });
  if (fromDb && fromDb.active) {
    return {
      name: fromDb.name,
      subject: fromDb.subject,
      body: fromDb.body,
      variables: fromDb.variables,
    };
  }
  const fallback = DEFAULT_TEMPLATES[name];
  if (!fallback) throw new Error(`No template named "${name}"`);
  return fallback;
}

/** Template names known to the app: defaults plus any DB-only additions. */
export function knownTemplateNames(dbNames: string[]): string[] {
  return [...new Set([...Object.keys(DEFAULT_TEMPLATES), ...dbNames])];
}

/** The template name used for a given reminder stage. */
export function templateNameForReminder(reminderNumber: number): string {
  // All three reminders share one template today; kept as a function so the
  // stages can diverge (escalating copy) without touching the job.
  return reminderNumber >= 4 ? "overdue_notice" : "weekly_reminder";
}
