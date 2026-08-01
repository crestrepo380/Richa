import "server-only";

import { prisma } from "@/lib/db";
import { getWeekStart, formatWeekRange } from "@/lib/week";
import { renderHtml, renderText } from "@/lib/email/template";
import { renderEmailShell, emailButton } from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/resend";
import { buildDealerInventoryLink } from "@/lib/email/magic-link";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit/log";
import type { EmailType } from "@prisma/client";
import { reminderPlanForDate, type ReminderEmailType } from "./reminder-plan";
import { resolveTemplate, templateNameForReminder } from "./templates";

export interface ReminderRunSummary {
  ranAt: string;
  weekday: number;
  action: ReminderEmailType | "MARK_OVERDUE" | "NONE";
  eligibleDealers: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  markedOverdue: number;
}

/**
 * Executes today's reminder policy (see reminder-plan.ts). Idempotent: a
 * reminder of a given type is sent to a dealer at most once per week, so
 * re-running the cron the same day is safe. Dealers who have already submitted
 * are always skipped.
 */
export async function runWeeklyReminders(
  now: Date = new Date(),
): Promise<ReminderRunSummary> {
  const plan = reminderPlanForDate(now);
  const week = getWeekStart(now);
  const weekLabel = formatWeekRange(week);

  const summary: ReminderRunSummary = {
    ranAt: now.toISOString(),
    weekday: now.getUTCDay(),
    action: plan.emailType ?? (plan.markOverdue ? "MARK_OVERDUE" : "NONE"),
    eligibleDealers: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    markedOverdue: 0,
  };

  if (!plan.emailType && !plan.markOverdue) return summary;

  // Active dealers whose report for this week isn't submitted.
  const dealers = await prisma.dealer.findMany({
    where: { active: true },
    select: {
      id: true,
      company: true,
      contactName: true,
      email: true,
      weeklyReports: {
        where: { week },
        select: { id: true, submitted: true },
      },
    },
  });

  const pending = dealers.filter((d) => !d.weeklyReports[0]?.submitted);
  summary.eligibleDealers = pending.length;

  for (const dealer of pending) {
    // Ensure a report row exists so status/reminderCount have somewhere to live.
    const report = await prisma.weeklyReport.upsert({
      where: { dealerId_week: { dealerId: dealer.id, week } },
      update: {},
      create: { dealerId: dealer.id, week, status: "PENDING" },
      select: { id: true },
    });

    if (plan.markOverdue) {
      await prisma.weeklyReport.update({
        where: { id: report.id },
        data: { status: "OVERDUE" },
      });
      summary.markedOverdue += 1;
      continue;
    }

    if (!plan.emailType) continue;

    // Per-week idempotency: skip if this reminder type already went out.
    const already = await prisma.notification.findFirst({
      where: { dealerId: dealer.id, week, emailType: plan.emailType as EmailType },
      select: { id: true },
    });
    if (already) {
      summary.emailsSkipped += 1;
      continue;
    }

    const template = await resolveTemplate(
      templateNameForReminder(plan.reminderNumber ?? 1),
    );
    const link = await buildDealerInventoryLink(dealer.email);

    const vars = {
      dealer_name: dealer.contactName || dealer.company,
      week: weekLabel,
      reminder_number: plan.reminderNumber ?? 1,
    };

    const subject = renderText(template.subject, vars);
    // Render every variable except update_button (left as its token, since
    // renderHtml preserves unknown tokens), then inject the real button HTML —
    // this keeps the button markup out of renderHtml's value-escaping.
    const bodyHtml = renderHtml(template.body, vars).replace(
      /\{\{\s*update_button\s*\}\}/g,
      emailButton("Update Inventory", link),
    );
    const html = renderEmailShell({ heading: subject, bodyHtml, preview: subject });
    const text = renderText(template.body, { ...vars, update_button: link });

    const result = await sendEmail({ to: dealer.email, subject, html, text });

    await prisma.notification.create({
      data: {
        dealerId: dealer.id,
        emailType: plan.emailType as EmailType,
        week,
        providerMessageId: result.ok ? result.id : null,
      },
    });

    await prisma.weeklyReport.update({
      where: { id: report.id },
      data: { reminderCount: { increment: 1 } },
    });

    if (result.ok) summary.emailsSent += 1;
    else if (result.skipped) summary.emailsSkipped += 1;
    else summary.emailsFailed += 1;
  }

  await recordAudit({
    action: AUDIT_ACTIONS.reminderSent,
    metadata: { ...summary },
  });

  return summary;
}
