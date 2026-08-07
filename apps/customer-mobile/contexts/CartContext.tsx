import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';

const CART_KEY = '@loanex_cart';

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: Product, quantity?: number, selectedTenure?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

function persist(items: CartItem[]) {
  AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch(() => {});
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then(raw => {
      if (raw) {
        try { setCartItems(JSON.parse(raw)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const save = (items: CartItem[]) => {
    setCartItems(items);
    persist(items);
  };

  const addItem = (product: Product, quantity: number = 1, selectedTenure?: number) => {
    save((() => {
      const existing = cartItems.find(i => i.product.id === product.id);
      if (existing) {
        return cartItems.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity, selectedTenure: selectedTenure ?? i.selectedTenure }
            : i
        );
      }
      return [...cartItems, { product, quantity, selectedTenure }];
    })());
  };

  const removeItem = (productId: string) =>
    save(cartItems.filter(i => i.product.id !== productId));

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    save(cartItems.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => save([]);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}
