'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import type { Product, ProductVariant, TempZone } from '@/types/database';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

export type CartMode = 'shipping' | null;

export interface CartItem {
  product: Product;
  variant?: ProductVariant;
  qty: number;
}

// Generate unique key for cart item (same product + different variant = different item)
function getCartItemKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

interface CartContextType {
  items: CartItem[];
  cartMode: CartMode;
  addItem: (product: Product, qty?: number, variant?: ProductVariant) => boolean;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clearCart: () => void;
  switchMode: (mode: CartMode) => void;
  canAddProduct: (product: Product) => boolean;
  getIncompatibleModeMessage: (product: Product) => string | null;
  getTempZone: () => TempZone | null;
  hasMixedTempZones: () => boolean;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'momo-cart';
const MODE_STORAGE_KEY = 'momo-cart-mode';

interface StoredCart {
  items: CartItem[];
  mode: CartMode;
}

function loadCartFromStorage(): StoredCart {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle both old format (array) and new format (object with items and mode)
      if (Array.isArray(parsed)) {
        // Old format - migrate to new format
        const items = parsed as CartItem[];
        // pickup 廃止により全商品が配送モード
        const mode: CartMode = items.length > 0 ? 'shipping' : null;
        return { items, mode };
      }
      return parsed as StoredCart;
    }
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
  return { items: [], mode: null };
}

const EMPTY_CART: StoredCart = { items: [], mode: null };

export function CartProvider({ children }: { children: ReactNode }) {
  // Always start with empty cart to avoid hydration mismatch
  const [cart, setCart] = useState<StoredCart>(EMPTY_CART);
  const [isHydrated, setIsHydrated] = useState(false);

  const items = cart.items;
  const cartMode = cart.mode;

  // Hydrate cart from localStorage after mount (client only)
  useEffect(() => {
    const stored = loadCartFromStorage();
    setCart(stored);
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage on change (skip until hydrated)
  // QuotaExceeded やプライベートモード等で setItem が throw しても、
  // アプリをクラッシュさせずログに留める（カートはメモリ上では維持される）。
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      secureLog('warn', 'Failed to persist cart to localStorage', safeErrorLog(err));
    }
  }, [cart, isHydrated]);

  // pickup 廃止により全商品が配送モード。モード競合は発生しないため常に追加可能。
  const canAddProduct = (_product: Product): boolean => true;

  const getIncompatibleModeMessage = (_product: Product): string | null => null;

  const addItem = (product: Product, qty = 1, variant?: ProductVariant): boolean => {
    const itemKey = getCartItemKey(product.id, variant?.id);

    setCart((prev) => {
      const existing = prev.items.find(
        (item) => getCartItemKey(item.product.id, item.variant?.id) === itemKey
      );
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            getCartItemKey(item.product.id, item.variant?.id) === itemKey
              ? { ...item, qty: item.qty + qty }
              : item
          ),
          mode: prev.mode || 'shipping',
        };
      }
      return {
        ...prev,
        items: [...prev.items, { product, variant, qty }],
        mode: prev.mode || 'shipping',
      };
    });
    return true;
  };

  const removeItem = (productId: string, variantId?: string) => {
    const itemKey = getCartItemKey(productId, variantId);
    setCart((prev) => {
      const newItems = prev.items.filter(
        (item) => getCartItemKey(item.product.id, item.variant?.id) !== itemKey
      );
      return {
        items: newItems,
        mode: newItems.length === 0 ? null : prev.mode,
      };
    });
  };

  const updateQty = (productId: string, qty: number, variantId?: string) => {
    if (qty <= 0) {
      removeItem(productId, variantId);
      return;
    }
    const itemKey = getCartItemKey(productId, variantId);
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        getCartItemKey(item.product.id, item.variant?.id) === itemKey
          ? { ...item, qty }
          : item
      ),
    }));
  };

  const clearCart = () => {
    setCart({ items: [], mode: null });
  };

  const switchMode = (mode: CartMode) => {
    // Clear cart and switch mode
    setCart({ items: [], mode });
  };

  const getTempZone = (): TempZone | null => {
    if (items.length === 0) return null;
    return items[0].product.temp_zone;
  };

  const hasMixedTempZones = (): boolean => {
    if (items.length <= 1) return false;
    const firstZone = items[0].product.temp_zone;
    return items.some((item) => item.product.temp_zone !== firstZone);
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const price = item.variant?.price_yen ?? item.product.price_yen;
    return sum + price * item.qty;
  }, 0), [items]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  const value = useMemo(() => ({
    items,
    cartMode,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    switchMode,
    canAddProduct,
    getIncompatibleModeMessage,
    getTempZone,
    hasMixedTempZones,
    subtotal,
    itemCount,
  }), [items, cartMode, addItem, removeItem, updateQty, clearCart, switchMode, canAddProduct, getIncompatibleModeMessage, getTempZone, hasMixedTempZones, subtotal, itemCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
