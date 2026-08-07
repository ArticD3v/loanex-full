export type VariantSeed = {
  id: string;
  productId: string;
  sku: string;
  variantName: string;
  price: number;
  discountPrice: number;
  stock: number;
  images: string[];
  specifications: {
    keySpecs?: Array<{ id: string; icon: string; label: string; value: string }>;
    rows?: Array<{ label: string; value: string }>;
  };
  attributes: Record<string, string>;
  isDefault: boolean;
};

const iphoneImages = {
  black: [
    'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80',
    'https://images.unsplash.com/photo-1696446702183-cbd5a1a4c1ee?w=800&q=80',
  ],
  blue: [
    'https://images.unsplash.com/photo-1592286927505-235040e5428c?w=800&q=80',
    'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80',
  ],
  pink: [
    'https://images.unsplash.com/photo-1696446702183-cbd5a1a4c1ee?w=800&q=80',
    'https://images.unsplash.com/photo-1592286927505-235040e5428c?w=800&q=80',
  ],
};

const laptopImages = {
  silver: [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
  ],
  black: [
    'https://images.unsplash.com/photo-1525547711957-196d8be0c4a7?w=800&q=80',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
  ],
};

const fridgeImages = {
  silver: [
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&q=80',
    'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd1?w=800&q=80',
  ],
  blue: [
    'https://images.unsplash.com/photo-1622495613794-24a8a8ddea0a?w=800&q=80',
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&q=80',
  ],
};

export const productVariants: VariantSeed[] = [
  // iPhone 15 — color + storage
  {
    id: 'var-iphone15-black-128',
    productId: 'smartphone-iphone-15',
    sku: 'APL-IP15-128-BLK',
    variantName: 'Black / 128GB',
    price: 79900,
    discountPrice: 68900,
    stock: 8,
    images: iphoneImages.black,
    attributes: { color: 'Black', colorHex: '#111111', storage: '128GB' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'display', icon: 'pi pi-mobile', label: 'Display', value: '6.1" Super Retina XDR' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'A16 Bionic' },
        { id: 'camera', icon: 'pi pi-camera', label: 'Camera', value: '48MP Main' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '128 GB' },
      ],
      rows: [
        { label: 'Display', value: '6.1-inch Super Retina XDR OLED' },
        { label: 'Processor', value: 'Apple A16 Bionic' },
        { label: 'Storage', value: '128 GB' },
        { label: 'Color', value: 'Black' },
        { label: 'Battery', value: 'Up to 20 hours video playback' },
        { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3, USB-C' },
      ],
    },
  },
  {
    id: 'var-iphone15-blue-128',
    productId: 'smartphone-iphone-15',
    sku: 'APL-IP15-128-BLU',
    variantName: 'Blue / 128GB',
    price: 79900,
    discountPrice: 68900,
    stock: 5,
    images: iphoneImages.blue,
    attributes: { color: 'Blue', colorHex: '#3b5998', storage: '128GB' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'display', icon: 'pi pi-mobile', label: 'Display', value: '6.1" Super Retina XDR' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'A16 Bionic' },
        { id: 'camera', icon: 'pi pi-camera', label: 'Camera', value: '48MP Main' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '128 GB' },
      ],
      rows: [
        { label: 'Display', value: '6.1-inch Super Retina XDR OLED' },
        { label: 'Processor', value: 'Apple A16 Bionic' },
        { label: 'Storage', value: '128 GB' },
        { label: 'Color', value: 'Blue' },
        { label: 'Battery', value: 'Up to 20 hours video playback' },
        { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3, USB-C' },
      ],
    },
  },
  {
    id: 'var-iphone15-pink-256',
    productId: 'smartphone-iphone-15',
    sku: 'APL-IP15-256-PNK',
    variantName: 'Pink / 256GB',
    price: 89900,
    discountPrice: 79900,
    stock: 4,
    images: iphoneImages.pink,
    attributes: { color: 'Pink', colorHex: '#f4c2c2', storage: '256GB' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'display', icon: 'pi pi-mobile', label: 'Display', value: '6.1" Super Retina XDR' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'A16 Bionic' },
        { id: 'camera', icon: 'pi pi-camera', label: 'Camera', value: '48MP Main' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '256 GB' },
      ],
      rows: [
        { label: 'Display', value: '6.1-inch Super Retina XDR OLED' },
        { label: 'Processor', value: 'Apple A16 Bionic' },
        { label: 'Storage', value: '256 GB' },
        { label: 'Color', value: 'Pink' },
        { label: 'Battery', value: 'Up to 20 hours video playback' },
        { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3, USB-C' },
      ],
    },
  },
  {
    id: 'var-iphone15-black-512',
    productId: 'smartphone-iphone-15',
    sku: 'APL-IP15-512-BLK',
    variantName: 'Black / 512GB',
    price: 109900,
    discountPrice: 99900,
    stock: 0,
    images: iphoneImages.black,
    attributes: { color: 'Black', colorHex: '#111111', storage: '512GB' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'display', icon: 'pi pi-mobile', label: 'Display', value: '6.1" Super Retina XDR' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'A16 Bionic' },
        { id: 'camera', icon: 'pi pi-camera', label: 'Camera', value: '48MP Main' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '512 GB' },
      ],
      rows: [
        { label: 'Display', value: '6.1-inch Super Retina XDR OLED' },
        { label: 'Processor', value: 'Apple A16 Bionic' },
        { label: 'Storage', value: '512 GB' },
        { label: 'Color', value: 'Black' },
        { label: 'Battery', value: 'Up to 20 hours video playback' },
        { label: 'Connectivity', value: '5G, Wi-Fi 6, Bluetooth 5.3, USB-C' },
      ],
    },
  },

  // HP Laptop — RAM + SSD + color
  {
    id: 'var-hp-pav-8-256-silver',
    productId: 'laptop-hp-pavilion-15',
    sku: 'HP-PAV15-8-256-SLV',
    variantName: '8GB / 256GB / Natural Silver',
    price: 52990,
    discountPrice: 46990,
    stock: 10,
    images: laptopImages.silver,
    attributes: { ram: '8GB', ssd: '256GB', color: 'Natural Silver', colorHex: '#c0c0c0' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'cpu', icon: 'pi pi-microchip', label: 'Processor', value: 'Intel Core i5' },
        { id: 'ram', icon: 'pi pi-microchip', label: 'RAM', value: '8 GB' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '256 GB SSD' },
        { id: 'display', icon: 'pi pi-desktop', label: 'Display', value: '15.6" FHD' },
      ],
      rows: [
        { label: 'Processor', value: 'Intel Core i5-1335U (13th Gen)' },
        { label: 'Memory', value: '8GB DDR4-3200MHz' },
        { label: 'Storage', value: '256GB PCIe NVMe SSD' },
        { label: 'Color', value: 'Natural Silver' },
        { label: 'Display', value: '15.6" FHD (1920 x 1080) IPS' },
        { label: 'Battery', value: 'Up to 8 hours' },
      ],
    },
  },
  {
    id: 'var-hp-pav-16-512-silver',
    productId: 'laptop-hp-pavilion-15',
    sku: 'HP-PAV15-16-512-SLV',
    variantName: '16GB / 512GB / Natural Silver',
    price: 62990,
    discountPrice: 54990,
    stock: 15,
    images: laptopImages.silver,
    attributes: { ram: '16GB', ssd: '512GB', color: 'Natural Silver', colorHex: '#c0c0c0' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'cpu', icon: 'pi pi-microchip', label: 'Processor', value: 'Intel Core i5' },
        { id: 'ram', icon: 'pi pi-microchip', label: 'RAM', value: '16 GB' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '512 GB SSD' },
        { id: 'display', icon: 'pi pi-desktop', label: 'Display', value: '15.6" FHD' },
      ],
      rows: [
        { label: 'Processor', value: 'Intel Core i5-1335U (13th Gen)' },
        { label: 'Memory', value: '16GB DDR4-3200MHz' },
        { label: 'Storage', value: '512GB PCIe NVMe SSD' },
        { label: 'Color', value: 'Natural Silver' },
        { label: 'Display', value: '15.6" FHD (1920 x 1080) IPS' },
        { label: 'Battery', value: 'Up to 8 hours' },
      ],
    },
  },
  {
    id: 'var-hp-pav-16-512-black',
    productId: 'laptop-hp-pavilion-15',
    sku: 'HP-PAV15-16-512-BLK',
    variantName: '16GB / 512GB / Jet Black',
    price: 63990,
    discountPrice: 55990,
    stock: 7,
    images: laptopImages.black,
    attributes: { ram: '16GB', ssd: '512GB', color: 'Jet Black', colorHex: '#1a1a1a' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'cpu', icon: 'pi pi-microchip', label: 'Processor', value: 'Intel Core i5' },
        { id: 'ram', icon: 'pi pi-microchip', label: 'RAM', value: '16 GB' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '512 GB SSD' },
        { id: 'display', icon: 'pi pi-desktop', label: 'Display', value: '15.6" FHD' },
      ],
      rows: [
        { label: 'Processor', value: 'Intel Core i5-1335U (13th Gen)' },
        { label: 'Memory', value: '16GB DDR4-3200MHz' },
        { label: 'Storage', value: '512GB PCIe NVMe SSD' },
        { label: 'Color', value: 'Jet Black' },
        { label: 'Display', value: '15.6" FHD (1920 x 1080) IPS' },
        { label: 'Battery', value: 'Up to 8 hours' },
      ],
    },
  },

  // Samsung TV — screen size
  {
    id: 'var-samsung-tv-43',
    productId: 'smart-tv-samsung-55',
    sku: 'SAM-TV43-4K',
    variantName: '43 inch 4K',
    price: 42990,
    discountPrice: 34990,
    stock: 6,
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
      'https://images.unsplash.com/photo-1571410500605-55b6d5245b8c?w=800&q=80',
    ],
    attributes: { 'screen size': '43 inch' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'size', icon: 'pi pi-desktop', label: 'Screen', value: '43"' },
        { id: 'resolution', icon: 'pi pi-eye', label: 'Resolution', value: '4K UHD' },
        { id: 'hdr', icon: 'pi pi-sun', label: 'HDR', value: 'HDR10+' },
        { id: 'os', icon: 'pi pi-cog', label: 'OS', value: 'Tizen Smart TV' },
      ],
      rows: [
        { label: 'Screen Size', value: '43 inches' },
        { label: 'Resolution', value: '3840 x 2160 (4K UHD)' },
        { label: 'Refresh Rate', value: '60Hz' },
        { label: 'Smart Features', value: 'Voice Assistant, Screen Mirroring' },
        { label: 'Audio', value: '20W Dolby Digital Plus' },
        { label: 'Connectivity', value: 'Wi-Fi, Bluetooth, 3x HDMI, 1x USB' },
      ],
    },
  },
  {
    id: 'var-samsung-tv-55',
    productId: 'smart-tv-samsung-55',
    sku: 'SAM-TV55-4K',
    variantName: '55 inch 4K',
    price: 54990,
    discountPrice: 42990,
    stock: 12,
    images: [
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
      'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&q=80',
    ],
    attributes: { 'screen size': '55 inch' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'size', icon: 'pi pi-desktop', label: 'Screen', value: '55"' },
        { id: 'resolution', icon: 'pi pi-eye', label: 'Resolution', value: '4K UHD' },
        { id: 'hdr', icon: 'pi pi-sun', label: 'HDR', value: 'HDR10+' },
        { id: 'os', icon: 'pi pi-cog', label: 'OS', value: 'Tizen Smart TV' },
      ],
      rows: [
        { label: 'Screen Size', value: '55 inches' },
        { label: 'Resolution', value: '3840 x 2160 (4K UHD)' },
        { label: 'Refresh Rate', value: '60Hz' },
        { label: 'Smart Features', value: 'Voice Assistant, Screen Mirroring' },
        { label: 'Audio', value: '20W Dolby Digital Plus' },
        { label: 'Connectivity', value: 'Wi-Fi, Bluetooth, 3x HDMI, 1x USB' },
      ],
    },
  },
  {
    id: 'var-samsung-tv-65',
    productId: 'smart-tv-samsung-55',
    sku: 'SAM-TV65-4K',
    variantName: '65 inch 4K',
    price: 74990,
    discountPrice: 62990,
    stock: 3,
    images: [
      'https://images.unsplash.com/photo-1571410500605-55b6d5245b8c?w=800&q=80',
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    ],
    attributes: { 'screen size': '65 inch' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'size', icon: 'pi pi-desktop', label: 'Screen', value: '65"' },
        { id: 'resolution', icon: 'pi pi-eye', label: 'Resolution', value: '4K UHD' },
        { id: 'hdr', icon: 'pi pi-sun', label: 'HDR', value: 'HDR10+' },
        { id: 'os', icon: 'pi pi-cog', label: 'OS', value: 'Tizen Smart TV' },
      ],
      rows: [
        { label: 'Screen Size', value: '65 inches' },
        { label: 'Resolution', value: '3840 x 2160 (4K UHD)' },
        { label: 'Refresh Rate', value: '60Hz' },
        { label: 'Smart Features', value: 'Voice Assistant, Screen Mirroring' },
        { label: 'Audio', value: '20W Dolby Digital Plus' },
        { label: 'Connectivity', value: 'Wi-Fi, Bluetooth, 3x HDMI, 1x USB' },
      ],
    },
  },

  // LG Refrigerator — capacity + color
  {
    id: 'var-lg-fridge-260-silver',
    productId: 'refrigerator-lg-260',
    sku: 'LG-FR260-SIL',
    variantName: '260L / Dazzle Steel',
    price: 34990,
    discountPrice: 28990,
    stock: 6,
    images: fridgeImages.silver,
    attributes: { capacity: '260L', color: 'Dazzle Steel', colorHex: '#b8b8b8' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '260 L' },
        { id: 'type', icon: 'pi pi-sitemap', label: 'Type', value: 'Double Door' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '3 Star' },
        { id: 'cooling', icon: 'pi pi-snowflake', label: 'Cooling', value: 'Frost Free' },
      ],
      rows: [
        { label: 'Capacity', value: '260 Litres' },
        { label: 'Energy Rating', value: '3 Star' },
        { label: 'Weight', value: '52 kg' },
        { label: 'Type', value: 'Frost Free Double Door' },
        { label: 'Color', value: 'Dazzle Steel' },
        { label: 'Compressor', value: 'Smart Inverter' },
      ],
    },
  },
  {
    id: 'var-lg-fridge-260-blue',
    productId: 'refrigerator-lg-260',
    sku: 'LG-FR260-BLU',
    variantName: '260L / Blue Charm',
    price: 35490,
    discountPrice: 29490,
    stock: 4,
    images: fridgeImages.blue,
    attributes: { capacity: '260L', color: 'Blue Charm', colorHex: '#4a6fa5' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '260 L' },
        { id: 'type', icon: 'pi pi-sitemap', label: 'Type', value: 'Double Door' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '3 Star' },
        { id: 'cooling', icon: 'pi pi-snowflake', label: 'Cooling', value: 'Frost Free' },
      ],
      rows: [
        { label: 'Capacity', value: '260 Litres' },
        { label: 'Energy Rating', value: '3 Star' },
        { label: 'Weight', value: '52 kg' },
        { label: 'Type', value: 'Frost Free Double Door' },
        { label: 'Color', value: 'Blue Charm' },
        { label: 'Compressor', value: 'Smart Inverter' },
      ],
    },
  },
  {
    id: 'var-lg-fridge-320-silver',
    productId: 'refrigerator-lg-260',
    sku: 'LG-FR320-SIL',
    variantName: '320L / Dazzle Steel',
    price: 42990,
    discountPrice: 36990,
    stock: 5,
    images: fridgeImages.silver,
    attributes: { capacity: '320L', color: 'Dazzle Steel', colorHex: '#b8b8b8' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '320 L' },
        { id: 'type', icon: 'pi pi-sitemap', label: 'Type', value: 'Double Door' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '5 Star' },
        { id: 'cooling', icon: 'pi pi-snowflake', label: 'Cooling', value: 'Frost Free' },
      ],
      rows: [
        { label: 'Capacity', value: '320 Litres' },
        { label: 'Energy Rating', value: '5 Star' },
        { label: 'Weight', value: '58 kg' },
        { label: 'Type', value: 'Frost Free Double Door' },
        { label: 'Color', value: 'Dazzle Steel' },
        { label: 'Compressor', value: 'Smart Inverter' },
      ],
    },
  },
  {
    id: 'var-lg-fridge-320-blue',
    productId: 'refrigerator-lg-260',
    sku: 'LG-FR320-BLU',
    variantName: '320L / Blue Charm',
    price: 43490,
    discountPrice: 37490,
    stock: 0,
    images: fridgeImages.blue,
    attributes: { capacity: '320L', color: 'Blue Charm', colorHex: '#4a6fa5' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '320 L' },
        { id: 'type', icon: 'pi pi-sitemap', label: 'Type', value: 'Double Door' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '5 Star' },
        { id: 'cooling', icon: 'pi pi-snowflake', label: 'Cooling', value: 'Frost Free' },
      ],
      rows: [
        { label: 'Capacity', value: '320 Litres' },
        { label: 'Energy Rating', value: '5 Star' },
        { label: 'Weight', value: '58 kg' },
        { label: 'Type', value: 'Frost Free Double Door' },
        { label: 'Color', value: 'Blue Charm' },
        { label: 'Compressor', value: 'Smart Inverter' },
      ],
    },
  },

  // Bosch washer — capacity + color
  {
    id: 'var-bosch-wm-7-white',
    productId: 'washing-machine-bosch-7kg',
    sku: 'BSH-WM7-WHT',
    variantName: '7 Kg / White',
    price: 41990,
    discountPrice: 34990,
    stock: 8,
    images: [
      'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
      'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&q=80',
    ],
    attributes: { capacity: '7 Kg', color: 'White', colorHex: '#f5f5f5' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '7 Kg' },
        { id: 'type', icon: 'pi pi-sync', label: 'Type', value: 'Front Load' },
        { id: 'rpm', icon: 'pi pi-replay', label: 'Spin', value: '1200 RPM' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '5 Star' },
      ],
      rows: [
        { label: 'Capacity', value: '7 kg' },
        { label: 'Type', value: 'Fully Automatic Front Load' },
        { label: 'Max Spin Speed', value: '1200 RPM' },
        { label: 'Energy Rating', value: '5 Star' },
        { label: 'Color', value: 'White' },
        { label: 'Wash Programs', value: '15' },
      ],
    },
  },
  {
    id: 'var-bosch-wm-9-white',
    productId: 'washing-machine-bosch-7kg',
    sku: 'BSH-WM9-WHT',
    variantName: '9 Kg / White',
    price: 48990,
    discountPrice: 41990,
    stock: 4,
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
      'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
    ],
    attributes: { capacity: '9 Kg', color: 'White', colorHex: '#f5f5f5' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'capacity', icon: 'pi pi-box', label: 'Capacity', value: '9 Kg' },
        { id: 'type', icon: 'pi pi-sync', label: 'Type', value: 'Front Load' },
        { id: 'rpm', icon: 'pi pi-replay', label: 'Spin', value: '1400 RPM' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '5 Star' },
      ],
      rows: [
        { label: 'Capacity', value: '9 kg' },
        { label: 'Type', value: 'Fully Automatic Front Load' },
        { label: 'Max Spin Speed', value: '1400 RPM' },
        { label: 'Energy Rating', value: '5 Star' },
        { label: 'Color', value: 'White' },
        { label: 'Wash Programs', value: '15' },
      ],
    },
  },

  // Voltas AC — tonnage
  {
    id: 'var-voltas-1ton',
    productId: 'ac-voltas-1-5ton',
    sku: 'VLT-AC10-3S',
    variantName: '1 Ton',
    price: 32990,
    discountPrice: 27990,
    stock: 9,
    images: [
      'https://images.unsplash.com/photo-1631545806606-867b4070886a?w=800&q=80',
      'https://images.unsplash.com/photo-1585771724684-38269f663238?w=800&q=80',
    ],
    attributes: { tonnage: '1 Ton' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'tonnage', icon: 'pi pi-snowflake', label: 'Tonnage', value: '1 Ton' },
        { id: 'type', icon: 'pi pi-th-large', label: 'Type', value: 'Split AC' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '3 Star' },
        { id: 'cooling', icon: 'pi pi-sun', label: 'Cooling', value: 'High Ambient' },
      ],
      rows: [
        { label: 'Capacity', value: '1 Ton' },
        { label: 'Type', value: 'Split Air Conditioner' },
        { label: 'Energy Rating', value: '3 Star' },
        { label: 'Condenser', value: '100% Copper' },
        { label: 'Refrigerant', value: 'R-32' },
        { label: 'Coverage Area', value: 'Up to 100 sq. ft.' },
      ],
    },
  },
  {
    id: 'var-voltas-1-5ton',
    productId: 'ac-voltas-1-5ton',
    sku: 'VLT-AC15-3S',
    variantName: '1.5 Ton',
    price: 38990,
    discountPrice: 32990,
    stock: 15,
    images: [
      'https://images.unsplash.com/photo-1631545806606-867b4070886a?w=800&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eeaa1cd?w=800&q=80',
    ],
    attributes: { tonnage: '1.5 Ton' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'tonnage', icon: 'pi pi-snowflake', label: 'Tonnage', value: '1.5 Ton' },
        { id: 'type', icon: 'pi pi-th-large', label: 'Type', value: 'Split AC' },
        { id: 'energy', icon: 'pi pi-bolt', label: 'Energy', value: '3 Star' },
        { id: 'cooling', icon: 'pi pi-sun', label: 'Cooling', value: 'High Ambient' },
      ],
      rows: [
        { label: 'Capacity', value: '1.5 Ton' },
        { label: 'Type', value: 'Split Air Conditioner' },
        { label: 'Energy Rating', value: '3 Star' },
        { label: 'Condenser', value: '100% Copper' },
        { label: 'Refrigerant', value: 'R-32' },
        { label: 'Coverage Area', value: 'Up to 150 sq. ft.' },
      ],
    },
  },

  // Tab S9 — storage + color
  {
    id: 'var-tabs9-128-graphite',
    productId: 'tablet-samsung-s9',
    sku: 'SAM-TABS9-128-GRP',
    variantName: '128GB / Graphite',
    price: 72999,
    discountPrice: 64999,
    stock: 8,
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&q=80',
    ],
    attributes: { storage: '128GB', color: 'Graphite', colorHex: '#3d3d3d' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'display', icon: 'pi pi-tablet', label: 'Display', value: '11" AMOLED' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'Snapdragon 8 Gen 2' },
        { id: 'ram', icon: 'pi pi-microchip', label: 'RAM', value: '8 GB' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '128 GB' },
      ],
      rows: [
        { label: 'Display', value: '11-inch Dynamic AMOLED 2X, 120Hz' },
        { label: 'Memory', value: '8GB RAM + 128GB Storage' },
        { label: 'Color', value: 'Graphite' },
        { label: 'Battery', value: '8400 mAh' },
        { label: 'S Pen', value: 'Included' },
        { label: 'Durability', value: 'IP68 rated' },
      ],
    },
  },
  {
    id: 'var-tabs9-256-beige',
    productId: 'tablet-samsung-s9',
    sku: 'SAM-TABS9-256-BGE',
    variantName: '256GB / Beige',
    price: 82999,
    discountPrice: 74999,
    stock: 5,
    images: [
      'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&q=80',
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
    ],
    attributes: { storage: '256GB', color: 'Beige', colorHex: '#d4c4a8' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'display', icon: 'pi pi-tablet', label: 'Display', value: '11" AMOLED' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'Snapdragon 8 Gen 2' },
        { id: 'ram', icon: 'pi pi-microchip', label: 'RAM', value: '8 GB' },
        { id: 'storage', icon: 'pi pi-database', label: 'Storage', value: '256 GB' },
      ],
      rows: [
        { label: 'Display', value: '11-inch Dynamic AMOLED 2X, 120Hz' },
        { label: 'Memory', value: '8GB RAM + 256GB Storage' },
        { label: 'Color', value: 'Beige' },
        { label: 'Battery', value: '8400 mAh' },
        { label: 'S Pen', value: 'Included' },
        { label: 'Durability', value: 'IP68 rated' },
      ],
    },
  },

  // Apple Watch — size + color
  {
    id: 'var-aws9-41-midnight',
    productId: 'smartwatch-apple-series-9',
    sku: 'APL-AWS9-41-MID',
    variantName: '41mm / Midnight',
    price: 41900,
    discountPrice: 37900,
    stock: 10,
    images: [
      'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80',
    ],
    attributes: { size: '41mm', color: 'Midnight', colorHex: '#1d1d1f' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'size', icon: 'pi pi-clock', label: 'Case', value: '41 mm' },
        { id: 'display', icon: 'pi pi-eye', label: 'Display', value: 'Always-On Retina' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'S9 SiP' },
        { id: 'water', icon: 'pi pi-shield', label: 'Water', value: '50m WR' },
      ],
      rows: [
        { label: 'Case Size', value: '41mm' },
        { label: 'Color', value: 'Midnight' },
        { label: 'Display', value: 'Always-On Retina LTPO OLED' },
        { label: 'Chip', value: 'S9 SiP with 4-core Neural Engine' },
        { label: 'Battery', value: 'Up to 18 hours' },
        { label: 'Water Resistance', value: '50 metres' },
      ],
    },
  },
  {
    id: 'var-aws9-45-midnight',
    productId: 'smartwatch-apple-series-9',
    sku: 'APL-AWS9-45-MID',
    variantName: '45mm / Midnight',
    price: 44900,
    discountPrice: 39900,
    stock: 12,
    images: [
      'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    ],
    attributes: { size: '45mm', color: 'Midnight', colorHex: '#1d1d1f' },
    isDefault: true,
    specifications: {
      keySpecs: [
        { id: 'size', icon: 'pi pi-clock', label: 'Case', value: '45 mm' },
        { id: 'display', icon: 'pi pi-eye', label: 'Display', value: 'Always-On Retina' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'S9 SiP' },
        { id: 'water', icon: 'pi pi-shield', label: 'Water', value: '50m WR' },
      ],
      rows: [
        { label: 'Case Size', value: '45mm' },
        { label: 'Color', value: 'Midnight' },
        { label: 'Display', value: 'Always-On Retina LTPO OLED' },
        { label: 'Chip', value: 'S9 SiP with 4-core Neural Engine' },
        { label: 'Battery', value: 'Up to 18 hours' },
        { label: 'Water Resistance', value: '50 metres' },
      ],
    },
  },
  {
    id: 'var-aws9-45-starlight',
    productId: 'smartwatch-apple-series-9',
    sku: 'APL-AWS9-45-STR',
    variantName: '45mm / Starlight',
    price: 44900,
    discountPrice: 39900,
    stock: 8,
    images: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    ],
    attributes: { size: '45mm', color: 'Starlight', colorHex: '#f5f5dc' },
    isDefault: false,
    specifications: {
      keySpecs: [
        { id: 'size', icon: 'pi pi-clock', label: 'Case', value: '45 mm' },
        { id: 'display', icon: 'pi pi-eye', label: 'Display', value: 'Always-On Retina' },
        { id: 'chip', icon: 'pi pi-microchip', label: 'Chip', value: 'S9 SiP' },
        { id: 'water', icon: 'pi pi-shield', label: 'Water', value: '50m WR' },
      ],
      rows: [
        { label: 'Case Size', value: '45mm' },
        { label: 'Color', value: 'Starlight' },
        { label: 'Display', value: 'Always-On Retina LTPO OLED' },
        { label: 'Chip', value: 'S9 SiP with 4-core Neural Engine' },
        { label: 'Battery', value: 'Up to 18 hours' },
        { label: 'Water Resistance', value: '50 metres' },
      ],
    },
  },
];
