import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { DealerForm } from "@/features/dealers/dealer-form";
import { createDealer } from "@/features/dealers/actions";

export const metadata: Metadata = { title: "New dealer" };

export default async function NewDealerPage() {
  await requirePermission("dealer:create");

  return (
    <>
      <Link
        href="/admin/dealers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to dealers
      </Link>
      <PageHeader title="New dealer" description="Add a dealership and optionally invite their login." />
      <DealerForm action={createDealer} mode="create" />
    </>
  );
}
