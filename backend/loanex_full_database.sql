-- ========================================================
-- LoanEx Complete Native PostgreSQL Dump & Setup Script
-- Generated on: 2026-08-06T09:04:30.935Z
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: public.categories (1 records)
INSERT INTO public."categories" ("id", "name", "description", "icon", "color", "bgColor", "status", "sortOrder", "createdAt") VALUES ('c08560f2-0f2d-4ed7-b5ff-33cb9c15933c', 'Smartphones', NULL, 'pi pi-mobile', '#3b82f6', '#eff6ff', 'active', 1, '2026-08-06T09:04:26.122Z') ON CONFLICT DO NOTHING;

-- Table: public.products (2 records)
INSERT INTO public."products" ("id", "name", "slug", "sku", "brand", "description", "shortDescription", "categoryId", "subCategoryId", "childCategoryId", "image", "galleryImages", "price", "mrp", "discount", "stock", "availableStock", "reservedStock", "status", "emiAvailable", "featured", "trending", "recommended", "warranty", "hsnCode", "manufacturer", "modelNumber", "barcode", "countryOfOrigin", "boxContents", "specifications", "features", "createdAt") VALUES ('3350a129-9ca9-486f-b62d-32fb54c9fce1', 'Dell XPS 13 Laptop (Intel Core Ultra 7, 16GB RAM, 1TB SSD)', 'dell-xps13-1tb', 'DELL-XPS13-1TB', 'Dell', 'Crafted with machined aluminum and Gorilla Glass 3, featuring an infinity-edge OLED display and AI-powered performance.', 'Infinity-edge OLED display and AI-powered performance.', 'c08560f2-0f2d-4ed7-b5ff-33cb9c15933c', NULL, NULL, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80', '[]'::jsonb, '154990.00', '169990.00', NULL, 40, 0, 0, 'active', true, true, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-08-06T09:04:26.126Z') ON CONFLICT DO NOTHING;
INSERT INTO public."products" ("id", "name", "slug", "sku", "brand", "description", "shortDescription", "categoryId", "subCategoryId", "childCategoryId", "image", "galleryImages", "price", "mrp", "discount", "stock", "availableStock", "reservedStock", "status", "emiAvailable", "featured", "trending", "recommended", "warranty", "hsnCode", "manufacturer", "modelNumber", "barcode", "countryOfOrigin", "boxContents", "specifications", "features", "createdAt") VALUES ('657ff9b8-cef4-4a96-809a-6cee4ce64235', 'Apple iPhone 15 Pro Max 256GB - Natural Titanium', 'iphone-15promax-256', 'IPHONE-15PROMAX-256', 'Apple', 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.', 'Forged in titanium and featuring the groundbreaking A17 Pro chip.', 'c08560f2-0f2d-4ed7-b5ff-33cb9c15933c', NULL, NULL, 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80', '[]'::jsonb, '139900.00', '159900.00', NULL, 50, 0, 0, 'active', true, true, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-08-06T09:04:26.135Z') ON CONFLICT DO NOTHING;

-- Table: public.product_emi_plans (2 records)
INSERT INTO public."product_emi_plans" ("id", "productId", "planName", "months", "downPayment", "serviceCharge", "deliveryCharge", "minEligibilityAmount", "customerVisibility") VALUES ('31a01c3f-8f82-436d-a5d6-7b3cf16cbdf8', '3350a129-9ca9-486f-b62d-32fb54c9fce1', '6 Months Standard', 6, '2500.00', '500.00', '0.00', '5000.00', 'visible') ON CONFLICT DO NOTHING;
INSERT INTO public."product_emi_plans" ("id", "productId", "planName", "months", "downPayment", "serviceCharge", "deliveryCharge", "minEligibilityAmount", "customerVisibility") VALUES ('baab7244-9e8b-4b95-82ea-534b919cda76', '657ff9b8-cef4-4a96-809a-6cee4ce64235', '6 Months Standard', 6, '2500.00', '500.00', '0.00', '5000.00', 'visible') ON CONFLICT DO NOTHING;

-- Table: public.users (1 records)
INSERT INTO public."users" ("id", "phone", "email", "role", "encryptedPassword", "created_at", "updated_at") VALUES ('beabd43e-1a0a-47f3-983b-455918906e89', '9462557060', 'gourimusharraf@gmail.com', 'customer', NULL, '2026-08-06T09:04:06.914Z', '2026-08-06T09:04:06.914Z') ON CONFLICT DO NOTHING;

