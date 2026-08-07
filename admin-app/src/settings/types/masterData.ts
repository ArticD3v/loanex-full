export type MasterStatus = 'active' | 'inactive';

export interface BrandMaster {
  id: string;
  name: string;
  logoUri?: string;
  description?: string;
  status: MasterStatus;
}

export interface CategoryMaster {
  id: string;
  name: string;
  /** null = top-level category */
  parentId: string | null;
  imageUri?: string;
  displayOrder?: number;
  status: MasterStatus;
}

export interface SupplierMaster {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  status: MasterStatus;
}

export interface DealerMaster {
  id: string;
  dealerCode?: string;
  dealerName?: string;
  mobile?: string;
  email?: string;
  status: MasterStatus;
  name?: string; // Keep this optional so generic components using .name don't break immediately
}

export interface WholesalerMaster {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  status: MasterStatus;
}

export interface WarehouseMaster {
  id: string;
  name: string;
  location?: string;
  status: MasterStatus;
}

export interface DeliveryPartnerMaster {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  /** Names of linked Delivery Zone masters */
  serviceableZones?: string[];
  deliverySlaDays?: number;
  status: MasterStatus;
}

export interface DeliveryZoneMaster {
  id: string;
  name: string;
  pinCodes?: string;
  standardDeliveryDays?: string;
  status: MasterStatus;
}

export interface BranchMaster {
  id: string;
  /** Branch Name */
  name: string;
  branchCode: string;
  city: string;
  state: string;
  branchManager: string;
  mobile: string;
  status: MasterStatus;
}

export interface PincodeMaster {
  id: string;
  /** Display / unique key — same as pincode value */
  name: string;
  pincode: string;
  city: string;
  state: string;
  /** Branch Name from Branch Master */
  branchName: string;
  status: MasterStatus;
}

/** Nested map used by the product wizard: Category → SubCategory → [] */
export type CategoryTree = Record<string, Record<string, string[]>>;

export function createMasterId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isActiveStatus(status: MasterStatus): boolean {
  return status === 'active';
}
