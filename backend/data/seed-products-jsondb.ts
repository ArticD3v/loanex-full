const { v4: uuidv4 } = require('uuid');
const { jsonDb } = require('../src/config/json-db');

const categories = jsonDb.findMany('categories').map(c => c.id);
const brands = ['Apple', 'Dell', 'Samsung', 'Sony', 'HP', 'Lenovo', 'Asus', 'LG', 'OnePlus', 'Google'];

const adjectives = ['Pro', 'Max', 'Ultra', 'Plus', 'Elite', 'Lite', 'Smart', 'Advanced', 'Essential'];
const nouns = ['Book', 'Phone', 'Pad', 'Tab', 'Watch', 'Vision', 'Display', 'Studio'];

const images = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=800&q=80',
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80',
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
  'https://images.unsplash.com/photo-1505156868547-9b49f4df4e04?w=800&q=80',
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
];

for(let i=0; i<50; i++) {
  const brand = brands[Math.floor(Math.random() * brands.length)];
  const category = categories[Math.floor(Math.random() * categories.length)] || categories[0];
  const name = `${brand} ${nouns[Math.floor(Math.random() * nouns.length)]} ${Math.floor(Math.random() * 15) + 1} ${adjectives[Math.floor(Math.random() * adjectives.length)]}`;
  
  const price = Math.floor(Math.random() * 100000) + 10000;
  const mrp = price + Math.floor(Math.random() * 20000) + 2000;
  const image = images[Math.floor(Math.random() * images.length)];
  
  const product = {
    name: name,
    slug: name.toLowerCase().replace(/ /g, '-'),
    sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    brand: brand,
    description: `Experience the next generation of tech with the ${name}. Engineered for performance.`,
    shortDescription: `High-performance ${name}`,
    categoryId: category,
    image: image,
    galleryImages: [image, images[Math.floor(Math.random() * images.length)]],
    price: price,
    mrp: mrp,
    discount: mrp - price,
    stock: Math.floor(Math.random() * 100) + 10,
    availableStock: Math.floor(Math.random() * 100) + 10,
    reservedStock: 0,
    status: 'active',
    emiAvailable: true,
    featured: Math.random() > 0.8,
    trending: Math.random() > 0.8,
    recommended: Math.random() > 0.5,
    warranty: '1 Year Manufacturer Warranty',
    createdAt: new Date().toISOString()
  };
  
  const insertedProduct = jsonDb.insert('products', product);
  
  // Add an EMI plan for each
  jsonDb.insert('product_emi_plans', {
    productId: insertedProduct.id,
    planName: '6 Months Standard',
    months: 6,
    downPayment: Math.floor(price * 0.2),
    serviceCharge: Math.floor(price * 0.01),
    deliveryCharge: 0,
    minEligibilityAmount: 5000,
    customerVisibility: 'visible'
  });
}

console.log('Successfully inserted 50 products via jsonDb.');
