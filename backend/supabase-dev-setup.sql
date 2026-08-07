-- ============================================================
-- Dev Mode: Bypass RLS & Seed Data
-- Run this AFTER supabase-schema.sql AND supabase-migration.sql
-- ============================================================

-- ============================================================
-- 1. Fix missing columns on existing tables
-- ============================================================
alter table public.categories add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));
alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.dealers add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- 2. Banners table (if not created yet)
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

-- ============================================================
-- 3. Bypass RLS for all tables (dev mode only!)
-- ============================================================

-- Drop all existing RLS policies first to avoid conflicts
-- Then create permissive policies

-- Profiles: allow all operations
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Dev all access" on public.profiles;
create policy "Dev all access" on public.profiles for all using (true) with check (true);

-- Categories
drop policy if exists "Categories are public" on public.categories;
drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Dev all access" on public.categories;
create policy "Dev all access" on public.categories for all using (true) with check (true);

-- Dealers
drop policy if exists "Dealers are public" on public.dealers;
drop policy if exists "Admins can manage dealers" on public.dealers;
drop policy if exists "Dev all access" on public.dealers;
create policy "Dev all access" on public.dealers for all using (true) with check (true);

-- Products
drop policy if exists "Products are public" on public.products;
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Dev all access" on public.products;
create policy "Dev all access" on public.products for all using (true) with check (true);

-- Product Photos
drop policy if exists "Product photos are public" on public.product_photos;
drop policy if exists "Admins can manage photos" on public.product_photos;
drop policy if exists "Dev all access" on public.product_photos;
create policy "Dev all access" on public.product_photos for all using (true) with check (true);

-- Product Dealers
drop policy if exists "Product dealers are public" on public.product_dealers;
drop policy if exists "Admins can manage product dealers" on public.product_dealers;
drop policy if exists "Dev all access" on public.product_dealers;
create policy "Dev all access" on public.product_dealers for all using (true) with check (true);

-- Orders
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can create own orders" on public.orders;
drop policy if exists "Admins can view all orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Dev all access" on public.orders;
create policy "Dev all access" on public.orders for all using (true) with check (true);

-- EMI Details
drop policy if exists "Users can view own EMI details" on public.emi_details;
drop policy if exists "Admins can manage EMI details" on public.emi_details;
drop policy if exists "Dev all access" on public.emi_details;
create policy "Dev all access" on public.emi_details for all using (true) with check (true);

-- Wishlist
drop policy if exists "Users can manage own wishlist" on public.wishlist_items;
drop policy if exists "Dev all access" on public.wishlist_items;
create policy "Dev all access" on public.wishlist_items for all using (true) with check (true);

-- Reviews
drop policy if exists "Reviews are public" on public.reviews;
drop policy if exists "Authenticated users can create reviews" on public.reviews;
drop policy if exists "Users can update own reviews" on public.reviews;
drop policy if exists "Dev all access" on public.reviews;
create policy "Dev all access" on public.reviews for all using (true) with check (true);

-- Cart Items
drop policy if exists "Users can manage own cart" on public.cart_items;
drop policy if exists "Dev all access" on public.cart_items;
create policy "Dev all access" on public.cart_items for all using (true) with check (true);

-- Addresses
drop policy if exists "Users can manage own addresses" on public.addresses;
drop policy if exists "Dev all access" on public.addresses;
create policy "Dev all access" on public.addresses for all using (true) with check (true);

-- Brands (from migration)
drop policy if exists "Brands are public" on public.brands;
drop policy if exists "Admins can manage brands" on public.brands;
drop policy if exists "Dev all access" on public.brands;
create policy "Dev all access" on public.brands for all using (true) with check (true);

-- Manufacturers
drop policy if exists "Manufacturers are public" on public.manufacturers;
drop policy if exists "Admins can manage manufacturers" on public.manufacturers;
drop policy if exists "Dev all access" on public.manufacturers;
create policy "Dev all access" on public.manufacturers for all using (true) with check (true);

-- Suppliers
drop policy if exists "Suppliers are public" on public.suppliers;
drop policy if exists "Admins can manage suppliers" on public.suppliers;
drop policy if exists "Dev all access" on public.suppliers;
create policy "Dev all access" on public.suppliers for all using (true) with check (true);

-- Warehouses
drop policy if exists "Warehouses are public" on public.warehouses;
drop policy if exists "Admins can manage warehouses" on public.warehouses;
drop policy if exists "Dev all access" on public.warehouses;
create policy "Dev all access" on public.warehouses for all using (true) with check (true);

-- Sub Categories
drop policy if exists "Sub categories are public" on public.sub_categories;
drop policy if exists "Admins can manage sub categories" on public.sub_categories;
drop policy if exists "Dev all access" on public.sub_categories;
create policy "Dev all access" on public.sub_categories for all using (true) with check (true);

-- Product Attributes
drop policy if exists "Attributes are public" on public.product_attributes;
drop policy if exists "Admins can manage attributes" on public.product_attributes;
drop policy if exists "Dev all access" on public.product_attributes;
create policy "Dev all access" on public.product_attributes for all using (true) with check (true);

-- Product Attribute Values
drop policy if exists "Attribute values are public" on public.product_attribute_values;
drop policy if exists "Admins can manage attribute values" on public.product_attribute_values;
drop policy if exists "Dev all access" on public.product_attribute_values;
create policy "Dev all access" on public.product_attribute_values for all using (true) with check (true);

-- Product Variants
drop policy if exists "Variants are public" on public.product_variants;
drop policy if exists "Admins can manage variants" on public.product_variants;
drop policy if exists "Dev all access" on public.product_variants;
create policy "Dev all access" on public.product_variants for all using (true) with check (true);

-- Product Variant Attributes
drop policy if exists "Variant attributes are public" on public.product_variant_attributes;
drop policy if exists "Admins can manage variant attributes" on public.product_variant_attributes;
drop policy if exists "Dev all access" on public.product_variant_attributes;
create policy "Dev all access" on public.product_variant_attributes for all using (true) with check (true);

-- Product Suppliers
drop policy if exists "Product suppliers are public" on public.product_suppliers;
drop policy if exists "Admins can manage product suppliers" on public.product_suppliers;
drop policy if exists "Dev all access" on public.product_suppliers;
create policy "Dev all access" on public.product_suppliers for all using (true) with check (true);

-- Audit Log
drop policy if exists "Admins can view audit log" on public.audit_log;
drop policy if exists "System can insert audit log" on public.audit_log;
drop policy if exists "Dev all access" on public.audit_log;
create policy "Dev all access" on public.audit_log for all using (true) with check (true);

-- Banners
drop policy if exists "Banners are public" on public.banners;
drop policy if exists "Admins can manage banners" on public.banners;
drop policy if exists "Dev all access" on public.banners;
create policy "Dev all access" on public.banners for all using (true) with check (true);

-- ============================================================
-- 4. Seed Data
-- ============================================================

-- Clear existing seed data
delete from public.banners;
delete from public.product_dealers;
delete from public.product_suppliers;
delete from public.product_variant_attributes;
delete from public.product_variants;
delete from public.product_attribute_values;
delete from public.product_attributes;
delete from public.product_photos;
delete from public.products;
delete from public.sub_categories;
delete from public.categories;
delete from public.dealers;
delete from public.suppliers;
delete from public.warehouses;
delete from public.brands;
delete from public.manufacturers;

-- Banners
insert into public.banners (title, subtitle, badge_text, image_url, sort_order) values
  ('Biggest Electronics Sale', 'Up to 40% off premium gadgets', '0% EMI Available', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80', 1),
  ('Fashion Forward', 'New arrivals, fresh styles this season', 'Flat 30% off', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', 2),
  ('Home Essentials', 'Transform your living space', 'EMI from ₹999/mo', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80', 3);

-- Categories
insert into public.categories (name, icon, color, bg_color, sort_order, description, status) values
  ('Electronics', 'devices', '#3B82F6', '#EFF6FF', 1, 'Gadgets, phones, laptops & accessories', 'active'),
  ('Fashion', 'checkroom', '#EC4899', '#FDF2F8', 2, 'Clothing, footwear & accessories', 'active'),
  ('Home & Living', 'home', '#10B981', '#ECFDF5', 3, 'Furniture, kitchen & decor', 'active'),
  ('Sports', 'sports-soccer', '#F59E0B', '#FFFBEB', 4, 'Sports equipment & activewear', 'active'),
  ('Books', 'menu-book', '#8B5CF6', '#F5F3FF', 5, 'Books, stationery & learning', 'active'),
  ('Beauty', 'face', '#EF4444', '#FEF2F2', 6, 'Skincare, makeup & grooming', 'active');

-- Sub Categories
insert into public.sub_categories (category_id, name, description, sort_order)
select c.id, 'Smartphones', 'Mobile phones & accessories', 1 from public.categories c where c.name = 'Electronics'
union all select c.id, 'Laptops', 'Laptops & notebooks', 2 from public.categories c where c.name = 'Electronics'
union all select c.id, 'Audio', 'Headphones, speakers & earphones', 3 from public.categories c where c.name = 'Electronics'
union all select c.id, 'Men''s Fashion', 'Clothing & accessories for men', 1 from public.categories c where c.name = 'Fashion'
union all select c.id, 'Women''s Fashion', 'Clothing & accessories for women', 2 from public.categories c where c.name = 'Fashion'
union all select c.id, 'Footwear', 'Shoes & sneakers', 3 from public.categories c where c.name = 'Fashion'
union all select c.id, 'Furniture', 'Sofas, tables & beds', 1 from public.categories c where c.name = 'Home & Living'
union all select c.id, 'Kitchen', 'Cookware & dining', 2 from public.categories c where c.name = 'Home & Living';

-- Brands
insert into public.brands (name, description, status) values
  ('Samsung', 'South Korean electronics giant', 'active'),
  ('Apple', 'American technology company', 'active'),
  ('Sony', 'Japanese multinational conglomerate', 'active'),
  ('Nike', 'American sportswear brand', 'active'),
  ('Puma', 'German sportswear brand', 'active'),
  ('Zara', 'Spanish fast fashion brand', 'active'),
  ('H&M', 'Swedish fast fashion brand', 'active'),
  ('Woodland', 'Indian outdoor apparel brand', 'active'),
  ('boAt', 'Indian audio electronics brand', 'active'),
  ('Lenovo', 'Chinese technology company', 'active');

-- Manufacturers
insert into public.manufacturers (name, gst_number, address, contact_person, phone, email, status) values
  ('Samsung India Electronics', '07AAACS1234A1Z5', 'Samsung House, DLF Centre, New Delhi', 'Rajan Sharma', '18004072678', 'support@samsung.co.in', 'active'),
  ('Apple India Pvt Ltd', '29AAACA1234A1Z6', '19 Brigade Road, Bengaluru', 'Priya Singh', '18001020203', 'support@apple.co.in', 'active'),
  ('Nike India Pvt Ltd', '06AAACN1234A1Z7', 'Bandra Kurla Complex, Mumbai', 'Amit Patel', '18001020204', 'support@nike.co.in', 'active');

-- Dealers
insert into public.dealers (dealer_code, dealer_name, dealer_address, dealer_mobile, gst_number, branch, commission, hold_days, payment_schedule, email, status) values
  ('APL-001', 'Apple Premium Delhi', 'Connaught Place, New Delhi', '9876540001', '07APL001A1Z5', 'Delhi', 5.00, 7, 'Net 30', 'apple.delhi@email.com', 'active'),
  ('APL-002', 'iStore Bangalore', 'Indiranagar, Bengaluru', '9876540002', '29APL002A1Z6', 'Bangalore', 5.50, 7, 'Net 30', 'istore.blr@email.com', 'active'),
  ('SMS-001', 'Samsung Plaza Delhi', 'Rajouri Garden, New Delhi', '9876540003', '07SMS001A1Z7', 'Delhi', 4.00, 10, 'Net 45', 'samsung.delhi@email.com', 'active'),
  ('Nike-001', 'Nike Factory Store Delhi', 'Select CITYWALK, New Delhi', '9876540004', '07NKE001A1Z8', 'Delhi', 6.00, 5, 'Net 15', 'nike.delhi@email.com', 'active');

-- Suppliers
insert into public.suppliers (name, code, gst_number, address, phone, email, contact_person, bank_details, payment_terms, status) values
  ('TechDistributors India', 'TD-001', '27AAACT1234A1Z9', 'Andheri East, Mumbai', '9988776655', 'info@techdistributors.in', 'Vikas Mehta', 'HDFC Bank A/C: 1234567890', 'Net 45', 'active'),
  ('Global Commerce Pvt Ltd', 'GC-001', '06AAACG1234A2Z1', 'BKC, Mumbai', '8877665544', 'orders@globalcommerce.in', 'Neha Gupta', 'ICICI Bank A/C: 0987654321', 'Net 60', 'active'),
  ('Prime Supplies Co', 'PS-001', '07AAACP1234A2Z2', 'Okhla, New Delhi', '7766554433', 'info@primesupplies.in', 'Rahul Kumar', 'SBI A/C: 1122334455', 'Net 30', 'active');

-- Warehouses
insert into public.warehouses (name, address, contact_person, phone, capacity, status) values
  ('Delhi Fulfillment Center', 'Sector 62, Noida, UP', 'Suresh Yadav', '9911223344', 50000, 'active'),
  ('Mumbai Logistics Hub', 'Bhiwandi, Thane, Maharashtra', 'Amit Kapoor', '9922334455', 75000, 'active'),
  ('Bangalore Warehouse', 'Whitefield, Bengaluru', 'Karthik R', '9933445566', 30000, 'active');

-- Product Attributes
insert into public.product_attributes (name, status) values
  ('Color', 'active'),
  ('Storage', 'active'),
  ('RAM', 'active'),
  ('Size', 'active'),
  ('Material', 'active')
on conflict do nothing;

-- Product Attribute Values
do $$
declare
  attr_id uuid;
begin
  attr_id := (select id from public.product_attributes where name = 'Color');
  insert into public.product_attribute_values (attribute_id, value) values
    (attr_id, 'Black'), (attr_id, 'White'), (attr_id, 'Blue'), (attr_id, 'Red'),
    (attr_id, 'Green'), (attr_id, 'Pink'), (attr_id, 'Silver'), (attr_id, 'Gold'),
    (attr_id, 'Grey'), (attr_id, 'Purple')
  on conflict do nothing;

  attr_id := (select id from public.product_attributes where name = 'Storage');
  insert into public.product_attribute_values (attribute_id, value) values
    (attr_id, '64GB'), (attr_id, '128GB'), (attr_id, '256GB'), (attr_id, '512GB'), (attr_id, '1TB')
  on conflict do nothing;

  attr_id := (select id from public.product_attributes where name = 'RAM');
  insert into public.product_attribute_values (attribute_id, value) values
    (attr_id, '4GB'), (attr_id, '6GB'), (attr_id, '8GB'), (attr_id, '12GB'), (attr_id, '16GB')
  on conflict do nothing;

  attr_id := (select id from public.product_attributes where name = 'Size');
  insert into public.product_attribute_values (attribute_id, value) values
    (attr_id, 'S'), (attr_id, 'M'), (attr_id, 'L'), (attr_id, 'XL'), (attr_id, 'XXL')
  on conflict do nothing;

  attr_id := (select id from public.product_attributes where name = 'Material');
  insert into public.product_attribute_values (attribute_id, value) values
    (attr_id, 'Leather'), (attr_id, 'Cotton'), (attr_id, 'Polyester'), (attr_id, 'Metal'),
    (attr_id, 'Plastic'), (attr_id, 'Wood'), (attr_id, 'Glass'), (attr_id, 'Ceramic')
  on conflict do nothing;
end $$;

-- Products (sample products)
insert into public.products (name, short_name, sku, price, original_price, category_id, brand, description, image, stock, status, emi_available, emi_plan_mode, tenure_options, down_payment, down_payment_type, first_payment_rule, service_charge, delivery_charge, gst_percentage, country_of_origin, warranty, condition, serial_tracking, purchase_price, mrp, weight, est_delivery_days, return_window, replacement_allowed, cod_allowed, min_quantity, max_quantity, cash_purchase_allowed, emi_purchase_allowed, visibility, featured, trending, recommended)
select
  'Samsung Galaxy S26 Ultra', 'Galaxy S26 Ultra', 'SMS-S26U-BLK-256', 109999, 124999,
  c.id, 'Samsung',
  'The ultimate Galaxy experience with AI-powered features, 200MP camera, and S Pen support.',
  'https://images.unsplash.com/photo-1610945265064-0e34e551a75f?w=400', 50, 'active', true, 'multiple', '{3,6,9,12}', 10, 'percentage', 'down_payment', 0, 0, 18, 'India', '1 Year', 'new', false, 95000, 124999, 228, 3, 7, true, true, 1, 5, true, true, 'visible', true, true, true
from public.categories c where c.name = 'Electronics';

insert into public.products (name, short_name, sku, price, original_price, category_id, brand, description, image, stock, status, emi_available, emi_plan_mode, tenure_options, down_payment, down_payment_type, first_payment_rule, service_charge, delivery_charge, gst_percentage, country_of_origin, warranty, condition, serial_tracking, purchase_price, mrp, weight, est_delivery_days, return_window, replacement_allowed, cod_allowed, min_quantity, max_quantity, cash_purchase_allowed, emi_purchase_allowed, visibility, featured, trending, recommended)
select
  'Apple iPhone 16 Pro Max', 'iPhone 16 Pro Max', 'APL-IP16PM-BLK-256', 134900, 149900,
  c.id, 'Apple',
  'A17 Pro chip, 48MP camera system, titanium design, and all-day battery life.',
  'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400', 30, 'active', true, 'multiple', '{3,6,9,12,18}', 10, 'percentage', 'down_payment', 0, 0, 18, 'India', '1 Year', 'new', false, 120000, 149900, 221, 3, 7, true, true, 1, 3, true, true, 'visible', true, true, true
from public.categories c where c.name = 'Electronics';

insert into public.products (name, short_name, sku, price, original_price, category_id, brand, description, image, stock, status, emi_available, emi_plan_mode, tenure_options, down_payment, down_payment_type, first_payment_rule, service_charge, delivery_charge, gst_percentage, country_of_origin, warranty, condition, serial_tracking, purchase_price, mrp, weight, est_delivery_days, return_window, replacement_allowed, cod_allowed, min_quantity, max_quantity, cash_purchase_allowed, emi_purchase_allowed, visibility, featured, trending, recommended)
select
  'Sony WH-1000XM5 Headphones', 'Sony XM5', 'SON-WH1000XM5-BLK', 29990, 34990,
  c.id, 'Sony',
  'Industry-leading noise cancellation with premium sound quality and 30-hour battery life.',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 100, 'active', true, 'single', '{6,9,12}', 15, 'amount', 'down_payment', 0, 0, 18, 'China', '2 Years', 'new', false, 24000, 34990, 250, 3, 10, true, true, 1, 10, true, true, 'visible', true, false, true
from public.categories c where c.name = 'Electronics';

insert into public.products (name, short_name, sku, price, original_price, category_id, brand, description, image, stock, status, emi_available, emi_plan_mode, tenure_options, down_payment, down_payment_type, first_payment_rule, service_charge, delivery_charge, gst_percentage, country_of_origin, warranty, condition, serial_tracking, purchase_price, mrp, weight, est_delivery_days, return_window, replacement_allowed, cod_allowed, min_quantity, max_quantity, cash_purchase_allowed, emi_purchase_allowed, visibility, featured, trending, recommended)
select
  'Nike Air Max 270 React', 'Air Max 270', 'NKE-AM270-BLK-9', 15995, 18995,
  c.id, 'Nike',
  'Comfortable lifestyle sneaker with Max Air unit and React foam sole.',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 200, 'active', true, 'single', '{3,6}', 20, 'percentage', 'down_payment', 0, 0, 12, 'Vietnam', '6 Months', 'new', false, 12000, 18995, 400, 4, 15, true, true, 1, 5, true, true, 'visible', true, false, true
from public.categories c where c.name = 'Fashion';

insert into public.products (name, short_name, sku, price, original_price, category_id, brand, description, image, stock, status, emi_available, emi_plan_mode, tenure_options, down_payment, down_payment_type, first_payment_rule, service_charge, delivery_charge, gst_percentage, country_of_origin, warranty, condition, serial_tracking, purchase_price, mrp, weight, est_delivery_days, return_window, replacement_allowed, cod_allowed, min_quantity, max_quantity, cash_purchase_allowed, emi_purchase_allowed, visibility, featured, trending, recommended)
select
  'boAt Airdopes 141 Pro TWS', 'Airdopes 141 Pro', 'BOAT-AD141-BLK', 2999, 3999,
  c.id, 'boAt',
  'True wireless earbuds with 60 hours battery, IWP technology, and ASAP charging.',
  'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=400', 500, 'active', true, 'single', '{3,6}', 0, 'amount', 'down_payment', 0, 0, 18, 'India', '1 Year', 'new', false, 2000, 3999, 45, 2, 7, true, true, 1, 20, true, true, 'visible', false, true, false
from public.categories c where c.name = 'Electronics';

-- Link products to dealers
insert into public.product_dealers (product_id, dealer_id, purchase_price)
select p.id, d.id,
  case when d.dealer_code like 'APL%' then p.purchase_price
       when d.dealer_code like 'SMS%' then p.purchase_price - 5000
       else p.purchase_price - 2000 end
from public.products p
cross join public.dealers d
where (d.dealer_code like 'APL%' and p.brand = 'Apple')
   or (d.dealer_code like 'SMS%' and p.brand = 'Samsung')
   or (d.dealer_code like 'NKE%' and p.brand = 'Nike')
   or (d.dealer_code like 'SON%' and p.brand = 'Sony');

-- Link products to suppliers
insert into public.product_suppliers (product_id, supplier_id)
select p.id, s.id from public.products p
cross join public.suppliers s
where s.code = 'TD-001';

-- Set brand_id on products
update public.products p set brand_id = b.id
from public.brands b
where lower(p.brand) = lower(b.name);
