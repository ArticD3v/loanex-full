-- ============================================================
-- Notifications Table
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/sfddelyotptsfbigwllg/sql/new
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null default '',
  type text not null default 'general' check (type in ('order', 'emi', 'payment', 'kyc', 'general')),
  read boolean not null default false,
  route text not null default '',
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Permissive for the dev app (anon key, filtered by user_id in code).
-- Tighten these when real Supabase Auth sessions are enabled.
create policy "Anyone can read notifications"
  on public.notifications for select using (true);

create policy "Anyone can insert notifications"
  on public.notifications for insert with check (true);

create policy "Anyone can update notifications"
  on public.notifications for update using (true);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);
