-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- The application connects through Prisma using the pooled Postgres role, which
-- BYPASSES RLS — application-level authorization is enforced by the Data Access
-- Layer (src/lib/auth/dal.ts). These policies are the second line of defence:
-- they protect the data if anything ever reaches these tables through Supabase's
-- auto-generated REST/Realtime API with a user's anon JWT.
--
-- Run AFTER `npx prisma migrate deploy` and 001_profiles_trigger.sql.
-- ---------------------------------------------------------------------------

-- Helper: the caller's role, read from their profile.
create or replace function public.current_user_role()
returns public."Role"
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: the dealership the caller belongs to (null for staff).
create or replace function public.current_user_dealer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select dealer_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('ADMIN', 'SUPER_ADMIN') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. With RLS on and no permissive policy, a table denies
-- all access by default — which is the posture we want for anything a dealer
-- has no business reading.
-- ---------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.dealers           enable row level security;
alter table public.products          enable row level security;
alter table public.dealer_inventory  enable row level security;
alter table public.weekly_reports    enable row level security;
alter table public.weekly_report_lines enable row level security;
alter table public.notifications     enable row level security;
alter table public.email_templates   enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.integration_connections enable row level security;

-- Profiles: you can read yourself; staff can read everyone.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.current_user_is_staff());

-- Dealers: a dealer sees only their own dealership.
drop policy if exists dealers_select_scoped on public.dealers;
create policy dealers_select_scoped on public.dealers
  for select using (
    public.current_user_is_staff() or id = public.current_user_dealer_id()
  );

-- Products: readable by every signed-in user; only staff may write.
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (auth.uid() is not null);

drop policy if exists products_write_staff on public.products;
create policy products_write_staff on public.products
  for all using (public.current_user_is_staff())
  with check (public.current_user_is_staff());

-- Inventory: the core isolation rule. A dealer can read and update only their
-- own rows, and only staff can insert or delete them.
drop policy if exists inventory_select_scoped on public.dealer_inventory;
create policy inventory_select_scoped on public.dealer_inventory
  for select using (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  );

drop policy if exists inventory_update_scoped on public.dealer_inventory;
create policy inventory_update_scoped on public.dealer_inventory
  for update using (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  )
  with check (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  );

drop policy if exists inventory_insert_staff on public.dealer_inventory;
create policy inventory_insert_staff on public.dealer_inventory
  for insert with check (public.current_user_is_staff());

drop policy if exists inventory_delete_staff on public.dealer_inventory;
create policy inventory_delete_staff on public.dealer_inventory
  for delete using (public.current_user_is_staff());

-- Weekly reports: same dealer scoping; dealers may create and update their own.
drop policy if exists reports_select_scoped on public.weekly_reports;
create policy reports_select_scoped on public.weekly_reports
  for select using (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  );

drop policy if exists reports_write_scoped on public.weekly_reports;
create policy reports_write_scoped on public.weekly_reports
  for all using (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  )
  with check (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  );

-- Report lines inherit their parent report's scope.
drop policy if exists report_lines_select_scoped on public.weekly_report_lines;
create policy report_lines_select_scoped on public.weekly_report_lines
  for select using (
    public.current_user_is_staff()
    or exists (
      select 1 from public.weekly_reports r
      where r.id = weekly_report_id
        and r.dealer_id = public.current_user_dealer_id()
    )
  );

-- Notifications: a dealer may see their own email history.
drop policy if exists notifications_select_scoped on public.notifications;
create policy notifications_select_scoped on public.notifications
  for select using (
    public.current_user_is_staff() or dealer_id = public.current_user_dealer_id()
  );

-- Email templates, audit logs, and integrations are super-admin only. RLS is
-- enabled with a single restrictive policy, so dealers and admins get nothing.
drop policy if exists email_templates_super_admin on public.email_templates;
create policy email_templates_super_admin on public.email_templates
  for all using (public.current_user_role() = 'SUPER_ADMIN')
  with check (public.current_user_role() = 'SUPER_ADMIN');

drop policy if exists audit_logs_super_admin on public.audit_logs;
create policy audit_logs_super_admin on public.audit_logs
  for select using (public.current_user_role() = 'SUPER_ADMIN');

drop policy if exists integrations_super_admin on public.integration_connections;
create policy integrations_super_admin on public.integration_connections
  for all using (public.current_user_role() = 'SUPER_ADMIN')
  with check (public.current_user_role() = 'SUPER_ADMIN');
