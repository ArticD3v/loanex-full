const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sfddelyotptsfbigwllg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZGRlbHlvdHB0c2ZiaWd3bGxnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUzNjY4NiwiZXhwIjoyMDk4MTEyNjg2fQ.kHrUiC69sTYqES2uT5Tbza9Yd-0oW3YKhrxQX3JjOTc';
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
