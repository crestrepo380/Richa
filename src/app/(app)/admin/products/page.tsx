import type { Metadata } from "next";
import Link from "next/link";
import { Package, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { categoryLabel } from "@/lib/constants";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission("product:manage");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ description: "asc" }, { size: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        sku: true,
        productNumber: true,
        description: true,
        color: true,
        size: true,
        category: true,
        active: true,
      },
    }),
    prisma.product.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"} in the catalog.`}
        actions={
          <Link href="/admin/import">
            <Button size="sm" variant="secondary">
              <Upload className="size-4" aria-hidden />
              Import
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Import your product catalog from Excel to get started."
            action={
              <Link href="/admin/import">
                <Button size="sm">
                  <Upload className="size-4" aria-hidden />
                  Import products
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">SKU</th>
                  <th scope="col" className="px-4 py-3 font-medium">Product</th>
                  <th scope="col" className="px-4 py-3 font-medium">Color / Size</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-3 font-mono text-xs text-muted">{p.sku}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.description}</p>
                      <p className="text-xs text-muted">{p.productNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {[p.color, p.size].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{categoryLabel(p.category)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={p.active ? "success" : "danger"}>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} basePath="/admin/products" />
      )}
    </>
  );
}

function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  return (
    <nav
      className="mt-4 flex items-center justify-between text-sm"
      aria-label="Pagination"
    >
      <span className="text-muted">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`${basePath}?page=${page - 1}`}
            className="rounded-lg border border-line px-3 py-1.5 transition-colors hover:bg-surface-muted"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={`${basePath}?page=${page + 1}`}
            className="rounded-lg border border-line px-3 py-1.5 transition-colors hover:bg-surface-muted"
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
