import { query, queryOne } from '../src/config/database';

type ProductSeed = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  brand: string;
  category: string;
  price: number;
  discountPrice: number;
  stock: number;
  sku: string;
  thumbnail: string;
  images: string[];
  variant: string;
  emiStartingFrom: number;
  rating: number;
  totalReviews: number;
  isFeatured: boolean;
  deliveryCharge: number;
  specifications: Record<string, unknown>;
};

const products: ProductSeed[] = [
  {
    id: '3350a129-9ca9-486f-b62d-32fb54c9fce1',
    slug: 'dell-xps13-1tb',
    name: 'Dell XPS 13 Laptop (Intel Core Ultra 7, 16GB RAM, 1TB SSD)',
    shortDescription: 'Infinity-edge OLED display and AI-powered performance.',
    description: 'Crafted with machined aluminum and Gorilla Glass 3, featuring an infinity-edge OLED display and AI-powered performance.',
    brand: 'Dell',
    category: 'Laptops',
    price: 169990,
    discountPrice: 154990,
    stock: 40,
    sku: 'DELL-XPS13-1TB',
    thumbnail: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80'],
    variant: '1TB SSD',
    emiStartingFrom: 6500,
    rating: 4.8,
    totalReviews: 120,
    isFeatured: true,
    deliveryCharge: 0,
    specifications: {},
  },
  {
    id: '657ff9b8-cef4-4a96-809a-6cee4ce64235',
    slug: 'iphone-15promax-256',
    name: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
    shortDescription: 'Forged in titanium and featuring the groundbreaking A17 Pro chip.',
    description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.',
    brand: 'Apple',
    category: 'Smartphones',
    price: 159900,
    discountPrice: 139900,
    stock: 50,
    sku: 'IPHONE-15PROMAX-256',
    thumbnail: 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80'],
    variant: '256GB',
    emiStartingFrom: 5800,
    rating: 4.9,
    totalReviews: 310,
    isFeatured: true,
    deliveryCharge: 0,
    specifications: {},
  },
];

async function seed() {
  console.info('Seeding Native PostgreSQL database catalog...');

  // Ensure default categories exist
  const catRes = await queryOne("SELECT id FROM categories WHERE name = 'Smartphones'");
  let catId = catRes?.id;
  if (!catId) {
    const newCat = await queryOne(`
      INSERT INTO categories (name, icon, color, "bgColor", status, "sortOrder")
      VALUES ('Smartphones', 'pi pi-mobile', '#3b82f6', '#eff6ff', 'active', 1)
      RETURNING id
    `);
    catId = newCat.id;
  }

  for (const product of products) {
    await query(`
      INSERT INTO products (
        id, name, slug, sku, brand, description, "shortDescription", "categoryId",
        image, price, mrp, stock, status, "emiAvailable", featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', true, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        mrp = EXCLUDED.mrp,
        stock = EXCLUDED.stock;
    `, [
      product.id,
      product.name,
      product.slug,
      product.sku,
      product.brand,
      product.description,
      product.shortDescription,
      catId,
      product.thumbnail,
      product.discountPrice,
      product.price,
      product.stock,
      product.isFeatured,
    ]);

    // Insert sample EMI plan for product
    await query(`
      INSERT INTO product_emi_plans (
        "productId", "planName", months, "downPayment", "serviceCharge", "deliveryCharge", "minEligibilityAmount", "customerVisibility"
      ) VALUES ($1, '6 Months Standard', 6, 2500, 500, 0, 5000, 'visible')
      ON CONFLICT DO NOTHING;
    `, [product.id]);
  }

  console.info('✅ Native PostgreSQL seed finished successfully!');
}

seed().catch(console.error);
