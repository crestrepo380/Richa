# Dealer Inventory & Replenishment Portal

A production web application that replaces the weekly Excel workflow for
managing motorcycle-dealer inventory and replenishment. Dealers report only how
many units they currently have on hand; the system derives units sold,
remaining inventory, and recommended replenishment automatically.

Built to run every week for real dealers and an internal sales team, and to
grow into a multi-distributor SaaS.

## Tech stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, TypeScript      |
| Styling            | Tailwind CSS v4 (class-based dark mode)            |
| Auth & DB          | Supabase (Postgres + Auth)                         |
| ORM                | Prisma 6                                           |
| Forms & validation | React Hook Form + Zod                              |
| Notifications      | sonner (toasts)                                    |
| Email              | Resend _(Phase 4)_                                 |
| Spreadsheets       | SheetJS / `xlsx` _(Phase 3)_                        |
| Tables             | TanStack Table _(Phase 3)_                          |
| Tests              | Vitest                                             |
| Hosting            | Vercel                                             |

> **Next.js 16 note:** middleware is now called **Proxy** (`src/proxy.ts`),
> and `params` / `searchParams` are async (`await`ed). See `AGENTS.md`.

## Architecture

```
src/
  app/
    (auth)/login/            Public login (password + magic link)
    (app)/                   Authenticated shell (sidebar, theme, sign-out)
      dealer/                Dealer-only routes  — requireDealer()
      admin/                 Admin routes        — requirePermission(...)
      super-admin/           Super-admin routes  — requirePermission("user:manage")
    auth/callback/           Magic-link / OAuth code exchange
    unauthorized/            Friendly access-denied page
  components/
    ui/                      Reusable primitives (Button, Input, Card, …)
    layout/                  App shell, nav, sign-out
  features/
    auth/                    Login form + server actions
  lib/
    auth/                    Roles + permission matrix + Data Access Layer
    business/                Pure replenishment math (fully unit-tested)
    supabase/                SSR/browser/admin client factories
    validation/              Shared Zod schemas
    db.ts  env.ts  week.ts  rate-limit.ts  audit/log.ts
  proxy.ts                   Session refresh + optimistic auth gate
prisma/
  schema.prisma  seed.ts
supabase/sql/                Auth-sync trigger + Row Level Security policies
```

**Separation of concerns.** Business rules (the replenishment math, week
handling, the permission matrix) live in `src/lib` as pure, framework-free,
unit-tested modules. UI components are dumb and reusable. Authorization is
centralized in one Data Access Layer (`src/lib/auth/dal.ts`) rather than
scattered across routes.

**Defence in depth for authorization.**

1. `proxy.ts` — refreshes the session and performs a fast, optimistic
   signed-in check (no DB reads, per the Next.js guidance).
2. Route-group layouts — call the DAL to enforce the role for a whole section.
3. The DAL — the real check, next to the data; dealers are pinned to their own
   `dealerId` so no URL edit can reach another dealer.
4. Supabase **Row Level Security** (`supabase/sql/002_rls_policies.sql`) — a
   final backstop if data is ever reached through Supabase's auto REST API.

## Roles

| Role          | Can…                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `DEALER`      | View & update **only their own** inventory, submit/view weekly reports |
| `ADMIN`       | Everything a dealer can plus all dealers, imports, reports, exports, replenishment |
| `SUPER_ADMIN` | Everything an admin can plus users, settings, email templates, audit logs, integrations |

Capabilities are declared once in `src/lib/auth/roles.ts` and reused by the
route guards **and** the navigation, so a link never appears for a user who
would be denied on click.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in from your Supabase project (Settings → API and Settings → Database):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432)

### 3. Set up the database

```bash
npm run db:deploy     # apply Prisma migrations (creates the tables + enums)
```

Then, in the Supabase SQL editor, run in order:

1. `supabase/sql/001_profiles_trigger.sql` — mirrors `auth.users` → `profiles`
2. `supabase/sql/002_rls_policies.sql` — enables Row Level Security

Optionally seed demo data (products, dealers, inventory, history):

```bash
npm run db:seed
```

### 4. Create login accounts

Logins live in Supabase Auth. Create a user in the Supabase dashboard; the
trigger creates a matching `DEALER` profile automatically. To make someone an
admin or link a dealer login to a dealership, set the user's **User Metadata**:

```json
{ "role": "ADMIN" }
{ "role": "DEALER", "dealer_id": "<uuid printed by db:seed>", "full_name": "Richard Alvarez" }
```

(Existing users can be updated directly in the `profiles` table.)

### 5. Run

```bash
npm run dev        # http://localhost:3000
```

## Scripts

```bash
npm run dev         # start dev server
npm run build       # prisma generate + production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest (business logic)
npm run db:migrate  # create/apply a dev migration
npm run db:seed     # seed demo data
npm run db:studio   # Prisma Studio
```

## Build phases

The product is built in phases; each is functional and tested before the next.

- **Phase 1 — Foundation ✅ (this delivery)**
  Project setup, database schema, Supabase auth (password + magic link),
  role-based route protection, and dealer / admin / super-admin dashboard
  shells. Business-logic math and week handling are unit-tested.
- **Phase 2 — Dealer inventory** _(next)_
  The weekly count form and submission flow.
- **Phase 3 — Admin** Dashboard charts & filters, reports, Excel/PDF/CSV
  export, and Excel imports.
- **Phase 4 — Email** Resend integration and the Monday/Wednesday/Friday
  reminder cadence with overdue tracking.
- **Phase 5 — Analytics** Weekly sales, dealer activity, most-sold products,
  and inventory history.
- **Phase 6 — Integrations** Shopify, Fishbowl, HubSpot, QuickBooks, UPS,
  FedEx. The `IntegrationConnection` model and provider enum already stub the
  shape.

## Testing this phase

- `npm run test` — replenishment math, week helpers, permission matrix.
- `npm run build` — full type-check and route compilation.
- Manually: sign in as each role and confirm the sidebar, redirects, and
  access-denied behaviour match the table above. (Requires a configured
  Supabase project.)
