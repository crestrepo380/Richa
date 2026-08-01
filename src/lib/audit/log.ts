import { prisma } from "@/lib/db";

/**
 * Audit trail. Actions use a stable `resource.verb` naming scheme so logs stay
 * filterable as the system grows.
 */
export const AUDIT_ACTIONS = {
  authLogin: "auth.login",
  authLoginFailed: "auth.login_failed",
  authLogout: "auth.logout",
  inventoryUpdated: "inventory.updated",
  inventoryImported: "inventory.imported",
  reportSubmitted: "report.submitted",
  reportExported: "report.exported",
  dealerCreated: "dealer.created",
  dealerUpdated: "dealer.updated",
  productImported: "product.imported",
  reminderSent: "reminder.sent",
  emailTemplateSaved: "email_template.saved",
  userRoleChanged: "user.role_changed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Writes an audit entry. Deliberately never throws: an audit failure must not
 * roll back the business action the user just completed successfully. Failures
 * are surfaced to server logs instead.
 */
export async function recordAudit({
  userId,
  action,
  metadata,
}: {
  userId?: string | null;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record entry", { action, error });
  }
}
