import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getCurrentWeekStart } from "@/lib/week";

export const metadata: Metadata = { title: "Dealers" };

export default async function DealersPage() {
  await requirePermission("dealer:view:all");
  const week = getCurrentWeekStart();

  const dealers = await prisma.dealer.findMany({
    orderBy: [{ active: "desc" }, { company: "asc" }],
    select: {
      id: true,
      company: true,
      contactName: true,
      email: true,
      active: true,
      _count: { select: { inventory: true } },
      weeklyReports: {
        where: { week },
        select: { submitted: true, status: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Dealers"
        description="Every dealership, their contact, and this week's status."
        actions={
          <Link href="/admin/dealers/new">
            <Button size="sm">
              <Plus className="size-4" aria-hidden />
              New dealer
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        {dealers.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No dealers yet"
            description="Add your first dealer or import a dealer list from Excel."
            action={
              <Link href="/admin/dealers/new">
                <Button size="sm">
                  <Plus className="size-4" aria-hidden />
                  New dealer
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Company</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Products</th>
                  <th scope="col" className="px-4 py-3 font-medium">This week</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => {
                  const report = d.weeklyReports[0];
                  const submitted = report?.submitted ?? false;
                  return (
                    <tr key={d.id} className="border-t border-line hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/dealers/${d.id}`}
                          className="font-medium text-brand underline-offset-4 hover:underline"
                        >
                          {d.company}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p>{d.contactName}</p>
                        <p className="text-xs text-muted">{d.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{d._count.inventory}</td>
                      <td className="px-4 py-3">
                        <Badge tone={submitted ? "success" : report?.status === "OVERDUE" ? "danger" : "warning"}>
                          {submitted ? "Submitted" : report?.status === "OVERDUE" ? "Overdue" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={d.active ? "neutral" : "danger"}>
                          {d.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
