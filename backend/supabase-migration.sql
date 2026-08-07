-- ============================================================
-- Product Management Module - Schema Migration
-- Run AFTER supabase-schema.sql
-- ============================================================

-- Brands
create table if not exists public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  logo text not null default '',
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.brands enable row level security;
create policy "Brands are public" on public.brands for select using (true);
create policy "Admins can manage brands" on public.brands for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Manufacturers
create table if not exists public.manufacturers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  gst_number text not null default '',
  address text not null default '',
  contact_person text not null default '',
  phone text not null default '',
  email text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.manufacturers enable row level security;
create policy "Manufacturers are public" on public.manufacturers for select using (true);
create policy "Admins can manage manufacturers" on public.manufacturers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Suppliers
create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null,
  gst_number text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  contact_person text not null default '',
  bank_details text not null default '',
  payment_terms text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
create policy "Suppliers are public" on public.suppliers for select using (true);
create policy "Admins can manage suppliers" on public.suppliers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Warehouses
create table if not exists public.warehouses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null default '',
  contact_person text not null default '',
  phone text not null default '',
  capacity int not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.warehouses enable row level security;
create policy "Warehouses are public" on public.warehouses for select using (true);
create policy "Admins can manage warehouses" on public.warehouses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Sub Categories
create table if not exists public.sub_categories (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  image text not null default '',
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sub_categories enable row level security;
create policy "Sub categories are public" on public.sub_categories for select using (true);
create policy "Admins can manage sub categories" on public.sub_categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Product Attributes
create table if not exists public.product_attributes (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.product_attributes enable row level security;
create policy "Attributes are public" on public.product_attributes for select using (true);
create policy "Admins can manage attributes" on public.product_attributes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Product Attribute Values
create table if not exists public.product_attribute_values (
  id uuid primary key default uuid_generate_v4(),
  attribute_id uuid not null references public.product_attributes(id) on delete cascade,
  value text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attribute_id, value)
);
alter table public.product_attribute_values enable row level security;
create policy "Attribute values are public" on public.product_attribute_values for select using (true);
create policy "Admins can manage attribute values" on public.product_attribute_values for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Product Variants
create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null default '',
  barcode text not null default '',
  selling_price int not null default 0,
  purchase_price int not null default 0,
  gst numeric(5,2) not null default 0,
  stock int not null default 0,
  reserved_stock int not null default 0,
  images jsonb not null default '[]',
  weight numeric(10,2) not null default 0,
  length numeric(10,2) not null default 0,
  width numeric(10,2) not null default 0,
  height numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.product_variants enable row level security;
create policy "Variants are public" on public.product_variants for select using (true);
create policy "Admins can manage variants" on public.product_variants for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Product Variant Attribute Values (junction)
create table if not exists public.product_variant_attributes (
  id uuid primary key default uuid_generate_v4(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  attribute_id uuid not null references public.product_attributes(id) on delete cascade,
  value_id uuid not null references public.product_attribute_values(id) on delete cascade,
  unique(variant_id, attribute_id)
);
alter table public.product_variant_attributes enable row level security;
create policy "Variant attributes are public" on public.product_variant_attributes for select using (true);
create policy "Admins can manage variant attributes" on public.product_variant_attributes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Extend categories with new fields
alter table public.categories add column if not exists image text not null default '';
alter table public.categories add column if not exists description text not null default '';

-- Extend dealers with new fields
alter table public.dealers add column if not exists gst_number text not null default '';
alter table public.dealers add column if not exists branch text not null default '';
alter table public.dealers add column if not exists payment_schedule text not null default '';
alter table public.dealers add column if not exists hold_days int not null default 0;
alter table public.dealers add column if not exists commission numeric(5,2) not null default 0;
alter table public.dealers add column if not exists email text not null default '';
alter table public.dealers add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

-- Extend products with new fields
alter table public.products add column if not exists short_name text not null default '';
alter table public.products add column if not exists barcode text not null default '';
alter table public.products add column if not exists hsn_code text not null default '';
alter table public.products add column if not exists gst_percentage numeric(5,2) not null default 0;
alter table public.products add column if not exists country_of_origin text not null default 'India';
alter table public.products add column if not exists warranty text not null default '';
alter table public.products add column if not exists condition text not null default 'new' check (condition in ('new', 'refurbished', 'used'));
alter table public.products add column if not exists serial_tracking boolean not null default false;
alter table public.products add column if not exists description_short text not null default '';
alter table public.products add column if not exists features jsonb not null default '[]';
alter table public.products add column if not exists box_contents jsonb not null default '[]';
alter table public.products add column if not exists usage_instructions text not null default '';
alter table public.products add column if not exists video_url text not null default '';
alter table public.products add column if not exists brand_id uuid references public.brands(id);
alter table public.products add column if not exists manufacturer_id uuid references public.manufacturers(id);
alter table public.products add column if not exists sub_category_id uuid references public.sub_categories(id);

-- Pricing
alter table public.products add column if not exists purchase_price int not null default 0;
alter table public.products add column if not exists procurement_cost int not null default 0;
alter table public.products add column if not exists packaging_cost int not null default 0;
alter table public.products add column if not exists transport_cost int not null default 0;
alter table public.products add column if not exists loading_cost int not null default 0;
alter table public.products add column if not exists other_charges int not null default 0;
alter table public.products add column if not exists landing_cost int not null default 0;
alter table public.products add column if not exists mrp int not null default 0;
alter table public.products add column if not exists discount int not null default 0;
alter table public.products add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.products add column if not exists gross_margin int not null default 0;
alter table public.products add column if not exists gross_margin_percent numeric(5,2) not null default 0;
alter table public.products add column if not exists taxable_value int not null default 0;
alter table public.products add column if not exists gst_amount int not null default 0;
alter table public.products add column if not exists final_price int not null default 0;

-- Inventory
alter table public.products add column if not exists warehouse_id uuid references public.warehouses(id);
alter table public.products add column if not exists reserved_stock int not null default 0;
alter table public.products add column if not exists min_stock int not null default 0;
alter table public.products add column if not exists max_stock int not null default 0;
alter table public.products add column if not exists reorder_level int not null default 0;
alter table public.products add column if not exists weight numeric(10,2) not null default 0;
alter table public.products add column if not exists length numeric(10,2) not null default 0;
alter table public.products add column if not exists width numeric(10,2) not null default 0;
alter table public.products add column if not exists height numeric(10,2) not null default 0;
alter table public.products add column if not exists delivery_zone text not null default '';
alter table public.products add column if not exists delivery_partner text not null default '';
alter table public.products add column if not exists est_delivery_days int not null default 0;
alter table public.products add column if not exists return_window int not null default 0;
alter table public.products add column if not exists replacement_allowed boolean not null default true;
alter table public.products add column if not exists cod_allowed boolean not null default true;
alter table public.products add column if not exists installation_required boolean not null default false;
alter table public.products add column if not exists installation_charges int not null default 0;

-- Extended EMI
alter table public.products add column if not exists min_down_payment int not null default 0;
alter table public.products add column if not exists max_down_payment int not null default 0;
alter table public.products add column if not exists processing_charge int not null default 0;
alter table public.products add column if not exists verification_charge int not null default 0;
alter table public.products add column if not exists documentation_charge int not null default 0;
alter table public.products add column if not exists grace_period int not null default 0;
alter table public.products add column if not exists first_emi_date timestamptz;

-- Customer rules
alter table public.products add column if not exists min_quantity int not null default 1;
alter table public.products add column if not exists max_quantity int not null default 999;
alter table public.products add column if not exists min_customer_age int not null default 0;
alter table public.products add column if not exists eligible_pincodes jsonb not null default '[]';
alter table public.products add column if not exists cash_purchase_allowed boolean not null default true;
alter table public.products add column if not exists emi_purchase_allowed boolean not null default true;
alter table public.products add column if not exists return_allowed boolean not null default false;
alter table public.products add column if not exists serial_capture_required boolean not null default false;
alter table public.products add column if not exists field_verification_required boolean not null default false;

-- SEO
alter table public.products add column if not exists seo_title text not null default '';
alter table public.products add column if not exists seo_description text not null default '';
alter table public.products add column if not exists seo_keywords text not null default '';
alter table public.products add column if not exists slug text not null default '';
alter table public.products add column if not exists visibility text not null default 'visible' check (visibility in ('visible', 'hidden'));
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists trending boolean not null default false;
alter table public.products add column if not exists recommended boolean not null default false;

-- Product-Supplier junction
create table if not exists public.product_suppliers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  unique(product_id, supplier_id)
);
alter table public.product_suppliers enable row level security;
create policy "Product suppliers are public" on public.product_suppliers for select using (true);
create policy "Admins can manage product suppliers" on public.product_suppliers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Audit log
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  changes jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "Admins can view audit log" on public.audit_log for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "System can insert audit log" on public.audit_log for insert with check (true);

-- Indexes
create index if not exists idx_sub_categories_category on public.sub_categories(category_id);
create index if not exists idx_product_variants_product on public.product_variants(product_id);
create index if not exists idx_variant_attributes_variant on public.product_variant_attributes(variant_id);
create index if not exists idx_product_suppliers_product on public.product_suppliers(product_id);
create index if not exists idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index if not exists idx_audit_log_user on public.audit_log(user_id);

-- ============================================================
-- Customer KYC Table
-- ============================================================
create table if not exists public.customer_kyc (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null default '',
  aadhar_number text not null default '',
  aadhar_verified boolean not null default false,
  pan_number text not null default '',
  pan_verified boolean not null default false,
  cibil_score int not null default 0,
  cibil_checked boolean not null default false,
  face_verified boolean not null default false,
  kyc_completed boolean not null default false,
  kyc_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.customer_kyc enable row level security;

create policy "Users can view own KYC"
  on public.customer_kyc for select using (auth.uid() = user_id);

create policy "Users can insert own KYC"
  on public.customer_kyc for insert with check (auth.uid() = user_id);

create policy "Users can update own KYC"
  on public.customer_kyc for update using (auth.uid() = user_id);

create policy "Admins can view all KYC"
  on public.customer_kyc for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
