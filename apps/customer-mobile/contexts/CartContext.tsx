import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';

const CART_KEY = '@loanex_cart';

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: Product, quantity?: number, selectedTenure?: number, variantId?: string, variantPrice?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  /** Remove only the purchased quantities — lines the customer checked out fewer
   *  units of get their quantity reduced instead of being deleted. */
  reduceQuantities: (purchases: Array<{ productId: string; quantity: number; variantId?: string }>) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

/** A cart line is unique per product + variant — two variants of the same product are separate lines. */
function lineKey(productId: string, variantId?: string) {
  return `${productId}::${variantId ?? ''}`;
}

function persist(items: CartItem[]) {
  AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch(() => {});
}

/**
 * Available stock for a cart line — variant stock when a variant is selected
 * and resolvable, else the product stock. Missing/NaN stock means "not
 * tracked" and imposes no clamp.
 */
function availableStockFor(item: CartItem): number {
  let raw: number | undefined;
  if (item.variantId) {
    const variants = item.product.productVariants || item.product.product_variants || item.product.variants || [];
    const variant = variants.find(v => v.id === item.variantId);
    if (variant) raw = Number(variant.stock);
  }
  if (raw === undefined) raw = Number(item.product.stock);
  return Number.isFinite(raw) && raw >= 0 ? raw : Number.POSITIVE_INFINITY;
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

  const addItem = (product: Product, quantity: number = 1, selectedTenure?: number, variantId?: string, variantPrice?: number) => {
    const key = lineKey(product.id, variantId);
    save((() => {
      const existing = cartItems.find(i => lineKey(i.product.id, i.variantId) === key);
      if (existing) {
        return cartItems.map(i =>
          lineKey(i.product.id, i.variantId) === key
            ? {
                ...i,
                quantity: i.quantity + quantity,
                selectedTenure: selectedTenure ?? i.selectedTenure,
                variantId: variantId ?? i.variantId,
                variantPrice: variantPrice ?? i.variantPrice,
              }
            : i
        );
      }
      return [...cartItems, { product, quantity, selectedTenure, variantId, variantPrice }];
    })());
  };

  const removeItem = (productId: string, variantId?: string) => {
    const key = lineKey(productId, variantId);
    save(cartItems.filter(i => lineKey(i.product.id, i.variantId) !== key));
  };

  const updateQuantity = (productId: string, variantId: string | undefined, qty: number) => {
    const key = lineKey(productId, variantId);
    const item = cartItems.find(i => lineKey(i.product.id, i.variantId) === key);
    if (qty <= 0 || !item) {
      if (item) save(cartItems.filter(i => lineKey(i.product.id, i.variantId) !== key));
      return;
    }
    save(cartItems.map(i => lineKey(i.product.id, i.variantId) === key ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => save([]);

  /**
   * Mirror of backend cart.repository.removeProducts: only the bought
   * quantities leave the cart. If the customer checked out fewer units than a
   * line holds (partial order), the line quantity is reduced instead of the
   * whole line being deleted. Anything added to the cart later survives.
   *
   * Low-stock guard: the leftover is clamped to the line's available stock, so
   * an order never leaves the cart holding more units than can be fulfilled.
   */
  const reduceQuantities = (purchases: Array<{ productId: string; quantity: number; variantId?: string }>) => {
    const map = new Map<string, number>();
    for (const p of purchases ?? []) {
      if (!p?.productId) continue;
      const qty = Math.max(1, Math.floor(Number(p.quantity) || 1));
      const key = lineKey(p.productId, p.variantId);
      map.set(key, (map.get(key) ?? 0) + qty);
    }
    if (map.size === 0) return;
    save(
      cartItems
        .map(i => {
          const purchased = map.get(lineKey(i.product.id, i.variantId));
          if (!purchased) return i;
          const lineQty = Math.max(0, Number(i.quantity) || 0);
          if (lineQty <= purchased) return null; // fully bought → drop the line
          // Clamp the leftover to available stock instead of leaving an
          // unfulfillable line (stock can drop mid-checkout or the line may
          // have exceeded stock before the order).
          const remaining = Math.min(lineQty - purchased, availableStockFor(i));
          if (remaining <= 0) return null;
          return { ...i, quantity: remaining };
        })
        .filter((i): i is CartItem => i !== null)
    );
  };

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + (i.variantPrice ?? i.product.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems, addItem, removeItem, updateQuantity, reduceQuantities, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}
