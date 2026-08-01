"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { navItemsFor } from "./nav-config";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

export interface AppShellUser {
  email: string;
  fullName: string | null;
  role: Role;
  dealerName: string | null;
}

/**
 * Application chrome: fixed sidebar on desktop, slide-over drawer on mobile.
 * Receives the session as a prop from a Server Component parent — Client
 * Components must never call the DAL themselves.
 */
export function AppShell({
  user,
  children,
}: {
  user: AppShellUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navItemsFor(user.role);
  const displayName = user.fullName ?? user.email;

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-fg"
              aria-hidden
            >
              DI
            </span>
            <span className="text-sm">Inventory Portal</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} onNavigate={() => setMobileOpen(false)} />
        </div>

        <div className="border-t border-line p-3">
          <div className="px-3 pb-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted">
              {user.dealerName ?? ROLE_LABELS[user.role]}
            </p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" aria-hidden />
          </button>
          <div className="hidden text-sm text-muted lg:block">
            {user.dealerName
              ? `${user.dealerName} · ${ROLE_LABELS[user.role]}`
              : ROLE_LABELS[user.role]}
          </div>
          <ThemeToggle />
        </header>

        <main id="main" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
