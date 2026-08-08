/**
 * Dev seed script — seeds catalog data via Supabase REST when configured.
 *
 * Requires env (do NOT hardcode secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Prefer seeding through Backend API → MongoDB for production data.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in the environment; secrets must not be hardcoded.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding categories...');
  const { data: cats, error: catErr } = await supabase.from('categories').insert([
    { name: 'Mobiles', description: 'Smartphones', icon: 'smartphone', color: '#3B82F6', bg_color: '#DBEAFE', status: 'active', sort_order: 1 },
    { name: 'Laptops', description: 'Computers', icon: 'laptop-mac', color: '#8B5CF6', bg_color: '#EDE9FE', status: 'active', sort_order: 2 },
    { name: 'TVs', description: 'Televisions', icon: 'tv', color: '#EF4444', bg_color: '#FEE2E2', status: 'active', sort_order: 3 },
  ]).select();

  if (catErr) { console.error('Cat Error:', catErr); return; }
  console.log('Categories seeded:', cats.length);

  console.log('Seeding products...');
  const products = [
    {
      name: 'iPhone 15 Pro Max',
      sku: 'IP15PM-256',
      price: 159900,
      category_id: cats[0].id,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
      description: 'The ultimate iPhone.',
      brand: 'Apple',
      stock: 50,
      status: 'active',
      emi_available: true,
      featured: true,
      trending: true,
      recommended: true
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      sku: 'S24U-512',
      price: 129999,
      category_id: cats[0].id,
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80',
      description: 'Galaxy AI is here.',
      brand: 'Samsung',
      stock: 30,
      status: 'active',
      emi_available: true,
      featured: true,
      trending: false,
      recommended: true
    },
    {
      name: 'MacBook Air M3',
      sku: 'MBA-M3-8-256',
      price: 114900,
      category_id: cats[1].id,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      description: 'Lean. Mean. M3 machine.',
      brand: 'Apple',
      stock: 20,
      status: 'active',
      emi_available: true,
      featured: false,
      trending: true,
      recommended: false
    },
    {
      name: 'Sony Bravia XR 65"',
      sku: 'XR-65X90L',
      price: 149990,
      category_id: cats[2].id,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
      description: 'Cognitive Processor XR.',
      brand: 'Sony',
      stock: 15,
      status: 'active',
      emi_available: true,
      featured: true,
      trending: false,
      recommended: true
    }
  ];

  const { data: prods, error: prodErr } = await supabase.from('products').insert(products).select();
  if (prodErr) { console.error('Prod Error:', prodErr); return; }
  console.log('Products seeded:', prods.length);

  console.log('Seeding banners...');
  const { error: banErr } = await supabase.from('banners').insert([
    { title: 'Big Billion Days', subtitle: 'Up to 50% off on Mobiles', image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80', link: '', sort_order: 1, status: 'active' },
    { title: 'Zero Cost EMI', subtitle: 'On all Apple products', badge_text: '0% Interest', image_url: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800&q=80', link: '', sort_order: 2, status: 'active' }
  ]);
  if (banErr) { console.error('Banner Error:', banErr); return; }
  console.log('Banners seeded successfully.');
}

seed();
