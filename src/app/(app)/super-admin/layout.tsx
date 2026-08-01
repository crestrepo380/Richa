import { requirePermission } from "@/lib/auth/dal";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("user:manage");
  return <>{children}</>;
}
