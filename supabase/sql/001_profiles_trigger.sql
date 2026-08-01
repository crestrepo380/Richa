-- ---------------------------------------------------------------------------
-- Keeps public.profiles in sync with Supabase's auth.users table.
--
-- Run AFTER `npx prisma migrate deploy` has created the tables.
-- Prisma cannot manage triggers on the auth schema, so this lives here and is
-- applied via the Supabase SQL editor or CLI.
-- ---------------------------------------------------------------------------

-- Creates the matching profile row whenever a user signs up or is invited.
-- Role and dealer assignment can be seeded through the invite's metadata, which
-- is how the admin "create dealer" flow attaches a login to a dealership.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, dealer_id, created_at, updated_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public."Role",
      'DEALER'::public."Role"
    ),
    nullif(new.raw_user_meta_data ->> 'dealer_id', '')::uuid,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the email column aligned if a user changes their address in Supabase.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
      set email = new.email, updated_at = now()
      where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();
