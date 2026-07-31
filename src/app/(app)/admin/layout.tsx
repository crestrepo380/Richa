import { requirePermission } from "@/lib/auth/dal";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("inventory:view:all");
  return <>{children}</>;
}
