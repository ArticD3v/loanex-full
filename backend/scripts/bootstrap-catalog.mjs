/**
 * Production catalog bootstrap:
 * - Removes demo/sample products (and orphan EMI plans via DELETE API)
 * - Ensures 6 retail categories exist
 * - Creates 6 production-ready products with full media/specs/variants
 * - Replaces home / promotional / product banners
 *
 * Usage:
 *   node scripts/bootstrap-catalog.mjs
 *   API_BASE=https://loanex-api.vercel.app node scripts/bootstrap-catalog.mjs
 */
import { randomUUID } from 'crypto';

const API_BASE = (process.env.API_BASE || 'https://loanex-api.vercel.app').replace(/\/$/, '');
const API = `${API_BASE}/api/v1`;

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const detail = JSON.stringify(json?.details || json?.message || json || text);
    throw new Error(`${method} ${path} -> ${res.status}: ${detail}`);
  }
  return json;
}

const CATEGORY_DEFS = [
  {
    name: 'Smartphone',
    description: 'Flagship and mid-range smartphones',
    icon: 'pi pi-mobile',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    sortOrder: 1,
  },
  {
    name: 'Laptop',
    description: 'Ultrabooks, gaming and creator laptops',
    icon: 'pi pi-desktop',
    color: '#10b981',
    bgColor: '#ecfdf5',
    sortOrder: 2,
  },
  {
    name: 'Smart TV',
    description: '4K and QLED smart televisions',
    icon: 'pi pi-desktop',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    sortOrder: 3,
  },
  {
    name: 'Refrigerator',
    description: 'Frost-free and inverter refrigerators',
    icon: 'pi pi-home',
    color: '#0ea5e9',
    bgColor: '#f0f9ff',
    sortOrder: 4,
  },
  {
    name: 'Washing Machine',
    description: 'Front load and top load washing machines',
    icon: 'pi pi-sync',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    sortOrder: 5,
  },
  {
    name: 'Air Conditioner',
    description: 'Inverter split air conditioners',
    icon: 'pi pi-sun',
    color: '#14b8a6',
    bgColor: '#f0fdfa',
    sortOrder: 6,
  },
];

function productPayload(def, categoryId) {
  const id = randomUUID();
  return {
    id,
    name: def.name,
    slug: def.slug,
    sku: def.sku,
    brand: def.brand,
    category: def.category,
    categoryId,
    description: def.fullDescription,
    shortDescription: def.shortDescription,
    image: def.thumbnail,
    galleryImages: def.galleryImages,
    price: def.sellingPrice,
    mrp: def.mrp,
    stock: def.stock,
    status: 'active',
    emiAvailable: true,
    featured: def.featured,
    trending: def.trending,
    recommended: def.newArrival,
    newArrival: def.newArrival,
    emiStartingFrom: def.emiStartingPrice,
    warranty: def.warranty,
    hsnCode: def.hsnCode,
    manufacturer: def.brand,
    specifications: def.specifications,
    features: def.features,
    colourSizeVariant: def.variants.map((v) => `${v.color} / ${v.storageOrSize}`).join(' | '),
    keywords: def.tags,
    wizardData: {
      productName: def.name,
      brand: def.brand,
      category: def.category,
      subCategory: def.subcategory,
      sku: def.sku,
      shortDescription: def.shortDescription,
      description: def.fullDescription,
      sellingPrice: String(def.sellingPrice),
      mrp: String(def.mrp),
      availableStock: String(def.stock),
      primaryImage: def.thumbnail,
      galleryImages: def.galleryImages,
      bannerImage: def.bannerImage,
      warranty: def.warranty,
      specifications: def.specifications,
      features: def.features,
      keywords: def.tags,
      featured: def.featured,
      trending: def.trending,
      newArrival: def.newArrival,
      emiStartingFrom: def.emiStartingPrice,
      colourSizeVariant: def.variants,
      variantsEnabled: true,
      variants: def.variants.map((v, index) => ({
        id: `${id}-var-${index + 1}`,
        name: `${v.color} ${v.storageOrSize}`,
        sku: `${def.sku}-${index + 1}`,
        color: v.color,
        storageOrSize: v.storageOrSize,
        image: v.image,
        price: v.price ?? def.sellingPrice,
        stock: v.stock ?? Math.max(5, Math.floor(def.stock / def.variants.length)),
      })),
    },
  };
}

const PRODUCTS = [
  {
    name: 'Apple iPhone 16 Pro 256GB - Black Titanium',
    slug: 'apple-iphone-16-pro-256-black-titanium',
    sku: 'APPL-IP16PRO-256-BT',
    brand: 'Apple',
    category: 'Smartphone',
    subcategory: 'Flagship Phones',
    shortDescription: 'A18 Pro chip, 48MP camera system, and titanium design with ProMotion display.',
    fullDescription:
      'iPhone 16 Pro delivers pro-grade performance with the A18 Pro chip, a durable aerospace-grade titanium design, and an advanced camera system for cinematic video and studio-quality photos. Enjoy always-on ProMotion display, USB-C, and all-day battery life — available on flexible LoanEx EMI plans.',
    sellingPrice: 119900,
    mrp: 134900,
    emiStartingPrice: 4999,
    stock: 48,
    warranty: '1 Year Apple Manufacturer Warranty',
    hsnCode: '8517',
    featured: true,
    trending: true,
    newArrival: true,
    tags: ['iphone', 'apple', '5g', 'flagship', 'emi'],
    thumbnail:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1000&q=80',
      'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=1000',
    ],
    bannerImage:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1400&q=80',
    specifications: {
      warranty: '1 Year Apple Manufacturer Warranty',
      highlights: ['A18 Pro chip', '48MP Fusion camera', 'Titanium design', 'ProMotion 120Hz'],
      keySpecs: [
        { id: 'display', icon: 'pi pi-desktop', label: 'Display', value: '6.3" Super Retina XDR' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'A18 Pro' },
        { id: 'camera', icon: 'pi pi-camera', label: 'Camera', value: '48MP + 48MP + 12MP' },
        { id: 'battery', icon: 'pi pi-bolt', label: 'Battery', value: 'Up to 27 hours video' },
      ],
      rows: [
        { label: 'Storage', value: '256GB' },
        { label: 'RAM', value: '8GB' },
        { label: 'SIM', value: 'Dual eSIM / Nano-SIM' },
        { label: 'OS', value: 'iOS 18' },
        { label: 'Charging', value: 'USB-C, MagSafe' },
      ],
      colors: [
        { id: 'black', name: 'Black Titanium', hex: '#2f2f2f' },
        { id: 'natural', name: 'Natural Titanium', hex: '#c8b8a0' },
      ],
    },
    features: [
      'Ceramic Shield front',
      'Action Button',
      'Camera Control',
      'Face ID',
      '5G connectivity',
      'IP68 water resistance',
    ],
    variants: [
      {
        color: 'Black Titanium',
        storageOrSize: '256GB',
        image:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        price: 119900,
        stock: 28,
      },
      {
        color: 'Natural Titanium',
        storageOrSize: '256GB',
        image:
          'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
        price: 119900,
        stock: 20,
      },
    ],
  },
  {
    name: 'Dell XPS 14 OLED Laptop (Intel Core Ultra 7, 16GB, 1TB)',
    slug: 'dell-xps-14-oled-ultra7-16-1tb',
    sku: 'DELL-XPS14-U7-1TB',
    brand: 'Dell',
    category: 'Laptop',
    subcategory: 'Ultrabooks',
    shortDescription: 'Stunning OLED InfinityEdge display with Intel Core Ultra AI performance.',
    fullDescription:
      'The Dell XPS 14 combines a vivid OLED InfinityEdge display with Intel Core Ultra processors for responsive multitasking, content creation, and AI-accelerated workflows. A CNC aluminum chassis, rich speakers, and long battery life make it ideal for professionals who want premium build without compromise — shop with LoanEx EMI from low monthly installments.',
    sellingPrice: 154990,
    mrp: 179990,
    emiStartingPrice: 6499,
    stock: 32,
    warranty: '1 Year Dell Premium Support Onsite Warranty',
    hsnCode: '8471',
    featured: true,
    trending: true,
    newArrival: false,
    tags: ['dell', 'xps', 'laptop', 'oled', 'ultrabook'],
    thumbnail:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80',
      'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1000',
    ],
    bannerImage:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1400&q=80',
    specifications: {
      warranty: '1 Year Dell Premium Support Onsite Warranty',
      highlights: ['14.5" OLED display', 'Intel Core Ultra 7', '16GB LPDDR5x', '1TB NVMe SSD'],
      keySpecs: [
        { id: 'display', icon: 'pi pi-desktop', label: 'Display', value: '14.5" 3.2K OLED' },
        { id: 'cpu', icon: 'pi pi-microchip', label: 'Processor', value: 'Intel Core Ultra 7' },
        { id: 'ram', icon: 'pi pi-database', label: 'Memory', value: '16GB LPDDR5x' },
        { id: 'storage', icon: 'pi pi-server', label: 'Storage', value: '1TB NVMe SSD' },
      ],
      rows: [
        { label: 'GPU', value: 'Intel Arc Graphics' },
        { label: 'OS', value: 'Windows 11 Home' },
        { label: 'Weight', value: '1.68 kg' },
        { label: 'Ports', value: '2x Thunderbolt 4, SD card' },
      ],
      colors: [
        { id: 'platinum', name: 'Platinum', hex: '#d6d3d1' },
        { id: 'graphite', name: 'Graphite', hex: '#44403c' },
      ],
    },
    features: [
      'Dolby Vision OLED',
      'Backlit keyboard',
      'Wi-Fi 6E',
      'Fingerprint reader',
      'AI noise reduction',
    ],
    variants: [
      {
        color: 'Platinum',
        storageOrSize: '16GB / 1TB',
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
        price: 154990,
        stock: 18,
      },
      {
        color: 'Graphite',
        storageOrSize: '16GB / 1TB',
        image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
        price: 154990,
        stock: 14,
      },
    ],
  },
  {
    name: 'Samsung 55" Neo QLED 4K Smart TV (QA55QN90D)',
    slug: 'samsung-55-neo-qled-4k-qn90d',
    sku: 'SAMS-QN90D-55',
    brand: 'Samsung',
    category: 'Smart TV',
    subcategory: 'QLED TVs',
    shortDescription: 'Quantum Matrix Technology with Neural Quantum Processor 4K and Object Tracking Sound.',
    fullDescription:
      'Immerse yourself in brilliant Neo QLED contrast and precise brightness control. The Samsung 55" QN90D brings sports, movies, and gaming to life with 4K upscaling, Anti Reflection, and low input lag Game Mode. Pair it with LoanEx EMI for an affordable upgrade to your living room entertainment.',
    sellingPrice: 89990,
    mrp: 129990,
    emiStartingPrice: 3749,
    stock: 24,
    warranty: '1 Year Samsung Comprehensive Warranty',
    hsnCode: '8528',
    featured: true,
    trending: false,
    newArrival: true,
    tags: ['samsung', 'smart-tv', 'qled', '4k', 'neo-qled'],
    thumbnail: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1000&q=80',
      'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1000&q=80',
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1000&q=80',
    ],
    bannerImage: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1400&q=80',
    specifications: {
      warranty: '1 Year Samsung Comprehensive Warranty',
      highlights: ['Neo Quantum HDR', '120Hz Motion Xcelerator', 'Object Tracking Sound', 'Tizen OS'],
      keySpecs: [
        { id: 'size', icon: 'pi pi-desktop', label: 'Screen', value: '55 inch 4K' },
        { id: 'panel', icon: 'pi pi-th-large', label: 'Panel', value: 'Neo QLED' },
        { id: 'hdr', icon: 'pi pi-sun', label: 'HDR', value: 'Neo Quantum HDR' },
        { id: 'os', icon: 'pi pi-android', label: 'Smart OS', value: 'Tizen' },
      ],
      rows: [
        { label: 'Refresh Rate', value: '120Hz' },
        { label: 'HDMI', value: '4x HDMI 2.1' },
        { label: 'Audio', value: '40W OTS Lite' },
        { label: 'Resolution', value: '3840 x 2160' },
      ],
      colors: [{ id: 'black', name: 'Titan Black', hex: '#111827' }],
    },
    features: ['Anti Reflection', 'Gaming Hub', 'SmartThings Hub', 'Voice Assistants', 'Apple AirPlay'],
    variants: [
      {
        color: 'Titan Black',
        storageOrSize: '55 inch',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
        price: 89990,
        stock: 14,
      },
      {
        color: 'Titan Black',
        storageOrSize: '65 inch',
        image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80',
        price: 124990,
        stock: 10,
      },
    ],
  },
  {
    name: 'LG 360 L Frost-Free Double Door Refrigerator (GL-T402EPZX)',
    slug: 'lg-360l-frost-free-double-door',
    sku: 'LG-GL-T402EPZX',
    brand: 'LG',
    category: 'Refrigerator',
    subcategory: 'Double Door',
    shortDescription: 'Smart Inverter Compressor with Door Cooling+ and hygiene fresh filtration.',
    fullDescription:
      'Keep groceries fresher for longer with LG Door Cooling+ and a Smart Inverter Compressor that adapts cooling to usage. Convertible freezer space, toughened glass shelves, and energy-efficient operation make this 360L frost-free refrigerator a dependable family appliance — available on easy LoanEx EMI.',
    sellingPrice: 42990,
    mrp: 56990,
    emiStartingPrice: 1799,
    stock: 40,
    warranty: '1 Year Comprehensive + 10 Years Compressor Warranty',
    hsnCode: '8418',
    featured: false,
    trending: true,
    newArrival: false,
    tags: ['lg', 'refrigerator', 'frost-free', 'inverter'],
    thumbnail: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=1000&q=80',
      'https://images.unsplash.com/photo-1584568694244-14fbdf83bd61?w=1000&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1000&q=80',
    ],
    bannerImage: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=1400&q=80',
    specifications: {
      warranty: '1 Year Comprehensive + 10 Years Compressor Warranty',
      highlights: ['360L capacity', 'Smart Inverter', 'Door Cooling+', 'Convertible freezer'],
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '360 Litres' },
        { id: 'type', icon: 'pi pi-home', label: 'Type', value: 'Frost Free Double Door' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy Rating', value: '2 Star' },
        { id: 'compressor', icon: 'pi pi-cog', label: 'Compressor', value: 'Smart Inverter' },
      ],
      rows: [
        { label: 'Shelves', value: 'Toughened Glass' },
        { label: 'Stabilizer', value: 'Built-in' },
        { label: 'Refrigerant', value: 'R600a' },
        { label: 'Finish', value: 'Shiny Steel' },
      ],
      colors: [
        { id: 'steel', name: 'Shiny Steel', hex: '#9ca3af' },
        { id: 'blue', name: 'Dazzle Blue', hex: '#1d4ed8' },
      ],
    },
    features: ['Hygiene Fresh+', 'Multi Air Flow', 'Moist Balance Crisper', 'Smart Diagnosis'],
    variants: [
      {
        color: 'Shiny Steel',
        storageOrSize: '360L',
        image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80',
        price: 42990,
        stock: 22,
      },
      {
        color: 'Dazzle Blue',
        storageOrSize: '360L',
        image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd61?w=800&q=80',
        price: 43990,
        stock: 18,
      },
    ],
  },
  {
    name: 'Samsung 8 kg 5 Star Front Load Washing Machine (WW80T4040CE)',
    slug: 'samsung-8kg-front-load-ww80t4040ce',
    sku: 'SAMS-WW80T4040CE',
    brand: 'Samsung',
    category: 'Washing Machine',
    subcategory: 'Front Load',
    shortDescription: 'Digital Inverter motor with ecobubble™ technology for powerful yet gentle cleans.',
    fullDescription:
      'Wash more in fewer cycles with Samsung ecobubble™ technology that dissolves detergent faster for deep cleaning even in cold water. The Digital Inverter motor runs quietly with long-lasting reliability, while AI Control and steam options help remove allergens — financed easily through LoanEx EMI.',
    sellingPrice: 36990,
    mrp: 48990,
    emiStartingPrice: 1549,
    stock: 36,
    warranty: '2 Years Comprehensive + 20 Years Motor Warranty',
    hsnCode: '8450',
    featured: false,
    trending: false,
    newArrival: true,
    tags: ['samsung', 'washing-machine', 'front-load', 'inverter'],
    thumbnail: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=1000&q=80',
      'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=1000&q=80',
      'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=1000&q=80',
    ],
    bannerImage: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=1400&q=80',
    specifications: {
      warranty: '2 Years Comprehensive + 20 Years Motor Warranty',
      highlights: ['8 kg capacity', 'ecobubble™', 'Digital Inverter', 'Steam Wash'],
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '8 kg' },
        { id: 'type', icon: 'pi pi-sync', label: 'Type', value: 'Front Load' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy Rating', value: '5 Star' },
        { id: 'motor', icon: 'pi pi-cog', label: 'Motor', value: 'Digital Inverter' },
      ],
      rows: [
        { label: 'Max Spin', value: '1400 rpm' },
        { label: 'Programs', value: '15 wash cycles' },
        { label: 'Display', value: 'LED' },
        { label: 'Child Lock', value: 'Yes' },
      ],
      colors: [{ id: 'white', name: 'White', hex: '#f8fafc' }],
    },
    features: ['AI Control', 'StayClean Drawer', 'Drum Clean', 'Delay End'],
    variants: [
      {
        color: 'White',
        storageOrSize: '8 kg',
        image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
        price: 36990,
        stock: 20,
      },
      {
        color: 'White',
        storageOrSize: '9 kg',
        image: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&q=80',
        price: 41990,
        stock: 16,
      },
    ],
  },
  {
    name: 'Daikin 1.5 Ton 5 Star Inverter Split AC (FTKM50U)',
    slug: 'daikin-1-5-ton-5star-inverter-split-ac',
    sku: 'DAIK-FTKM50U',
    brand: 'Daikin',
    category: 'Air Conditioner',
    subcategory: 'Split AC',
    shortDescription: 'High-efficiency inverter cooling with copper condenser and quiet operation.',
    fullDescription:
      'Beat the heat with Daikin’s trusted inverter technology, designed for faster cooling and lower energy bills. The 1.5 Ton FTKM50U features a durable copper condenser, PM 2.5 filter, and whisper-quiet sleep mode — a reliable comfort upgrade you can own today with LoanEx EMI plans.',
    sellingPrice: 48990,
    mrp: 64990,
    emiStartingPrice: 2049,
    stock: 28,
    warranty: '1 Year Comprehensive + 5 Years PCB + 10 Years Compressor Warranty',
    hsnCode: '8415',
    featured: true,
    trending: true,
    newArrival: true,
    tags: ['daikin', 'ac', 'inverter', 'split-ac', '1.5-ton'],
    thumbnail:
      'https://images.pexels.com/photos/5493652/pexels-photo-5493652.jpeg?auto=compress&cs=tinysrgb&w=1000',
    galleryImages: [
      'https://images.pexels.com/photos/5493652/pexels-photo-5493652.jpeg?auto=compress&cs=tinysrgb&w=1000',
      'https://images.pexels.com/photos/793765/pexels-photo-793765.jpeg?auto=compress&cs=tinysrgb&w=1000',
      'https://images.pexels.com/photos/3735631/pexels-photo-3735631.jpeg?auto=compress&cs=tinysrgb&w=1000',
    ],
    bannerImage:
      'https://images.pexels.com/photos/5493652/pexels-photo-5493652.jpeg?auto=compress&cs=tinysrgb&w=1400',
    specifications: {
      warranty: '1 Year Comprehensive + 5 Years PCB + 10 Years Compressor Warranty',
      highlights: ['1.5 Ton', '5 Star Inverter', 'Copper Condenser', 'PM 2.5 Filter'],
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-sun', label: 'Capacity', value: '1.5 Ton' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy Rating', value: '5 Star' },
        { id: 'type', icon: 'pi pi-home', label: 'Type', value: 'Inverter Split AC' },
        { id: 'condenser', icon: 'pi pi-cog', label: 'Condenser', value: '100% Copper' },
      ],
      rows: [
        { label: 'ISEER', value: '5.0+' },
        { label: 'Refrigerant', value: 'R32' },
        { label: 'Noise', value: 'As low as 26 dB' },
        { label: 'Coverage', value: 'Up to 160 sq.ft' },
      ],
      colors: [{ id: 'white', name: 'White', hex: '#f8fafc' }],
    },
    features: ['Power Chill', 'Econo Mode', 'Coanda Airflow', 'Self Diagnosis', 'Stabilizer Free Operation'],
    variants: [
      {
        color: 'White',
        storageOrSize: '1.5 Ton',
        image: 'https://images.unsplash.com/photo-1631545806609-6efe9a1f6c5c?w=800&q=80',
        price: 48990,
        stock: 16,
      },
      {
        color: 'White',
        storageOrSize: '1.0 Ton',
        image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80',
        price: 39990,
        stock: 12,
      },
    ],
  },
];

const BANNERS = [
  {
    title: 'Zero Down Payment Festive EMI Offer',
    subtitle: 'Get your dream smartphone at 0% interest with instant digital KYC',
    badgeText: 'HOT OFFER',
    imageUrl:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
    link: '/products?category=Smartphone',
    placement: 'home',
    sortOrder: 1,
  },
  {
    title: 'Laptops & Workstations On Easy EMI',
    subtitle: 'Instant approval in under 2 minutes on top laptop brands',
    badgeText: 'NEW LAUNCH',
    imageUrl:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
    link: '/products?category=Laptop',
    placement: 'home',
    sortOrder: 2,
  },
  {
    title: 'Smart Home Appliances Festival',
    subtitle: 'TVs, refrigerators, washers and ACs with flexible monthly EMIs',
    badgeText: 'APPLIANCES',
    imageUrl:
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1200&q=80',
    link: '/products?category=Smart%20TV',
    placement: 'product',
    sortOrder: 20,
  },
  {
    title: 'Exciting Offers. Bigger Benefits.',
    subtitle: 'Unlock exclusive EMI deals, festive discounts, and zero-cost plans on top brands.',
    badgeText: 'Explore Offers',
    imageUrl:
      'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=1200',
    link: '/products',
    placement: 'promotional',
    sortOrder: 10,
  },
];

async function ensureCategories() {
  const listed = await api('GET', '/categories');
  const existing = listed.data || [];
  const byName = new Map(existing.map((c) => [String(c.name).toLowerCase(), c]));
  const resolved = {};

  for (const def of CATEGORY_DEFS) {
    const key = def.name.toLowerCase();
    if (byName.has(key)) {
      resolved[def.name] = byName.get(key);
      continue;
    }
    const created = await api('POST', '/categories', def);
    resolved[def.name] = created.data;
    console.log('Created category:', def.name, created.data.id);
  }
  return resolved;
}

async function clearProducts() {
  const listed = await api('GET', '/products?limit=1000&status=all');
  const items = listed.data?.items || listed.data || [];
  for (const product of items) {
    try {
      await api('DELETE', `/products/${product.id}`);
      console.log('Deleted product:', product.id, product.name);
    } catch (err) {
      // Fallback: archive if delete not yet deployed
      console.warn('DELETE failed, archiving', product.id, err.message);
      await api('PUT', `/products/${product.id}`, {
        name: product.name,
        price: product.price ?? product.sellingPrice ?? 0,
        status: 'archived',
      });
    }
  }
}

async function clearBanners() {
  const listed = await api('GET', '/banners');
  const items = listed.data || [];
  for (const banner of items) {
    await api('DELETE', `/banners/${banner.id}`);
    console.log('Deleted banner:', banner.id, banner.title);
  }
}

async function seedProducts(categoriesByName) {
  const created = [];
  for (const def of PRODUCTS) {
    const category = categoriesByName[def.category];
    if (!category?.id) throw new Error(`Missing category for ${def.category}`);
    const payload = productPayload(def, category.id);
    const res = await api('POST', '/products', payload);
    created.push(res.data);
    console.log('Created product:', def.name, res.data.id);
  }
  return created;
}

async function seedBanners() {
  for (const banner of BANNERS) {
    const res = await api('POST', '/banners', banner);
    console.log('Created banner:', banner.placement, res.data.id);
  }
}

async function verify() {
  const products = await api('GET', '/products?limit=50');
  const banners = await api('GET', '/banners');
  const byCategory = {};
  for (const p of products.data.items || []) {
    byCategory[p.category || 'unknown'] = (byCategory[p.category || 'unknown'] || 0) + 1;
  }
  console.log('\nVerification');
  console.log('Products:', products.data.items?.length);
  console.log('By category:', byCategory);
  console.log(
    'Banners:',
    (banners.data || []).map((b) => `${b.placement}:${b.title}`),
  );

  for (const name of CATEGORY_DEFS.map((c) => c.name)) {
    const filtered = await api('GET', `/products?category=${encodeURIComponent(name)}&limit=20`);
    const count = filtered.data.items?.length || 0;
    console.log(`Category filter "${name}": ${count}`);
    if (count !== 1) {
      throw new Error(`Expected 1 product in category ${name}, got ${count}`);
    }
  }
}

async function main() {
  console.log('API:', API);
  const categories = await ensureCategories();
  await clearProducts();
  await clearBanners();
  await seedProducts(categories);
  await seedBanners();
  await verify();
  console.log('\nCatalog bootstrap complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
