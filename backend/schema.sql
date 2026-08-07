-- LoanEx Pure PostgreSQL Database Schema DDL
-- Standard SQL matching PostgreSQL / Prisma Database definitions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.wishlist_items CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.emi_details CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.digilocker_reports CASCADE;
DROP TABLE IF EXISTS public.experian_reports CASCADE;
DROP TABLE IF EXISTS public.customer_kyc CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.product_emi_plans CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.dealers CASCADE;
DROP TABLE IF EXISTS public.warehouses CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.manufacturers CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.sub_categories CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Users table (Auth & User directory)
CREATE TABLE public.users (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "phone" VARCHAR(20) UNIQUE,
  "email" VARCHAR(255) UNIQUE,
  "role" VARCHAR(50) DEFAULT 'customer',
  "encryptedPassword" VARCHAR(255),
  "password" VARCHAR(255),
  "status" VARCHAR(50) DEFAULT 'PENDING',
  "mobileVerified" BOOLEAN DEFAULT false,
  "mobile_verified" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

-- Profiles table
CREATE TABLE public.profiles (
  "id" VARCHAR(255) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  "mobile_number" VARCHAR(20) UNIQUE NOT NULL,
  "fullName" VARCHAR(255),
  "email" VARCHAR(255),
  "dob" DATE,
  "gender" VARCHAR(20),
  "kyc_status" VARCHAR(50) DEFAULT 'Pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE public.categories (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "icon" VARCHAR(255),
  "color" VARCHAR(50),
  "bgColor" VARCHAR(50),
  "status" VARCHAR(50) DEFAULT 'active',
  "sortOrder" INT DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Sub Categories table
CREATE TABLE public.sub_categories (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "category_id" VARCHAR(255) NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT DEFAULT '',
  "image" TEXT DEFAULT '',
  "sort_order" INT DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Brands table
CREATE TABLE public.brands (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) UNIQUE NOT NULL,
  "logo" TEXT DEFAULT '',
  "description" TEXT DEFAULT '',
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Manufacturers table
CREATE TABLE public.manufacturers (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "gst_number" VARCHAR(100) DEFAULT '',
  "address" TEXT DEFAULT '',
  "contact_person" VARCHAR(255) DEFAULT '',
  "phone" VARCHAR(50) DEFAULT '',
  "email" VARCHAR(255) DEFAULT '',
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE public.suppliers (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "gst_number" VARCHAR(100) DEFAULT '',
  "address" TEXT DEFAULT '',
  "phone" VARCHAR(50) DEFAULT '',
  "email" VARCHAR(255) DEFAULT '',
  "contact_person" VARCHAR(255) DEFAULT '',
  "bank_details" TEXT DEFAULT '',
  "payment_terms" VARCHAR(255) DEFAULT '',
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses table
CREATE TABLE public.warehouses (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "address" TEXT DEFAULT '',
  "contact_person" VARCHAR(255) DEFAULT '',
  "phone" VARCHAR(50) DEFAULT '',
  "capacity" INT DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Dealers table
CREATE TABLE public.dealers (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealer_code" VARCHAR(100) UNIQUE NOT NULL,
  "dealer_name" VARCHAR(255) NOT NULL,
  "dealer_address" TEXT DEFAULT '',
  "dealer_mobile" VARCHAR(50) NOT NULL,
  "gst_number" VARCHAR(100) DEFAULT '',
  "branch" VARCHAR(100) DEFAULT '',
  "payment_schedule" VARCHAR(100) DEFAULT '',
  "hold_days" INT DEFAULT 0,
  "commission" NUMERIC(5, 2) DEFAULT 0,
  "email" VARCHAR(255) DEFAULT '',
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) UNIQUE,
  "sku" VARCHAR(255) UNIQUE,
  "brand" VARCHAR(255),
  "description" TEXT,
  "shortDescription" TEXT,
  "categoryId" VARCHAR(255) REFERENCES public.categories(id) ON DELETE SET NULL,
  "subCategoryId" VARCHAR(255) REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  "childCategoryId" VARCHAR(255),
  "image" TEXT,
  "galleryImages" JSONB DEFAULT '[]'::jsonb,
  "price" NUMERIC(10, 2) DEFAULT 0.00,
  "mrp" NUMERIC(10, 2),
  "discount" NUMERIC(10, 2),
  "stock" INT DEFAULT 0,
  "availableStock" INT DEFAULT 0,
  "reservedStock" INT DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'active',
  "emiAvailable" BOOLEAN DEFAULT TRUE,
  "featured" BOOLEAN DEFAULT FALSE,
  "trending" BOOLEAN DEFAULT FALSE,
  "recommended" BOOLEAN DEFAULT FALSE,
  "warranty" VARCHAR(255),
  "hsnCode" VARCHAR(100),
  "manufacturer" VARCHAR(255),
  "modelNumber" VARCHAR(100),
  "barcode" VARCHAR(100),
  "countryOfOrigin" VARCHAR(100),
  "boxContents" JSONB,
  "specifications" JSONB,
  "features" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Product EMI Plans table
CREATE TABLE public.product_emi_plans (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId" VARCHAR(255) NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "planName" VARCHAR(255),
  "months" INT,
  "downPayment" NUMERIC(10, 2) DEFAULT 0.00,
  "serviceCharge" NUMERIC(10, 2) DEFAULT 0.00,
  "deliveryCharge" NUMERIC(10, 2) DEFAULT 0.00,
  "minEligibilityAmount" NUMERIC(10, 2) DEFAULT 0.00,
  "customerVisibility" VARCHAR(50) DEFAULT 'visible'
);

CREATE INDEX idx_product_emi_plans_product ON public.product_emi_plans("productId");

-- Addresses table
CREATE TABLE public.addresses (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userId" VARCHAR(255) REFERENCES public.users(id) ON DELETE CASCADE,
  "label" VARCHAR(100),
  "receiver_name" VARCHAR(255),
  "mobileNumber" VARCHAR(50),
  "house_number" VARCHAR(255),
  "apartment" VARCHAR(255),
  "street" TEXT,
  "area" TEXT,
  "landmark" TEXT,
  "city" VARCHAR(100),
  "state" VARCHAR(100),
  "pincode" VARCHAR(20),
  "fullAddress" TEXT,
  "is_default" BOOLEAN DEFAULT FALSE,
  "isResidentialVerified" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Digilocker Reports table
CREATE TABLE IF NOT EXISTS public.digilocker_reports (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  "clientId" VARCHAR(255),
  "name" VARCHAR(255),
  "gender" VARCHAR(50),
  "dob" VARCHAR(50),
  "careOf" VARCHAR(255),
  "yob" VARCHAR(50),
  "zip" VARCHAR(50),
  "masked_aadhaar" VARCHAR(100),
  "fullAddress" TEXT,
  "father_name" VARCHAR(255),
  "profileImage" TEXT,
  "xml_url" TEXT,
  "rawData" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Experian Reports table
CREATE TABLE IF NOT EXISTS public.experian_reports (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" VARCHAR(255) UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  "reportDate" VARCHAR(100),
  "report_time" VARCHAR(100),
  "firstName" VARCHAR(255),
  "last_name" VARCHAR(255),
  "incomeTaxPan" VARCHAR(50),
  "date_of_birth_applicant" VARCHAR(50),
  "mobilePhoneNumber" VARCHAR(50),
  "email_id" VARCHAR(255),
  "bureauScore" INT,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Customer KYC table
CREATE TABLE public.customer_kyc (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" VARCHAR(255) UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userId" VARCHAR(255) REFERENCES public.users(id) ON DELETE CASCADE,
  "fullName" VARCHAR(255),
  "dob" VARCHAR(50),
  "gender" VARCHAR(20),
  "panNumber" VARCHAR(50),
  "pan_verified" BOOLEAN DEFAULT FALSE,
  "panNameMatchScore" INT,
  "aadhar_number" VARCHAR(50),
  "aadharVerified" BOOLEAN DEFAULT FALSE,
  "aadharRawData" JSONB,
  "face_verified" BOOLEAN DEFAULT FALSE,
  "faceLivenessScore" NUMERIC,
  "faceMatchScore" NUMERIC,
  "faceRawData" JSONB,
  "cibil_score" INT,
  "cibil_checked" BOOLEAN DEFAULT FALSE,
  "experianRawData" JSONB,
  "credit_eligibility_status" VARCHAR(100),
  "kycCompleted" BOOLEAN DEFAULT FALSE,
  "kycCompletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userId" VARCHAR(255) REFERENCES public.users(id) ON DELETE CASCADE,
  "addressId" VARCHAR(255) REFERENCES public.addresses(id),
  "total_amount" NUMERIC(10, 2) NOT NULL,
  "subtotal" NUMERIC(10, 2) DEFAULT 0.00,
  "total" NUMERIC(10, 2) DEFAULT 0.00,
  "paymentMethod" VARCHAR(50),
  "payment_status" VARCHAR(50),
  "status" VARCHAR(50) DEFAULT 'Pending',
  "items" JSONB DEFAULT '[]'::jsonb,
  "addressSnapshot" JSONB,
  "phone" VARCHAR(50),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items table
CREATE TABLE public.order_items (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" VARCHAR(255) REFERENCES public.orders(id) ON DELETE CASCADE,
  "productId" VARCHAR(255) REFERENCES public.products(id) ON DELETE RESTRICT,
  "quantity" INT NOT NULL,
  "price_at_booking" NUMERIC(10, 2) NOT NULL
);

-- EMI Details table
CREATE TABLE public.emi_details (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "order_id" VARCHAR(255) UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "tenure" INT NOT NULL,
  "first_payment_rule" VARCHAR(100),
  "down_payment_amount" INT NOT NULL,
  "service_charge" INT DEFAULT 0,
  "delivery_charge" INT DEFAULT 0,
  "total_payable" INT NOT NULL,
  "balance_for_emi" INT NOT NULL,
  "regular_emi_amount" INT NOT NULL,
  "final_emi_amount" INT NOT NULL,
  "months" INT NOT NULL,
  "monthly_amount" INT NOT NULL,
  "total_amount" INT NOT NULL,
  "interest_rate" NUMERIC(5, 2) DEFAULT 0.00,
  "emi_status" VARCHAR(50) DEFAULT 'pending_approval',
  "paid_installments" INT DEFAULT 0,
  "nextDueDate" DATE,
  "schedule" JSONB DEFAULT '[]'::jsonb,
  "dealerId" VARCHAR(255) REFERENCES public.dealers(id),
  "dealerSnapshot" JSONB,
  "admin_proposal" JSONB,
  "customer_accepted" BOOLEAN DEFAULT FALSE,
  "customerAcceptedAt" TIMESTAMPTZ,
  "downpayment_paid" BOOLEAN DEFAULT FALSE,
  "downpaymentPaidAt" TIMESTAMPTZ,
  "customer_notes" TEXT DEFAULT '',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Cart Items table
CREATE TABLE public.cart_items (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "quantity" INT DEFAULT 1,
  "selectedTenure" INT,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "product_id")
);

-- Wishlist Items table
CREATE TABLE public.wishlist_items (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "product_id")
);

-- Banners table
CREATE TABLE public.banners (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" VARCHAR(255) NOT NULL,
  "subtitle" VARCHAR(255),
  "badgeText" VARCHAR(100),
  "image_url" TEXT NOT NULL,
  "link" VARCHAR(255),
  "sort_order" INT DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'active',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "type" VARCHAR(50),
  "route" VARCHAR(255),
  "read" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
