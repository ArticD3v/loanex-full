-- ============================================================
-- LoanEx - Complete Supabase Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/sfddelyotptsfbigwllg/sql/new)
-- ============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles (extends Supabase Auth users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  name text not null default '',
  email text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2. Categories
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  icon text not null default 'shopping-bag',
  color text not null default '#3B82F6',
  bg_color text not null default '#EFF6FF',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Categories are public"
  on public.categories for select using (true);

create policy "Admins can manage categories"
  on public.categories for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Dealers
create table public.dealers (
  id uuid primary key default uuid_generate_v4(),
  dealer_code text unique not null,
  dealer_name text not null,
  dealer_address text not null default '',
  dealer_mobile text not null,
  created_at timestamptz not null default now()
);

alter table public.dealers enable row level security;

create policy "Dealers are public"
  on public.dealers for select using (true);

create policy "Admins can manage dealers"
  on public.dealers for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. Products
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text unique not null,
  price int not null,
  original_price int not null default 0,
  category_id uuid not null references public.categories(id),
  brand text not null default '',
  rating numeric(3,2) not null default 0,
  reviews int not null default 0,
  description text not null default '',
  image text not null default '',
  stock int not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  emi_available boolean not null default false,
  emi_plan_mode text not null default 'multiple' check (emi_plan_mode in ('single', 'multiple')),
  tenure_options int[] not null default '{}',
  down_payment int not null default 0,
  down_payment_type text not null default 'percentage' check (down_payment_type in ('amount', 'percentage')),
  first_payment_rule text not null default 'down_payment' check (first_payment_rule in ('down_payment', 'emi_1')),
  service_charge int not null default 0,
  delivery_charge int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Products are public"
  on public.products for select using (true);

create policy "Admins can manage products"
  on public.products for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5. Product Photos
create table public.product_photos (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.product_photos enable row level security;

create policy "Product photos are public"
  on public.product_photos for select using (true);

create policy "Admins can manage photos"
  on public.product_photos for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 6. Product-Dealer junction
create table public.product_dealers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  purchase_price int not null,
  created_at timestamptz not null default now(),
  unique(product_id, dealer_id)
);

alter table public.product_dealers enable row level security;

create policy "Product dealers are public"
  on public.product_dealers for select using (true);

create policy "Admins can manage product dealers"
  on public.product_dealers for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 7. Addresses
create table public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  full_address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "Users can manage own addresses"
  on public.addresses for all using (auth.uid() = user_id);

-- 8. Orders
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  items jsonb not null default '[]',
  subtotal int not null,
  total int not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null check (payment_method in ('cod', 'emi')),
  address_id uuid references public.addresses(id),
  address_snapshot jsonb,
  phone text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders for select using (auth.uid() = user_id);

create policy "Users can create own orders"
  on public.orders for insert with check (auth.uid() = user_id);

create policy "Admins can view all orders"
  on public.orders for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update orders"
  on public.orders for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 9. EMI Details (separate table for cleaner queries)
create table public.emi_details (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade unique,
  tenure int not null,
  first_payment_rule text not null check (first_payment_rule in ('down_payment', 'emi_1')),
  down_payment_amount int not null,
  service_charge int not null default 0,
  delivery_charge int not null default 0,
  total_payable int not null,
  balance_for_emi int not null,
  regular_emi_amount int not null,
  final_emi_amount int not null,
  months int not null,
  monthly_amount int not null,
  total_amount int not null,
  interest_rate numeric(5,2) not null default 0,
  emi_status text not null default 'pending_approval' check (emi_status in ('pending_approval','proposal_sent','accepted','rejected','downpayment_paid','active','completed')),
  paid_installments int not null default 0,
  next_due_date date,
  schedule jsonb not null default '[]',
  dealer_id uuid references public.dealers(id),
  dealer_snapshot jsonb,
  admin_proposal jsonb,
  customer_accepted boolean not null default false,
  customer_accepted_at timestamptz,
  downpayment_paid boolean not null default false,
  downpayment_paid_at timestamptz,
  customer_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.emi_details enable row level security;

create policy "Users can view own EMI details"
  on public.emi_details for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

create policy "Admins can manage EMI details"
  on public.emi_details for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 10. Wishlist
create table public.wishlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

alter table public.wishlist_items enable row level security;

create policy "Users can manage own wishlist"
  on public.wishlist_items for all using (auth.uid() = user_id);

-- 11. Reviews
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  comment text,
  created_at timestamptz not null default now(),
  unique(product_id, user_id)
);

alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews for select using (true);

create policy "Authenticated users can create reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update using (auth.uid() = user_id);

-- 12. Cart Items (server-side persistence)
create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1,
  selected_tenure int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "Users can manage own cart"
  on public.cart_items for all using (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_products_category on public.products(category_id);
create index idx_products_status on public.products(status);
create index idx_products_emi on public.products(emi_available) where emi_available = true;
create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_emi_details_status on public.emi_details(emi_status);
create index idx_wishlist_user on public.wishlist_items(user_id);
create index idx_reviews_product on public.reviews(product_id);
create index idx_cart_user on public.cart_items(user_id);
create index idx_addresses_user on public.addresses(user_id);

-- ============================================================
-- Seed Data (minimal — add your own products via admin panel)
-- ============================================================

-- Categories
insert into public.categories (name, icon, color, bg_color, sort_order) values
  ('Electronics', 'devices', '#3B82F6', '#EFF6FF', 1),
  ('Fashion', 'checkroom', '#EC4899', '#FDF2F8', 2),
  ('Home & Living', 'home', '#10B981', '#ECFDF5', 3),
  ('Sports', 'sports-soccer', '#F59E0B', '#FFFBEB', 4),
  ('Books', 'menu-book', '#8B5CF6', '#F5F3FF', 5),
  ('Beauty', 'face', '#EF4444', '#FEF2F2', 6);

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, phone, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'phone', new.phone, ''),
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
