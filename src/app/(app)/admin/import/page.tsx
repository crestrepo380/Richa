import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { ImportClient } from "@/features/import/import-client";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  await requirePermission("inventory:import");

  return (
    <>
      <PageHeader
        title="Import"
        description="Bring products, dealers, and inventory in from Excel. Every row is validated before anything is saved."
      />
      <div className="max-w-3xl">
        <ImportClient />
      </div>
    </>
  );
}
