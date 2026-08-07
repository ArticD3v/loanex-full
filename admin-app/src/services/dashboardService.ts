import api from './api';
import { getProducts } from './productService';
import { getAllOrders } from './orderService';
import { getAllEmiApplications } from './emiService';

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalEmiApplications: number;
  pendingEmiApplications: number;
  totalRevenue: number;
  recentOrders: any[];
}

/**
 * Fetch dashboard statistics by aggregating data from multiple endpoints
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Fetch all data in parallel
    const [products, orders, emiApplications] = await Promise.allSettled([
      getProducts(),
      getAllOrders(),
      getAllEmiApplications(),
    ]);

    const productList = products.status === 'fulfilled' ? products.value : [];
    const orderList = orders.status === 'fulfilled' ? orders.value : [];
    const emiList = emiApplications.status === 'fulfilled' ? emiApplications.value : [];

    // Calculate stats
    const pendingOrders = orderList.filter(
      (o: any) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PROCESSING'
    );

    const pendingEmi = emiList.filter(
      (e: any) => e.status === 'PENDING' || e.status === 'pending'
    );

    const totalRevenue = orderList
      .filter((o: any) => o.payment_status === 'PAID')
      .reduce((sum: number, o: any) => sum + (o.totalAmount || o.total || 0), 0);

    // Get recent orders (last 10, sorted by date)
    const recentOrders = [...orderList]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalProducts: productList.length,
      totalOrders: orderList.length,
      pendingOrders: pendingOrders.length,
      totalEmiApplications: emiList.length,
      pendingEmiApplications: pendingEmi.length,
      totalRevenue,
      recentOrders,
    };
  } catch (error) {
    console.error('[Dashboard] Failed to fetch stats:', error);
    return {
      totalProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalEmiApplications: 0,
      pendingEmiApplications: 0,
      totalRevenue: 0,
      recentOrders: [],
    };
  }
};
