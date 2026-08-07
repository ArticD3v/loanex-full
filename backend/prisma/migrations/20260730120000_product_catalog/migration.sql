-- Clear rows referencing products
DELETE FROM "cart_items";
DELETE FROM "wishlist_items";
DELETE FROM "checkout_sessions";
DELETE FROM "product_reviews";

-- Drop foreign keys to products
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_productId_fkey";
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_productId_fkey";
ALTER TABLE "checkout_sessions" DROP CONSTRAINT IF EXISTS "checkout_sessions_productId_fkey";
ALTER TABLE "product_reviews" DROP CONSTRAINT IF EXISTS "product_reviews_productId_fkey";

-- Drop old indexes on products
DROP INDEX IF EXISTS "products_inStock_idx";
DROP INDEX IF EXISTS "products_brand_idx";
DROP INDEX IF EXISTS "products_category_idx";
DROP INDEX IF EXISTS "products_createdAt_idx";

-- Recreate products table with full catalog schema
DROP TABLE "products" CASCADE;

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "discountPrice" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "specifications" JSONB NOT NULL,
    "emiAvailable" BOOLEAN NOT NULL DEFAULT true,
    "emiStartingFrom" DECIMAL(12,2),
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variant" TEXT,
    "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_isActive_isFeatured_idx" ON "products"("isActive", "isFeatured");
CREATE INDEX "products_brand_idx" ON "products"("brand");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");
CREATE INDEX "products_stock_idx" ON "products"("stock");

-- Restore foreign keys
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
