import { Router } from 'express';
import { sendSuccess } from '../../common/utils/api-response';

/**
 * Report category labels for the admin reporting UI.
 *
 * Intentionally PUBLIC: returns only static, non-sensitive category metadata
 * (id/title/icon/description). No report rows, PII, or financial aggregates.
 * Consumed by admin-app `reportService.getReportCategories()` with a local
 * DEFAULT fallback if the request fails.
 *
 * Do not put protected report payloads on this route — keep those behind
 * authenticate + requirePermission('reports.view').
 */
export const reportsRouter = Router();

reportsRouter.get('/categories', (_req, res) => {
  return sendSuccess(
    res,
    [
      { id: 'sales', title: 'Sales', icon: 'trending-up-outline', description: 'Sales report category' },
      { id: 'products', title: 'Products', icon: 'cube-outline', description: 'Products report category' },
      { id: 'orders', title: 'Orders', icon: 'receipt-outline', description: 'Orders report category' },
      { id: 'customers', title: 'Customers', icon: 'people-outline', description: 'Customers report category' },
      { id: 'inventory', title: 'Inventory', icon: 'layers-outline', description: 'Inventory report category' },
      { id: 'emi', title: 'EMI', icon: 'card-outline', description: 'EMI report category' },
    ],
    'Report categories fetched',
  );
});
