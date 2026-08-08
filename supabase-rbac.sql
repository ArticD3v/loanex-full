-- ============================================================================
-- LoanEx RBAC migration — run this once in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to run more than once.
-- ============================================================================

-- 1. Roles table --------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  permissions jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.roles is 'RBAC roles for the LoanEx admin portal';

-- 2. Link users to a role -----------------------------------------------------
alter table public.users add column if not exists role_id uuid references public.roles(id) on delete restrict;

create index if not exists idx_users_role_id on public.users (role_id);

-- 3. Seed the default roles ---------------------------------------------------
-- Keep permission keys in sync with backend/src/modules/rbac/permissions.ts
insert into public.roles (name, description, permissions, is_system) values
  ('Super Admin',
   'Full access to every module in the admin portal',
   '["products.view","products.create","products.edit","products.delete","orders.view","orders.edit","orders.delete","customers.view","customers.edit","customers.delete","emi.view","emi.edit","emi.delete","fi.view","fi.edit","fi.delete","users.view","users.create","users.edit","users.delete","roles.view","roles.create","roles.edit","roles.delete","reports.view","masters.view","masters.create","masters.edit","masters.delete","settings.view","settings.edit","notifications.view","notifications.create","notifications.delete"]'::jsonb,
   true),
  ('Branch Manager',
   'Run branch operations: orders, EMI approvals and field investigation',
   '["products.view","orders.view","orders.edit","customers.view","emi.view","emi.edit","fi.view","fi.edit","reports.view"]'::jsonb,
   false),
  ('Credit Officer',
   'Review and approve credit: EMI applications, loans and payment terms',
   '["products.view","orders.view","customers.view","emi.view","emi.edit","fi.view","reports.view"]'::jsonb,
   false),
  ('FI Executive',
   'Field investigation: view and update FI cases only',
   '["customers.view","emi.view","fi.view","fi.edit"]'::jsonb,
   false),
  ('Sales Executive',
   'Product catalog: view, add and edit products',
   '["products.view","products.create","products.edit","customers.view","orders.view"]'::jsonb,
   false)
on conflict (name) do update
  set permissions = excluded.permissions,
      is_system   = excluded.is_system,
      updated_at  = now();

-- 4. Backfill existing admins → Super Admin (so nobody gets locked out) --------
update public.users u
set role_id = r.id
from public.roles r
where r.name = 'Super Admin'
  and u.role = 'admin'
  and u.role_id is null;
