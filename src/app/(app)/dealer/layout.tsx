import { requireDealer } from "@/lib/auth/dal";

/**
 * Guards every dealer-scoped route. `requireDealer` rejects staff accounts and
 * dealer accounts with no dealership attached, so pages below can assume a valid
 * dealer context exists.
 */
export default async function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDealer();
  return <>{children}</>;
}
