import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/dal";

/**
 * Shell for every authenticated route. Requiring the session here means no page
 * inside this group can render for an anonymous visitor, but each nested layout
 * still enforces its own role check — defence in depth rather than relying on a
 * single gate.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <AppShell
      user={{
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        dealerName: user.dealerName,
      }}
    >
      {children}
    </AppShell>
  );
}
