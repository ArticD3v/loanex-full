import {
  BRANDS,
  CATEGORIES,
  WAREHOUSES,
  SUPPLIERS,
  DEALERS,
  WHOLESALERS,
  DELIVERY_PARTNERS,
  DELIVERY_ZONES,
} from '../../modules/products/data/constants';
import {
  BrandMaster,
  CategoryMaster,
  DealerMaster,
  DeliveryPartnerMaster,
  DeliveryZoneMaster,
  BranchMaster,
  PincodeMaster,
  SupplierMaster,
  WarehouseMaster,
  WholesalerMaster,
  createMasterId,
} from '../types/masterData';

export function seedBrands(): BrandMaster[] {
  return BRANDS.map((name) => ({
    id: createMasterId('brand'),
    name,
    status: 'active',
  }));
}

export function seedCategories(): CategoryMaster[] {
  const result: CategoryMaster[] = [];
  let order = 0;

  const pushCategory = (name: string, parentId: string | null) => {
    result.push({
      id: createMasterId('cat'),
      name,
      parentId,
      displayOrder: order++,
      status: 'active',
    });
  };

  if (Array.isArray(CATEGORIES)) {
    // Flat string list, e.g. ['Smartphone', 'Tablet', 'Laptop'] — each is a top-level category.
    for (const catName of CATEGORIES) {
      pushCategory(catName, null);
    }
    return result;
  }

  for (const [catName, subs] of Object.entries(CATEGORIES)) {
    const parentId = createMasterId('cat');
    result.push({
      id: parentId,
      name: catName,
      parentId: null,
      displayOrder: order++,
      status: 'active',
    });
    const subNames = typeof subs === 'object' && subs !== null ? Object.keys(subs) : [];
    for (const subName of subNames) {
      pushCategory(subName, parentId);
    }
  }
  return result;
}

export function seedSuppliers(): SupplierMaster[] {
  return SUPPLIERS.map((name) => ({
    id: createMasterId('supplier'),
    name,
    status: 'active',
  }));
}

export function seedDealers(): DealerMaster[] {
  return DEALERS.map((name) => ({
    id: createMasterId('dealer'),
    name,
    status: 'active',
  }));
}

export function seedWholesalers(): WholesalerMaster[] {
  return WHOLESALERS.map((name) => ({
    id: createMasterId('wholesaler'),
    name,
    status: 'active',
  }));
}

export function seedWarehouses(): WarehouseMaster[] {
  return WAREHOUSES.map((name) => ({
    id: createMasterId('warehouse'),
    name,
    status: 'active',
  }));
}

export function seedDeliveryPartners(): DeliveryPartnerMaster[] {
  return DELIVERY_PARTNERS.map((name) => ({
    id: createMasterId('partner'),
    name,
    status: 'active',
    serviceableZones: [],
  }));
}

export function seedDeliveryZones(): DeliveryZoneMaster[] {
  return DELIVERY_ZONES.map((name) => ({
    id: createMasterId('zone'),
    name,
    status: 'active',
  }));
}

export function seedBranches(): BranchMaster[] {
  return [
    {
      id: createMasterId('branch'),
      name: 'Mumbai Andheri',
      branchCode: 'MUM-AND',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchManager: 'Anil Sharma',
      mobile: '+91 98000 11111',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Mumbai Borivali',
      branchCode: 'MUM-BOR',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchManager: 'Arun Mehta',
      mobile: '+91 98000 33333',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Pune Kothrud',
      branchCode: 'PUN-KOT',
      city: 'Pune',
      state: 'Maharashtra',
      branchManager: 'Rahul Mehta',
      mobile: '+91 98000 77777',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Bengaluru Koramangala',
      branchCode: 'BLR-KOR',
      city: 'Bengaluru',
      state: 'Karnataka',
      branchManager: 'Priya Nair',
      mobile: '+91 98000 44444',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Delhi Connaught Place',
      branchCode: 'DEL-CP',
      city: 'New Delhi',
      state: 'Delhi',
      branchManager: 'Vikram Singh',
      mobile: '+91 98000 55555',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Hyderabad Banjara Hills',
      branchCode: 'HYD-BH',
      city: 'Hyderabad',
      state: 'Telangana',
      branchManager: 'Neha Kapoor',
      mobile: '+91 98000 22222',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Chennai T Nagar',
      branchCode: 'CHN-TN',
      city: 'Chennai',
      state: 'Tamil Nadu',
      branchManager: 'Sneha Iyer',
      mobile: '+91 98000 66666',
      status: 'active',
    },
    {
      id: createMasterId('branch'),
      name: 'Ahmedabad CG Road',
      branchCode: 'AMD-CG',
      city: 'Ahmedabad',
      state: 'Gujarat',
      branchManager: 'Kavita Desai',
      mobile: '+91 98000 88888',
      status: 'inactive',
    },
  ];
}

export function seedPincodes(): PincodeMaster[] {
  return [
    {
      id: createMasterId('pincode'),
      name: '400053',
      pincode: '400053',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchName: 'Mumbai Andheri',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '400069',
      pincode: '400069',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchName: 'Mumbai Andheri',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '400092',
      pincode: '400092',
      city: 'Mumbai',
      state: 'Maharashtra',
      branchName: 'Mumbai Borivali',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '411038',
      pincode: '411038',
      city: 'Pune',
      state: 'Maharashtra',
      branchName: 'Pune Kothrud',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '560034',
      pincode: '560034',
      city: 'Bengaluru',
      state: 'Karnataka',
      branchName: 'Bengaluru Koramangala',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '560001',
      pincode: '560001',
      city: 'Bengaluru',
      state: 'Karnataka',
      branchName: 'Bengaluru Koramangala',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '110001',
      pincode: '110001',
      city: 'New Delhi',
      state: 'Delhi',
      branchName: 'Delhi Connaught Place',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '500034',
      pincode: '500034',
      city: 'Hyderabad',
      state: 'Telangana',
      branchName: 'Hyderabad Banjara Hills',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '600017',
      pincode: '600017',
      city: 'Chennai',
      state: 'Tamil Nadu',
      branchName: 'Chennai T Nagar',
      status: 'active',
    },
    {
      id: createMasterId('pincode'),
      name: '380009',
      pincode: '380009',
      city: 'Ahmedabad',
      state: 'Gujarat',
      branchName: 'Ahmedabad CG Road',
      status: 'inactive',
    },
  ];
}
