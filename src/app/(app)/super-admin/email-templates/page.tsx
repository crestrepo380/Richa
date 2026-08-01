import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MousePointerClick, MailOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { DEFAULT_TEMPLATES, knownTemplateNames } from "@/features/email/templates";

export const metadata: Metadata = { title: "Email Templates" };

export default async function EmailTemplatesPage() {
  await requirePermission("email_template:manage");

  const [dbTemplates, notifTotals, opened, clicked] = await Promise.all([
    prisma.emailTemplate.findMany({ select: { name: true, subject: true, active: true } }),
    prisma.notification.count(),
    prisma.notification.count({ where: { opened: true } }),
    prisma.notification.count({ where: { clicked: true } }),
  ]);

  const dbByName = new Map(dbTemplates.map((t) => [t.name, t]));
  const names = knownTemplateNames(dbTemplates.map((t) => t.name));

  return (
    <>
      <PageHeader
        title="Email Templates"
        description="Customize the emails dealers receive. Templates support {{variables}}."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Emails sent" value={notifTotals} icon={Mail} tone="brand" />
        <StatCard label="Opened" value={opened} icon={MailOpen} tone="success" />
        <StatCard label="Clicked" value={clicked} icon={MousePointerClick} tone="success" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Template</th>
                <th scope="col" className="px-4 py-3 font-medium">Subject</th>
                <th scope="col" className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {names.map((name) => {
                const db = dbByName.get(name);
                const subject = db?.subject ?? DEFAULT_TEMPLATES[name]?.subject ?? "";
                return (
                  <tr key={name} className="border-t border-line hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/email-templates/${name}`}
                        className="font-medium text-brand underline-offset-4 hover:underline"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{subject}</td>
                    <td className="px-4 py-3">
                      {db ? (
                        <Badge tone={db.active ? "success" : "neutral"}>
                          {db.active ? "Customized" : "Customized (inactive)"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Default</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
