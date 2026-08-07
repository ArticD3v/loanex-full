import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Order } from '../types';
import * as orderService from '../services/orderService';
import { useAuth } from '../hooks/useAuth';

interface OrderContextType {
  orders: Order[];
  userOrders: Order[];
  addOrder: (order: {
    userId: string; items: Order['items']; subtotal: number; total: number;
    paymentMethod: 'cod' | 'emi'; address: string; phone: string;
    addressId?: string; addressSnapshot?: any; notes?: string;
    emiDetails?: any;
  }) => Promise<Order>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  updateEMIStatus: (orderId: string, status: 'approved' | 'rejected') => Promise<void>;
  markInstallmentPaid: (orderId: string) => Promise<void>;
  refresh: () => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const { user } = useAuth();

  const refresh = () => {
    orderService.getAllOrders().then(setOrders);
    if (user) {
      orderService.getOrdersByUser(user.id).then(setUserOrders);
    }
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  const addOrder = async (orderData: Parameters<OrderContextType['addOrder']>[0]) => {
    const n = await orderService.addOrder(orderData);
    refresh();
    return n;
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    await orderService.updateOrderStatus(id, status);
    refresh();
  };

  const updateEMIStatus = async (orderId: string, status: 'approved' | 'rejected') => {
    await orderService.updateEMIStatus(orderId, status);
    refresh();
  };

  const markInstallmentPaid = async (orderId: string) => {
    await orderService.markInstallmentPaid(orderId);
    refresh();
  };

  return (
    <OrderContext.Provider value={{ orders, userOrders, addOrder, updateOrderStatus, updateEMIStatus, markInstallmentPaid, refresh }}>
      {children}
    </OrderContext.Provider>
  );
}
