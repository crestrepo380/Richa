import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { DealerForm } from "@/features/dealers/dealer-form";
import { updateDealer } from "@/features/dealers/actions";

export const metadata: Metadata = { title: "Edit dealer" };

export default async function EditDealerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("dealer:update");
  const { id } = await params;

  const dealer = await prisma.dealer.findUnique({
    where: { id },
    select: {
      id: true,
      company: true,
      contactName: true,
      email: true,
      phone: true,
      active: true,
    },
  });

  if (!dealer) notFound();

  // Bind the dealer id server-side; the bound action is safe to hand to a
  // Client Component and can't have its target id swapped by the browser.
  const action = updateDealer.bind(null, dealer.id);

  return (
    <>
      <Link
        href="/admin/dealers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to dealers
      </Link>
      <PageHeader title={dealer.company} description="Edit dealership details." />
      <DealerForm
        action={action}
        mode="edit"
        defaults={{
          company: dealer.company,
          contactName: dealer.contactName,
          email: dealer.email,
          phone: dealer.phone ?? "",
          active: dealer.active,
        }}
      />
    </>
  );
}
