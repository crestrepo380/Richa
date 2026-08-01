import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getDealerOptions } from "@/features/admin/queries";
import { DashboardFilters } from "@/features/admin/dashboard-filters";
import { categoryLabel } from "@/lib/constants";
import { isLowStock } from "@/lib/business/inventory";

export const metadata: Metadata = { title: "Inventory" };

const PAGE_SIZE = 30;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ dealerId?: string; category?: string; page?: string }>;
}) {
  await requirePermission("inventory:view:all");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.DealerInventoryWhereInput = {
    ...(sp.dealerId ? { dealerId: sp.dealerId } : {}),
    ...(sp.category ? { product: { category: sp.category as never } } : {}),
  };

  const [dealers, rows, total] = await Promise.all([
    getDealerOptions(),
    prisma.dealerInventory.findMany({
      where,
      orderBy: [{ dealer: { company: "asc" } }, { product: { description: "asc" } }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        originalQuantity: true,
        currentOnHand: true,
        unitsSold: true,
        replenishQuantity: true,
        dealer: { select: { company: true } },
        product: { select: { sku: true, description: true, color: true, size: true, category: true } },
      },
    }),
    prisma.dealerInventory.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = new URLSearchParams();
  if (sp.dealerId) query.set("dealerId", sp.dealerId);
  if (sp.category) query.set("category", sp.category);

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${total} inventory row${total === 1 ? "" : "s"} across dealers.`}
        actions={
          <Link href={`/api/reports/export?report=weekly-replenishment&format=xlsx&${query.toString()}`}>
            <Button size="sm" variant="secondary">
              <FileSpreadsheet className="size-4" aria-hidden />
              Export replenishment
            </Button>
          </Link>
        }
      />

      <DashboardFilters dealers={dealers} />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory found"
            description="Adjust the filters, or import dealer inventory from Excel."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Dealer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Product</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Received</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">On hand</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Sold</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Restock</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const low = isLowStock({
                    originalQuantity: r.originalQuantity,
                    currentOnHand: r.currentOnHand,
                  });
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-3">{r.dealer.company}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.product.description}</p>
                        <p className="font-mono text-xs text-muted">
                          {r.product.sku}
                          {[r.product.color, r.product.size].filter(Boolean).length
                            ? ` · ${[r.product.color, r.product.size].filter(Boolean).join(" / ")}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">{categoryLabel(r.product.category)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{r.originalQuantity}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {r.currentOnHand === 0 ? (
                          <Badge tone="danger">0</Badge>
                        ) : low ? (
                          <Badge tone="warning">{r.currentOnHand}</Badge>
                        ) : (
                          r.currentOnHand
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-medium text-success">
                        {r.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{r.replenishQuantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/inventory?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) }).toString()}`}
                className="rounded-lg border border-line px-3 py-1.5 transition-colors hover:bg-surface-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/inventory?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) }).toString()}`}
                className="rounded-lg border border-line px-3 py-1.5 transition-colors hover:bg-surface-muted"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
