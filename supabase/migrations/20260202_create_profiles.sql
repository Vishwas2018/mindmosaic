-- ============================================================================
-- Profiles table
-- Canonical identity + role model for MindMosaic
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_role_check
    check (role in ('admin', 'student', 'parent'))
);

create index profiles_role_idx on public.profiles(role);

-- ============================================================================
-- Helper functions
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Admins can read all profiles"
on public.profiles
for select
using (public.is_admin());

create policy "Admins can update profiles"
on public.profiles
for update
using (public.is_admin());

-- ============================================================================
-- Triggers
-- ============================================================================

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- create a user via Supabase Auth, run:
-- -- ============================================================================
-- insert into public.profiles (id, role)
-- values ('<AUTH_USER_UUID>', 'admin');
-- -- ============================================================================
-- insert into public.profiles (id, role)
-- values ('<AUTH_USER_UUID>', 'student');
-- -- ============================================================================

