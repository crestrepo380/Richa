import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

const ROLE_TONES: Record<Role, "neutral" | "brand" | "warning"> = {
  DEALER: "neutral",
  ADMIN: "brand",
  SUPER_ADMIN: "warning",
};

export default async function UsersPage() {
  await requirePermission("user:manage");

  const users = await prisma.profile.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    take: 100,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      dealer: { select: { company: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with access to the portal, and the role that governs what they can see."
      />

      <Card className="overflow-hidden">
        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Users appear here as soon as they are invited."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Email</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Dealership</th>
                  <th scope="col" className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-3">{u.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {u.dealer?.company ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
