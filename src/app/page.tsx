import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/dal";
import { homeRouteFor } from "@/lib/auth/roles";

/**
 * Entry point. Rather than a marketing page, the root forwards each visitor to
 * the right place — dealers to their inventory form, staff to the admin
 * dashboard, anonymous visitors to login.
 */
export default async function RootPage() {
  const user = await getUser();
  redirect(user ? homeRouteFor(user.role) : "/login");
}
