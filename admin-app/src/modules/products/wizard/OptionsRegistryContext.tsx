/**
 * Wizard-facing adapter over MasterDataContext.
 * Exposes active display names + name-based CRUD so ManageableDropdown keeps working.
 */
import { useMemo, type ReactNode } from 'react';
import { useMasterData, activeNames } from '../../../settings/context/MasterDataContext';
import type { CategoryTree } from '../../../settings/types/masterData';

export type { CategoryTree };

export interface OptionsRegistryContextType {
  brands: string[];
  warehouses: string[];
  dealers: string[];
  wholesalers: string[];
  suppliers: string[];
  deliveryPartners: string[];
  deliveryZones: string[];
  categories: CategoryTree;

  addBrand: (name: string) => boolean;
  renameBrand: (from: string, to: string) => boolean;
  deleteBrand: (name: string) => void;

  addWarehouse: (name: string) => boolean;
  renameWarehouse: (from: string, to: string) => boolean;
  deleteWarehouse: (name: string) => void;

  addDealer: (name: string) => boolean;
  renameDealer: (from: string, to: string) => boolean;
  deleteDealer: (name: string) => void;

  addWholesaler: (name: string) => boolean;
  renameWholesaler: (from: string, to: string) => boolean;
  deleteWholesaler: (name: string) => void;

  addSupplier: (name: string) => boolean;
  renameSupplier: (from: string, to: string) => boolean;
  deleteSupplier: (name: string) => void;
  findSupplierByName: ReturnType<typeof useMasterData>['findSupplierByName'];
  findDealerByName: ReturnType<typeof useMasterData>['findDealerByName'];

  addDeliveryPartner: (name: string) => boolean;
  renameDeliveryPartner: (from: string, to: string) => boolean;
  deleteDeliveryPartner: (name: string) => void;

  addDeliveryZone: (name: string) => boolean;
  renameDeliveryZone: (from: string, to: string) => boolean;
  deleteDeliveryZone: (name: string) => void;

  addCategory: (name: string) => boolean;
  renameCategory: (from: string, to: string) => boolean;
  deleteCategory: (name: string) => void;

  addSubCategory: (category: string, name: string) => boolean;
  renameSubCategory: (category: string, from: string, to: string) => boolean;
  deleteSubCategory: (category: string, name: string) => void;
}

export function useOptionsRegistry(): OptionsRegistryContextType {
  const master = useMasterData();

  return useMemo(
    () => ({
      brands: activeNames(master.brands),
      warehouses: activeNames(master.warehouses),
      dealers: activeNames(master.dealers),
      wholesalers: activeNames(master.wholesalers),
      suppliers: activeNames(master.suppliers),
      deliveryPartners: activeNames(master.deliveryPartners),
      deliveryZones: activeNames(master.deliveryZones),
      categories: master.categoryTree,

      addBrand: master.addBrand,
      renameBrand: master.renameBrand,
      deleteBrand: master.deleteBrandByName,

      addWarehouse: master.addWarehouse,
      renameWarehouse: master.renameWarehouse,
      deleteWarehouse: master.deleteWarehouseByName,

      addDealer: master.addDealer,
      renameDealer: master.renameDealer,
      deleteDealer: master.deleteDealerByName,

      addWholesaler: master.addWholesaler,
      renameWholesaler: master.renameWholesaler,
      deleteWholesaler: master.deleteWholesalerByName,

      addSupplier: master.addSupplier,
      renameSupplier: master.renameSupplier,
      deleteSupplier: master.deleteSupplierByName,
      findSupplierByName: master.findSupplierByName,
      findDealerByName: master.findDealerByName,

      addDeliveryPartner: master.addDeliveryPartner,
      renameDeliveryPartner: master.renameDeliveryPartner,
      deleteDeliveryPartner: master.deleteDeliveryPartnerByName,

      addDeliveryZone: master.addDeliveryZone,
      renameDeliveryZone: master.renameDeliveryZone,
      deleteDeliveryZone: master.deleteDeliveryZoneByName,

      addCategory: master.addCategory,
      renameCategory: master.renameCategory,
      deleteCategory: master.deleteCategoryByName,

      addSubCategory: master.addSubCategory,
      renameSubCategory: master.renameSubCategory,
      deleteSubCategory: master.deleteSubCategory,
    }),
    [master],
  );
}

/** No-op: MasterDataProvider is mounted at the app root. */
export function OptionsRegistryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
