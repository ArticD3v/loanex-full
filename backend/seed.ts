import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Smartphones', icon: 'pi pi-mobile', color: '#3b82f6', bgColor: '#eff6ff', sortOrder: 1 },
  { name: 'Laptops', icon: 'pi pi-laptop', color: '#6366f1', bgColor: '#eef2ff', sortOrder: 2 },
  { name: 'Smart TV', icon: 'pi pi-desktop', color: '#10b981', bgColor: '#ecfdf5', sortOrder: 3 },
  { name: 'Refrigerators', icon: 'pi pi-home', color: '#f59e0b', bgColor: '#fffbeb', sortOrder: 4 },
  { name: 'Washing Machines', icon: 'pi pi-box', color: '#ec4899', bgColor: '#fdf2f8', sortOrder: 5 },
  { name: 'Audio', icon: 'pi pi-headphones', color: '#8b5cf6', bgColor: '#f5f3ff', sortOrder: 6 },
  { name: 'Smart Watch', icon: 'pi pi-clock', color: '#06b6d4', bgColor: '#ecfeff', sortOrder: 7 },
  { name: 'Tablets', icon: 'pi pi-tablet', color: '#14b8a6', bgColor: '#f0fdfa', sortOrder: 8 },
];

const fakeProducts = [
  {
    name: "Apple iPhone 15 Pro Max 256GB - Natural Titanium",
    brand: "Apple",
    category: "Smartphones",
    price: 139900,
    mrp: 159900,
    description: "Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever.",
    image: "https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80",
    sku: "IPHONE-15PROMAX-256",
    status: "active",
    stock: 50,
    featured: true,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 144900,
    cashPurchase: true
  },
  {
    name: "Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB, 256GB Storage)",
    brand: "Samsung",
    category: "Smartphones",
    price: 129999,
    mrp: 144999,
    description: "Meet Galaxy S24 Ultra, the ultimate form of Galaxy Ultra with a new titanium exterior and a 17.25cm (6.8\") flat display. It's an absolute marvel of design.",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
    sku: "SAMSUNG-S24U-256",
    status: "active",
    stock: 45,
    featured: true,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 132000,
    cashPurchase: true
  },
  {
    name: "OnePlus 12 5G (Flowy Emerald, 16GB RAM, 512GB Storage)",
    brand: "OnePlus",
    category: "Smartphones",
    price: 64999,
    mrp: 69999,
    description: "Powered by Snapdragon 8 Gen 3, 4th Gen Hasselblad Camera System for Mobile, 5400 mAh Battery with 100W SUPERVOOC charging.",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
    sku: "ONEPLUS-12-512",
    status: "active",
    stock: 80,
    featured: true,
    trending: true,
    recommended: false,
    emiAvailable: true,
    amazonPrice: 65999,
    cashPurchase: true
  },
  {
    name: "Apple MacBook Air M3 Chip (15.3-inch, 16GB Unified Memory, 512GB SSD)",
    brand: "Apple",
    category: "Laptops",
    price: 134900,
    mrp: 144900,
    description: "The 15-inch MacBook Air is impossibly thin and has a stunning Liquid Retina display. Supercharged by the M3 chip with up to 18 hours of battery life.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    sku: "MACBOOK-AIRM3-15",
    status: "active",
    stock: 30,
    featured: true,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 137900,
    cashPurchase: true
  },
  {
    name: "ASUS ROG Strix G16 Gaming Laptop (Intel Core i9 14th Gen, RTX 4070)",
    brand: "ASUS",
    category: "Laptops",
    price: 179990,
    mrp: 199990,
    description: "Draw more frames and win more games with the 2024 ROG Strix G16. Powered by an Intel Core i9 Processor 14900HX and an NVIDIA GeForce RTX 4070 Laptop GPU.",
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80",
    sku: "ASUS-ROG-G16-4070",
    status: "active",
    stock: 25,
    featured: true,
    trending: false,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 182000,
    cashPurchase: true
  },
  {
    name: "Dell XPS 13 Laptop (Intel Core Ultra 7, 16GB RAM, 1TB SSD)",
    brand: "Dell",
    category: "Laptops",
    price: 154990,
    mrp: 169990,
    description: "Crafted with machined aluminum and Gorilla Glass 3, featuring an infinity-edge OLED display and AI-powered performance.",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80",
    sku: "DELL-XPS13-1TB",
    status: "active",
    stock: 40,
    featured: false,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 156990,
    cashPurchase: true
  },
  {
    name: "Sony Bravia 65-Inch 4K Ultra HD Smart LED Google TV",
    brand: "Sony",
    category: "Smart TV",
    price: 89990,
    mrp: 119900,
    description: "4K HDR Processor X1, Triluminos Pro color palette, Dolby Vision & Atmos support, hands-free voice control with Google TV.",
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80",
    sku: "SONY-BRAVIA-65TV",
    status: "active",
    stock: 20,
    featured: true,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 91990,
    cashPurchase: true
  },
  {
    name: "Samsung 55-Inch Neo QLED 4K Smart TV",
    brand: "Samsung",
    category: "Smart TV",
    price: 114990,
    mrp: 139990,
    description: "Quantum Matrix Technology with Mini LEDs for ultra-precise light control, Neural Quantum Processor 4K, Motion Xcelerator Turbo+.",
    image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80",
    sku: "SAMSUNG-NEOQLED-55",
    status: "active",
    stock: 35,
    featured: true,
    trending: false,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 116990,
    cashPurchase: true
  },
  {
    name: "LG 674L Side-by-Side Refrigerator with Inverter Linear Compressor",
    brand: "LG",
    category: "Refrigerators",
    price: 84990,
    mrp: 104990,
    description: "DoorCooling+ for faster even cooling, Smart Diagnosis, Express Freeze, and Hygiene Fresh+ air filter for ultimate freshness.",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80",
    sku: "LG-REF-674L-SBS",
    status: "active",
    stock: 18,
    featured: true,
    trending: true,
    recommended: false,
    emiAvailable: true,
    amazonPrice: 86990,
    cashPurchase: true
  },
  {
    name: "Bosch 9kg 5 Star Fully Automatic Front Load Washing Machine",
    brand: "Bosch",
    category: "Washing Machines",
    price: 44990,
    mrp: 54990,
    description: "EcoSilence Drive motor for whisper quiet operation, AntiStain technology, SpeedPerfect for up to 65% reduced wash time.",
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80",
    sku: "BOSCH-WM-9KG-FL",
    status: "active",
    stock: 22,
    featured: false,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 46990,
    cashPurchase: true
  },
  {
    name: "Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones",
    brand: "Sony",
    category: "Audio",
    price: 26990,
    mrp: 34990,
    description: "Auto NC Optimizer automatically optimizes noise canceling based on your wearing conditions and environment. Up to 30-hour battery life.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    sku: "SONY-XM5-HEADPHONES",
    status: "active",
    stock: 60,
    featured: true,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 27990,
    cashPurchase: true
  },
  {
    name: "Apple Watch Series 9 GPS 45mm Aluminium Case with Sport Band",
    brand: "Apple",
    category: "Smart Watch",
    price: 41900,
    mrp: 44900,
    description: "S9 SiP enables a super-bright display and a magical new way to quickly and easily interact with your Apple Watch without touching the screen.",
    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80",
    sku: "APPLE-WATCH-S9-45",
    status: "active",
    stock: 75,
    featured: true,
    trending: true,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 42900,
    cashPurchase: true
  },
  {
    name: "Apple iPad Air 11-inch M2 Chip 128GB Wi-Fi",
    brand: "Apple",
    category: "Tablets",
    price: 59900,
    mrp: 64900,
    description: "Supercharged by the Apple M2 chip. Stunning Liquid Retina display. Fast Wi-Fi 6E. Works with Apple Pencil Pro and Magic Keyboard.",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
    sku: "IPAD-AIR-M2-128",
    status: "active",
    stock: 45,
    featured: true,
    trending: false,
    recommended: true,
    emiAvailable: true,
    amazonPrice: 60900,
    cashPurchase: true
  }
];

async function seed() {
  console.log('Seeding categories...');
  const categoryMap = new Map<string, string>();

  for (const cat of defaultCategories) {
    let existing = await prisma.categories.findFirst({
      where: { name: cat.name },
    });

    if (!existing) {
      existing = await prisma.categories.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          bgColor: cat.bgColor,
          sortOrder: cat.sortOrder,
          status: 'active',
        },
      });
    }
    categoryMap.set(cat.name, existing.id);
  }

  console.log('Seeding products...');
  for (const item of fakeProducts) {
    const { category, ...productData } = item;
    const slug = productData.sku.toLowerCase() + '-' + Math.random().toString(36).substring(7);
    const catId = categoryMap.get(category);

    await prisma.products.upsert({
      where: { sku: productData.sku },
      update: {
        ...productData,
        categoryId: catId,
        slug,
      },
      create: {
        ...productData,
        categoryId: catId,
        slug,
      },
    });
  }

  console.log('Successfully seeded categories and products!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
