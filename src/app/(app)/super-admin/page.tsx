import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Administration" };

/**
 * The super-admin area has no dashboard of its own — user management is the
 * landing screen, so send arrivals straight there.
 */
export default async function SuperAdminPage() {
  await requirePermission("user:manage");
  redirect("/super-admin/users");
}
