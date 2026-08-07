export type MasterListEntityKey =
  | 'brands'
  | 'suppliers'
  | 'dealers'
  | 'wholesalers'
  | 'warehouses'
  | 'deliveryPartners'
  | 'deliveryZones';

export type MasterEntityKey = MasterListEntityKey | 'categories';

export interface MasterEntityDef {
  id: MasterEntityKey;
  title: string;
  description: string;
  icon: string;
  /** Singular label for add/edit forms */
  entityName: string;
}

export interface MasterSection {
  title: string;
  items: MasterEntityDef[];
}

export const MASTER_SECTIONS: MasterSection[] = [
  {
    title: 'Catalog',
    items: [
      {
        id: 'brands',
        title: 'Brands',
        description: 'Product brand names',
        icon: 'pricetag-outline',
        entityName: 'Brand',
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Categories and sub categories',
        icon: 'grid-outline',
        entityName: 'Category',
      },
    ],
  },
  {
    title: 'Partners',
    items: [
      {
        id: 'suppliers',
        title: 'Suppliers',
        description: 'Product suppliers',
        icon: 'cube-outline',
        entityName: 'Supplier',
      },
      {
        id: 'dealers',
        title: 'Dealers',
        description: 'Authorized dealers',
        icon: 'storefront-outline',
        entityName: 'Dealer',
      },
      {
        id: 'wholesalers',
        title: 'Wholesalers',
        description: 'Wholesale partners',
        icon: 'business-outline',
        entityName: 'Wholesaler',
      },
      {
        id: 'deliveryPartners',
        title: 'Delivery Partners',
        description: 'Courier and logistics partners',
        icon: 'bicycle-outline',
        entityName: 'Delivery Partner',
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        id: 'warehouses',
        title: 'Warehouses',
        description: 'Storage and fulfillment locations',
        icon: 'home-outline',
        entityName: 'Warehouse',
      },
      {
        id: 'deliveryZones',
        title: 'Delivery Zones',
        description: 'Serviceable delivery areas',
        icon: 'map-outline',
        entityName: 'Delivery Zone',
      },
    ],
  },
];

export function getMasterEntity(id: MasterEntityKey): MasterEntityDef | undefined {
  for (const section of MASTER_SECTIONS) {
    const found = section.items.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}
