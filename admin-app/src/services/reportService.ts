import api from './api';

export interface ReportCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
}

/**
 * Default report categories in case backend endpoint is not implemented
 */
const DEFAULT_REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'sales',
    title: 'Sales',
    icon: 'trending-up-outline',
    description: 'Sales report category',
  },
  {
    id: 'products',
    title: 'Products',
    icon: 'cube-outline',
    description: 'Products report category',
  },
  {
    id: 'orders',
    title: 'Orders',
    icon: 'receipt-outline',
    description: 'Orders report category',
  },
  {
    id: 'customers',
    title: 'Customers',
    icon: 'people-outline',
    description: 'Customers report category',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'layers-outline',
    description: 'Inventory report category',
  },
  {
    id: 'emi',
    title: 'EMI',
    icon: 'card-outline',
    description: 'EMI report category',
  },
];

/**
 * Get all report categories from backend or fallback
 */
export const getReportCategories = async (): Promise<ReportCategory[]> => {
  try {
    const response = await api.get('/reports/categories');
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return DEFAULT_REPORT_CATEGORIES;
  } catch (error) {
    // If backend doesn't have /reports/categories yet, return default report categories
    return DEFAULT_REPORT_CATEGORIES;
  }
};
