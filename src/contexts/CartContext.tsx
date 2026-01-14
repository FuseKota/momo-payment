'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type { Product, ProductVariant, TempZone } from '@/types/database';

export type CartMode = 'pickup' | 'shipping' | null;

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

function getInitialCart(): StoredCart {
  if (typeof window === 'undefined') return { items: [], mode: null };
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle both old format (array) and new format (object with items and mode)
      if (Array.isArray(parsed)) {
        // Old format - migrate to new format
        const items = parsed as CartItem[];
        // Determine mode from existing items
        let mode: CartMode = null;
        if (items.length > 0) {
          const firstItem = items[0];
          mode = firstItem.product.can_pickup && !firstItem.product.can_ship ? 'pickup' : 'shipping';
        }
        return { items, mode };
      }
      return parsed as StoredCart;
    }
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
  return { items: [], mode: null };
}

function getProductMode(product: Product): CartMode {
  if (product.can_pickup && !product.can_ship) {
    return 'pickup';
  }
  if (product.can_ship && !product.can_pickup) {
    return 'shipping';
  }
  // Products that can do both default to shipping
  if (product.can_ship) {
    return 'shipping';
  }
  return 'pickup';
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoredCart>(getInitialCart);
  const isInitialMount = useRef(true);

  const items = cart.items;
  const cartMode = cart.mode;

  // Save cart to localStorage on change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const canAddProduct = (product: Product): boolean => {
    const productMode = getProductMode(product);
    // If cart is empty or mode matches, can add
    if (cartMode === null || cartMode === productMode) {
      return true;
    }
    return false;
  };

  const getIncompatibleModeMessage = (product: Product): string | null => {
    if (canAddProduct(product)) return null;

    const productMode = getProductMode(product);
    if (cartMode === 'pickup' && productMode === 'shipping') {
      return 'キッチンカー販売商品がカートにあります。配送商品を追加するにはカートをクリアしてください。';
    }
    if (cartMode === 'shipping' && productMode === 'pickup') {
      return '配送商品がカートにあります。キッチンカー販売商品を追加するにはカートをクリアしてください。';
    }
    return null;
  };

  const addItem = (product: Product, qty = 1, variant?: ProductVariant): boolean => {
    if (!canAddProduct(product)) {
      return false;
    }

    const productMode = getProductMode(product);
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
          mode: prev.mode || productMode,
        };
      }
      return {
        ...prev,
        items: [...prev.items, { product, variant, qty }],
        mode: prev.mode || productMode,
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

  const subtotal = items.reduce((sum, item) => {
    const price = item.variant?.price_yen ?? item.product.price_yen;
    return sum + price * item.qty;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
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
