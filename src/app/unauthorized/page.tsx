import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getUser } from "@/lib/auth/dal";
import { homeRouteFor } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Access denied",
};

const REASONS: Record<string, string> = {
  "no-dealer-assigned":
    "Your account is not linked to a dealership yet. Contact your account representative so they can finish setting you up.",
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const user = await getUser();

  const explanation =
    (from && REASONS[from]) ??
    "You do not have permission to view that page. If you believe this is a mistake, contact your administrator.";

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center px-4"
    >
      <div className="max-w-md space-y-5 text-center">
        <div
          className="mx-auto grid size-12 place-items-center rounded-full bg-warning-muted"
          aria-hidden
        >
          <ShieldAlert className="size-6 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-sm text-muted">{explanation}</p>
        </div>
        <Link
          href={user ? homeRouteFor(user.role) : "/login"}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-muted"
        >
          {user ? "Back to my dashboard" : "Go to sign in"}
        </Link>
      </div>
    </main>
  );
}
