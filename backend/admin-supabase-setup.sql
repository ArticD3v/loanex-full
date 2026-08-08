-- ========================================================
-- LoanEx Admin App + Website — Shared Supabase Database Setup
-- Idempotent: safe to run multiple times (CREATE IF NOT EXISTS,
-- ALTER ADD COLUMN IF NOT EXISTS, INSERT ... ON CONFLICT DO NOTHING).
-- Run in the Supabase SQL Editor (public schema).
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- users — add a plaintext-compatible bcrypt password column
-- (admin login stores a bcrypt hash in encryptedPassword; the
--  password column is kept for flexibility / external tooling)
-- ----------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "password" VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "encryptedPassword" VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mobileVerified" BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mobile_verified" BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- Refresh tokens used by JWT logout/refresh (optional table; create if missing)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "token" TEXT NOT NULL,
  "userId" VARCHAR(255) REFERENCES public.users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON public.refresh_tokens ("token");
CREATE INDEX IF NOT EXISTS refresh_tokens_userId_idx ON public.refresh_tokens ("userId");

-- ----------------------------------------------------------
-- profiles — branch / pincode access mapping used by admin app
-- ----------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "branches" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "pincodes" JSONB DEFAULT '[]'::jsonb;

-- ----------------------------------------------------------
-- Master data tables (match schema.sql definitions)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sub_categories (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "category_id" VARCHAR(255) REFERENCES public.categories(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT DEFAULT '',
  "image" TEXT DEFAULT '',
  "sort_order" INT DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.brands (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) UNIQUE NOT NULL,
  "logo" TEXT DEFAULT '',
  "description" TEXT DEFAULT '',
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manufacturers (
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

CREATE TABLE IF NOT EXISTS public.suppliers (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(100) NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS public.warehouses (
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

CREATE TABLE IF NOT EXISTS public.dealers (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealer_code" VARCHAR(100) UNIQUE NOT NULL,
  "dealer_name" VARCHAR(255) NOT NULL,
  "dealer_address" TEXT DEFAULT '',
  "dealer_mobile" VARCHAR(50) NOT NULL,
  "gst_number" VARCHAR(100) DEFAULT '',
  "branch" VARCHAR(100) DEFAULT '',
  "payment_schedule" VARCHAR(100) DEFAULT '',
  "hold_days" INT DEFAULT 0,
  "commission" DOUBLE PRECISION DEFAULT 0,
  "email" VARCHAR(255) DEFAULT '',
  "status" VARCHAR(50) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Orders / order items / EMI details
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderNumber" VARCHAR(255),
  "orderStatus" VARCHAR(50) DEFAULT 'CONFIRMED',
  "profileId" VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
  "userId" VARCHAR(255) REFERENCES public.users(id) ON DELETE CASCADE,
  "addressId" VARCHAR(255) REFERENCES public.addresses(id),
  "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "subtotal" DOUBLE PRECISION DEFAULT 0,
  "total" DOUBLE PRECISION DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS public.order_items (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" VARCHAR(255) REFERENCES public.orders(id) ON DELETE CASCADE,
  "productId" VARCHAR(255) REFERENCES public.products(id) ON DELETE RESTRICT,
  "quantity" INT NOT NULL,
  "price_at_booking" DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS public.emi_details (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "order_id" VARCHAR(255) UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
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
  "interest_rate" DOUBLE PRECISION DEFAULT 0,
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

-- ----------------------------------------------------------
-- Addresses
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
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

CREATE TABLE IF NOT EXISTS public.userAddress (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "addressType" VARCHAR(50) DEFAULT 'SHIPPING',
  "label" VARCHAR(100),
  "receiver_name" VARCHAR(255),
  "mobileNumber" VARCHAR(50),
  "street" TEXT,
  "area" TEXT,
  "landmark" TEXT,
  "city" VARCHAR(100),
  "state" VARCHAR(100),
  "pincode" VARCHAR(20),
  "fullAddress" TEXT,
  "is_default" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Verification collections (customer KYC lifecycle)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customerVerification (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255) UNIQUE,
  "verificationStatus" VARCHAR(50) DEFAULT 'NOT_STARTED',
  "kycCompleted" BOOLEAN DEFAULT FALSE,
  "kycCompletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.aadhaarVerification (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "verificationStatus" VARCHAR(50),
  "aadhaarNumber" VARCHAR(50),
  "nameMatchScore" INT,
  "rawData" JSONB,
  "status" VARCHAR(50),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.panVerification (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "status" VARCHAR(50),
  "panNumber" VARCHAR(50),
  "nameMatchScore" INT,
  "rawData" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bankVerification (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "status" VARCHAR(50),
  "accountNumberHash" VARCHAR(255),
  "accountHolder" VARCHAR(255),
  "bankName" VARCHAR(255),
  "ifscCode" VARCHAR(50),
  "verificationStatus" VARCHAR(50),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mobileVerification (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "verificationStatus" VARCHAR(50),
  "mobileNumber" VARCHAR(20),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- EMI applications / loans / schedules / payments / autopay
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emi_applications (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "applicationNumber" VARCHAR(255),
  "userId" VARCHAR(255),
  "productId" VARCHAR(255),
  "productName" VARCHAR(255),
  "sellingPrice" DOUBLE PRECISION DEFAULT 0,
  "requestedAmount" DOUBLE PRECISION DEFAULT 0,
  "requestedDownPayment" DOUBLE PRECISION DEFAULT 0,
  "requestedTenure" INT DEFAULT 0,
  "estimatedMonthlyEmi" DOUBLE PRECISION DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'PENDING',
  "submittedAt" TIMESTAMPTZ,
  "approvedAmount" DOUBLE PRECISION,
  "approvedTenure" INT,
  "approvedDownPayment" DOUBLE PRECISION,
  "monthlyEmi" DOUBLE PRECISION,
  "interestRate" DOUBLE PRECISION,
  "processingFee" DOUBLE PRECISION,
  "adminRemarks" TEXT,
  "offerAcceptedAt" TIMESTAMPTZ,
  "offerDeclinedAt" TIMESTAMPTZ,
  "loanAmount" DOUBLE PRECISION,
  "downPayment" DOUBLE PRECISION,
  "tenure" INT,
  "emiPlanId" VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loanAccount (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "loanAccountNumber" VARCHAR(255),
  "applicationId" VARCHAR(255),
  "userId" VARCHAR(255),
  "productId" VARCHAR(255),
  "loanAmount" DOUBLE PRECISION DEFAULT 0,
  "interestRate" DOUBLE PRECISION DEFAULT 0,
  "processingFee" DOUBLE PRECISION DEFAULT 0,
  "loanTenure" INT DEFAULT 0,
  "emiAmount" DOUBLE PRECISION DEFAULT 0,
  "totalInterest" DOUBLE PRECISION DEFAULT 0,
  "totalPayable" DOUBLE PRECISION DEFAULT 0,
  "outstandingAmount" DOUBLE PRECISION DEFAULT 0,
  "paidAmount" DOUBLE PRECISION DEFAULT 0,
  "nextEmiDueDate" TIMESTAMPTZ,
  "loanStatus" VARCHAR(50) DEFAULT 'ACTIVE',
  "loanStartDate" TIMESTAMPTZ,
  "loanEndDate" TIMESTAMPTZ,
  "autopayEnabled" BOOLEAN DEFAULT FALSE,
  "schedule" JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emi_schedules (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "loanAccountId" VARCHAR(255),
  "emiNumber" INT,
  "dueDate" TIMESTAMPTZ,
  "principalAmount" DOUBLE PRECISION DEFAULT 0,
  "interestAmount" DOUBLE PRECISION DEFAULT 0,
  "emiAmount" DOUBLE PRECISION DEFAULT 0,
  "remainingBalance" DOUBLE PRECISION DEFAULT 0,
  "paymentStatus" VARCHAR(50) DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.paymentTransaction (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "applicationId" VARCHAR(255),
  "userId" VARCHAR(255),
  "razorpayOrderId" VARCHAR(255),
  "razorpayPaymentId" VARCHAR(255),
  "razorpaySignature" VARCHAR(255),
  "amount" DOUBLE PRECISION DEFAULT 0,
  "currency" VARCHAR(10) DEFAULT 'INR',
  "paymentStatus" VARCHAR(50),
  "paymentType" VARCHAR(50),
  "receiptPath" TEXT,
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.autopayMandate (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "loanAccountId" VARCHAR(255),
  "provider" VARCHAR(100),
  "mandateId" VARCHAR(255),
  "mandateReference" VARCHAR(255),
  "paymentMethod" VARCHAR(50),
  "bankName" VARCHAR(255),
  "upiId" VARCHAR(255),
  "maximumDebitAmount" DOUBLE PRECISION DEFAULT 0,
  "frequency" VARCHAR(50),
  "nextDebitDate" TIMESTAMPTZ,
  "status" VARCHAR(50),
  "providerPayload" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "type" VARCHAR(50),
  "category" VARCHAR(50),
  "priority" VARCHAR(50),
  "metadata" JSONB,
  "isRead" BOOLEAN DEFAULT FALSE,
  "readAt" TIMESTAMPTZ,
  "archived" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "type" VARCHAR(50),
  "route" VARCHAR(255),
  "read" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Reviews / tracking / audit / support
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId" VARCHAR(255),
  "userId" VARCHAR(255),
  "rating" INT DEFAULT 5,
  "title" VARCHAR(255),
  "comment" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orderTracking (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" VARCHAR(255),
  "status" VARCHAR(50),
  "location" TEXT,
  "remarks" TEXT,
  "courierPartner" VARCHAR(255),
  "trackingNumber" VARCHAR(255),
  "warehouse" VARCHAR(255),
  "updatedBy" VARCHAR(255),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "action" VARCHAR(255),
  "module" VARCHAR(100),
  "details" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supportTicket (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255),
  "subject" VARCHAR(255),
  "message" TEXT,
  "status" VARCHAR(50) DEFAULT 'OPEN',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- FI (Field Investigation) cases — used by the admin app
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fi_cases (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "applicationId" VARCHAR(255),
  "userId" VARCHAR(255),
  "customerName" VARCHAR(255),
  "mobile" VARCHAR(50),
  "productName" VARCHAR(255),
  "assignedExecutive" VARCHAR(255),
  "assignedDate" TIMESTAMPTZ,
  "status" VARCHAR(50) DEFAULT 'pending',
  "photoCount" INT DEFAULT 0,
  "gpsLocation" TEXT,
  "remarks" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Legacy collections referenced by old code paths (kept minimal)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emiApplication (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "applicationNumber" VARCHAR(255),
  "userId" VARCHAR(255),
  "productId" VARCHAR(255),
  "status" VARCHAR(50),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loan_accounts (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "loanAccountNumber" VARCHAR(255),
  "applicationId" VARCHAR(255),
  "userId" VARCHAR(255),
  "loanStatus" VARCHAR(50),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- Seeds
-- ========================================================

-- ----------------------------------------------------------
-- Ensure every column referenced by the seeds below exists.
-- (CREATE TABLE IF NOT EXISTS is a no-op when the table already
--  exists, so missing columns are added here idempotently.)
-- ----------------------------------------------------------
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "code" VARCHAR(100);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "gst_number" VARCHAR(100);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "contact_person" VARCHAR(255);

ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "dealer_code" VARCHAR(100);
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "dealer_name" VARCHAR(255);
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "dealer_address" TEXT;
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "dealer_mobile" VARCHAR(50);
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "gst_number" VARCHAR(100);
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "branch" VARCHAR(100);

ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS "contact_person" VARCHAR(255);
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS "capacity" INT;

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.dealers ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "icon" VARCHAR(100);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "color" VARCHAR(50);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "bgColor" VARCHAR(50);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "sortOrder" INT;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "sku" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "brand" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "categoryId" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "mrp" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "stock" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "emiAvailable" BOOLEAN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "featured" BOOLEAN;

-- Columns the backend mirrors on product create/update (jsonDb writes these
-- on every insert/update — missing columns make the Supabase mirror fail)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "wizardData" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "availableStock" INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "reservedStock" INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "trending" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "recommended" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "warranty" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "hsnCode" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "manufacturer" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "modelNumber" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "barcode" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "countryOfOrigin" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "boxContents" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "specifications" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "features" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "variants" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "subCategoryId" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "childCategoryId" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "colourSizeVariant" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "productType" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "productCondition" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "productVideoUrl" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "metaTitle" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "keywords" TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "warehouseId" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "openingStock" INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "minimumQuantity" INT DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "maximumQuantity" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "trackInventory" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "serialImeiTracking" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "requiresSerialImeiCapture" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "minOrderQuantity" INT DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "maxQuantityPerCustomer" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "minimumCustomerAge" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "eligiblePinCodes" JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "cashPurchase" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "invoiceSetting" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "requiresFieldVerification" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "weight" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "length" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "width" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "dispatchSla" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryCharges" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryDays" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryCode" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryPartner" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryZone" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "expressDelivery" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryChargeMethod" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "deliveryConfirmationOtp" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "serialImeiCaptureAtDelivery" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "replacementWindow" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "replacementDays" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "installationRequired" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "installationCharge" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "selectedEmiPlanId" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "defaultDownPaymentPercent" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "minCustomerDownPayment" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "maxDownPayment" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "downPaymentEditableAtApproval" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "serviceChargeMethod" VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "documentationCharge" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "verificationCharge" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "firstEmiDueAfter" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "gracePeriod" INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "gst" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "landingCost" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "margin" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "gstAmount" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "amazonPrice" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "flipkartPrice" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "otherWebsitePrice" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "marketLowestPrice" DOUBLE PRECISION;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "priceCheckedDate" TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "priceCheckedBy" VARCHAR(255);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "priceMatchAllowed" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "maximumDiscountAllowed" DOUBLE PRECISION;

ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "productId" VARCHAR(255);
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "planName" VARCHAR(255);
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "months" INT;
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "downPayment" DOUBLE PRECISION;
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "serviceCharge" DOUBLE PRECISION;
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "deliveryCharge" DOUBLE PRECISION;
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "minEligibilityAmount" DOUBLE PRECISION;
ALTER TABLE public.product_emi_plans ADD COLUMN IF NOT EXISTS "customerVisibility" VARCHAR(50);

-- Admin user (email: admin@loanex.com / password: Admin@123)
-- Password stored as a bcrypt hash (pgcrypto bf) — compatible
-- with bcryptjs used by the backend.
-- NOTE: uses WHERE NOT EXISTS instead of ON CONFLICT because the
-- live "users" table has no unique constraint on "id".
INSERT INTO public.users ("id", "phone", "email", "role", "encryptedPassword", "created_at", "updated_at")
SELECT '9f6a9c3e-1111-4000-8000-0000000000ad', '9999999999', 'admin@loanex.com', 'admin', crypt('Admin@123', gen_salt('bf', 10)), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE "id" = '9f6a9c3e-1111-4000-8000-0000000000ad');

-- Idempotent: re-apply admin role + password hash on re-runs
UPDATE public.users
SET "role" = 'admin',
    "encryptedPassword" = crypt('Admin@123', gen_salt('bf', 10))
WHERE "email" = 'admin@loanex.com';

INSERT INTO public.profiles ("id", "mobile_number", "fullName", "email", "kyc_status", "branches", "pincodes", "createdAt", "updatedAt")
SELECT '9f6a9c3e-1111-4000-8000-0000000000ad', '9999999999', 'Super Admin', 'admin@loanex.com', 'Approved', '["Mumbai Andheri","Delhi NCR","Bengaluru"]'::jsonb, '["400053","110001","560001"]'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE "id" = '9f6a9c3e-1111-4000-8000-0000000000ad');


-- Catalog seeds (idempotent — no-op if already present)
INSERT INTO public."categories" ("id", "name", "description", "icon", "color", "bgColor", "status", "sortOrder", "createdAt")
VALUES ('c08560f2-0f2d-4ed7-b5ff-33cb9c15933c', 'Smartphones', NULL, 'pi pi-mobile', '#3b82f6', '#eff6ff', 'active', 1, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public."products" ("id", "name", "slug", "sku", "brand", "description", "shortDescription", "categoryId", "image", "price", "mrp", "stock", "status", "emiAvailable", "featured", "createdAt")
VALUES
('3350a129-9ca9-486f-b62d-32fb54c9fce1', 'Dell XPS 13 Laptop (Intel Core Ultra 7, 16GB RAM, 1TB SSD)', 'dell-xps13-1tb', 'DELL-XPS13-1TB', 'Dell', 'Crafted with machined aluminum and Gorilla Glass 3, featuring an infinity-edge OLED display and AI-powered performance.', 'Infinity-edge OLED display and AI-powered performance.', 'c08560f2-0f2d-4ed7-b5ff-33cb9c15933c', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80', 154990, 169990, 40, 'active', true, true, NOW()),
('657ff9b8-cef4-4a96-809a-6cee4ce64235', 'Apple iPhone 15 Pro Max 256GB - Natural Titanium', 'iphone-15promax-256', 'IPHONE-15PROMAX-256', 'Apple', 'Forged in titanium and featuring the groundbreaking A17 Pro chip.', 'Forged in titanium and featuring the groundbreaking A17 Pro chip.', 'c08560f2-0f2d-4ed7-b5ff-33cb9c15933c', 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80', 139900, 159900, 50, 'active', true, true, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public."product_emi_plans" ("id", "productId", "planName", "months", "downPayment", "serviceCharge", "deliveryCharge", "minEligibilityAmount", "customerVisibility")
VALUES
('31a01c3f-8f82-436d-a5d6-7b3cf16cbdf8', '3350a129-9ca9-486f-b62d-32fb54c9fce1', '6 Months Standard', 6, 2500, 500, 0, 5000, 'visible'),
('baab7244-9e8b-4b95-82ea-534b919cda76', '657ff9b8-cef4-4a96-809a-6cee4ce64235', '6 Months Standard', 6, 2500, 500, 0, 5000, 'visible')
ON CONFLICT DO NOTHING;

-- Supplier / dealer / warehouse seeds (visible in admin app master data)
INSERT INTO public.suppliers ("id", "name", "code", "gst_number", "address", "phone", "email", "contact_person", "status", "created_at", "updated_at")
SELECT 'sup-mumbai-01', 'Mumbai Electronics Distributors', 'SUP-MUM-01', '27AABCU9603R1ZM', 'Andheri East, Mumbai, MH', '9820000001', 'sales@mumbaielectronics.in', 'Ramesh Kumar', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE "id" = 'sup-mumbai-01');
INSERT INTO public.suppliers ("id", "name", "code", "gst_number", "address", "phone", "email", "contact_person", "status", "created_at", "updated_at")
SELECT 'sup-delhi-01', 'Delhi Wholesale Mart', 'SUP-DLH-01', '07AADCD1234F1Z5', 'Karol Bagh, New Delhi', '9810000002', 'orders@delhiwholesale.in', 'Suresh Gupta', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE "id" = 'sup-delhi-01');

INSERT INTO public.dealers ("id", "dealer_code", "dealer_name", "dealer_address", "dealer_mobile", "gst_number", "branch", "status", "created_at", "updated_at")
SELECT 'dlr-andheri-01', 'DLR-AN-001', 'Andheri Digital Zone', 'Andheri West, Mumbai', '9833000001', '27ABCDE1234F1Z8', 'Mumbai Andheri', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.dealers WHERE "id" = 'dlr-andheri-01');
INSERT INTO public.dealers ("id", "dealer_code", "dealer_name", "dealer_address", "dealer_mobile", "gst_number", "branch", "status", "created_at", "updated_at")
SELECT 'dlr-bangalore-01', 'DLR-BLR-001', 'Bengaluru Gadget Hub', 'Indiranagar, Bengaluru', '9845000002', '29FGHIJ5678K1Z2', 'Bengaluru', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.dealers WHERE "id" = 'dlr-bangalore-01');

INSERT INTO public.warehouses ("id", "name", "address", "contact_person", "phone", "capacity", "status", "created_at", "updated_at")
SELECT 'wh-bhiwandi-01', 'Bhiwandi Central Warehouse', 'Bhiwandi, Thane, MH', 'Vikram Singh', '9850000001', 10000, 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses WHERE "id" = 'wh-bhiwandi-01');
INSERT INTO public.warehouses ("id", "name", "address", "contact_person", "phone", "capacity", "status", "created_at", "updated_at")
SELECT 'wh-manesar-01', 'Manesar North Warehouse', 'Manesar, Gurugram, HR', 'Ajay Sharma', '9870000002', 8000, 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses WHERE "id" = 'wh-manesar-01');
