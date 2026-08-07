-- ============================================================
-- Banners Table
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/sfddelyotptsfbigwllg/sql/new)
-- ============================================================

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  badge_text text not null default '',
  image_url text not null default '',
  link text not null default '',
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy "Banners are public"
  on public.banners for select using (true);

create policy "Admins can manage banners"
  on public.banners for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed data
insert into public.banners (title, subtitle, badge_text, image_url, sort_order, status) values
  ('Biggest Electronics Sale', 'Up to 40% off premium gadgets', '0% EMI Available', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80', 1, 'active'),
  ('Fashion Forward', 'New arrivals, fresh styles this season', 'Flat 30% off', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', 2, 'active'),
  ('Home Essentials', 'Transform your living space', 'EMI from ₹999/mo', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80', 3, 'active')
on conflict do nothing;
