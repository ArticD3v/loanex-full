-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('EMI', 'DIRECT');

-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM (
  'CREATED',
  'PENDING_PAYMENT',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED'
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "variant" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2),
    "imageUrl" TEXT NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchaseType" "PurchaseType" NOT NULL,
    "addressId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_inStock_idx" ON "products"("inStock");

-- CreateIndex
CREATE INDEX "checkout_sessions_userId_createdAt_idx" ON "checkout_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "checkout_sessions_productId_idx" ON "checkout_sessions"("productId");

-- CreateIndex
CREATE INDEX "checkout_sessions_status_createdAt_idx" ON "checkout_sessions"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed catalog products used by the storefront
INSERT INTO "products" ("id", "name", "brand", "variant", "price", "mrp", "imageUrl", "stockQuantity", "inStock", "deliveryCharge", "createdAt", "updatedAt")
VALUES
  ('hp-pavilion-15', 'HP Pavilion 15 Laptop, Core i5, 16GB RAM, 512GB SSD', 'HP', '16GB RAM / 512GB SSD', 50000, 62990, 'assets/images/products/laptop.png', 25, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iphone-15', 'iPhone 15 (128GB)', 'Apple', '128GB', 68900, 79900, 'assets/images/products/iphone.png', 18, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('samsung-tv', 'Samsung 55" 4K Ultra HD Smart TV', 'Samsung', '55 inch 4K', 42990, 54990, 'assets/images/products/tv.png', 12, true, 49, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lg-washer', 'LG 7.5 Kg 5 Star Front Load Washer', 'LG', '7.5 Kg', 34990, 41990, 'assets/images/products/washer.png', 10, true, 99, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('whirlpool-fridge', 'Whirlpool 265L Frost Free Refrigerator', 'Whirlpool', '265L', 28990, 34990, 'assets/images/products/fridge.png', 8, true, 99, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sony-headphones', 'Sony WH-1000XM5 Wireless Headphones', 'Sony', 'Black', 29990, 34990, 'assets/images/products/headphones.png', 30, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
