import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { DEFAULT_TEMPLATES } from "@/features/email/templates";
import { TemplateEditor } from "@/features/email/template-editor";

export const metadata: Metadata = { title: "Edit template" };

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  await requirePermission("email_template:manage");
  const { name } = await params;

  const [dbTemplate] = await Promise.all([
    prisma.emailTemplate.findUnique({ where: { name } }),
  ]);
  const fallback = DEFAULT_TEMPLATES[name];

  // Only known defaults or existing DB rows are editable — no arbitrary names.
  if (!dbTemplate && !fallback) notFound();

  const source = dbTemplate ?? fallback;

  return (
    <>
      <Link
        href="/super-admin/email-templates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to templates
      </Link>

      <PageHeader
        title={name}
        description="Edit the subject and body. Changes take effect on the next send."
        actions={
          <Badge tone={dbTemplate ? "success" : "neutral"}>
            {dbTemplate ? "Customized" : "Default"}
          </Badge>
        }
      />

      <TemplateEditor
        name={name}
        isOverridden={Boolean(dbTemplate)}
        defaults={{
          subject: source.subject,
          body: source.body,
          active: dbTemplate?.active ?? true,
          variables: source.variables,
        }}
      />
    </>
  );
}
