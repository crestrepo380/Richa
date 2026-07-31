import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div
          className="mx-auto grid size-11 place-items-center rounded-xl bg-brand text-base font-bold text-brand-fg"
          aria-hidden
        >
          DI
        </div>
        <h1 className="text-xl font-semibold">Dealer Inventory Portal</h1>
        <p className="text-sm text-muted">
          Sign in to update your inventory for this week.
        </p>
      </div>

      <LoginForm redirectTo={redirectTo} />

      <p className="text-center text-xs text-muted">
        Need access? Contact your account representative.
      </p>
    </div>
  );
}
