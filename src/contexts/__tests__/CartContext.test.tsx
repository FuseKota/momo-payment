// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import type { Product, ProductVariant } from '@/types/database';
import type { ReactNode } from 'react';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'テスト商品',
  slug: 'test-product',
  description: 'テスト',
  kind: 'FROZEN_FOOD',
  temp_zone: 'FROZEN',
  price_yen: 1000,
  can_pickup: false,
  can_ship: true,
  is_active: true,
  image_url: null,
  images: null,
  stock_qty: null,
  sort_order: 0,
  has_variants: false,
  food_label: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'var-1',
  product_id: 'prod-1',
  size: 'M',
  price_yen: 1500,
  stock_qty: null,
  is_active: true,
  sort_order: 0,
  created_at: '2024-01-01',
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.cartMode).toBeNull();
  });

  it('addItem adds a product to cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);
    expect(result.current.subtotal).toBe(2000);
    expect(result.current.itemCount).toBe(2);
  });

  it('addItem increments qty for existing product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 1);
      result.current.addItem(product, 3);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(4);
  });

  it('addItem with variant creates separate items', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();
    const variantM = makeVariant({ id: 'var-m', size: 'M', price_yen: 1500 });
    const variantL = makeVariant({ id: 'var-l', size: 'L', price_yen: 2000 });

    act(() => {
      result.current.addItem(product, 1, variantM);
      result.current.addItem(product, 1, variantL);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.subtotal).toBe(3500);
  });

  it('removeItem removes a product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 2);
    });
    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.removeItem(product.id);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it('updateQty updates the quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 1);
    });

    act(() => {
      result.current.updateQty(product.id, 5);
    });

    expect(result.current.items[0].qty).toBe(5);
    expect(result.current.subtotal).toBe(5000);
  });

  it('updateQty to 0 removes the item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 1);
    });

    act(() => {
      result.current.updateQty(product.id, 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('clearCart empties the cart and resets mode', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 3);
    });
    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.cartMode).toBeNull();
  });

  it('canAddProduct returns false for incompatible mode', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const shippingProduct = makeProduct({ can_ship: true, can_pickup: false });
    const pickupProduct = makeProduct({ id: 'prod-2', can_ship: false, can_pickup: true });

    act(() => {
      result.current.addItem(shippingProduct, 1);
    });

    expect(result.current.canAddProduct(pickupProduct)).toBe(false);
  });

  it('hasMixedTempZones detects mixed zones', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const frozen = makeProduct({ temp_zone: 'FROZEN' });
    const ambient = makeProduct({ id: 'prod-2', temp_zone: 'AMBIENT' });

    act(() => {
      result.current.addItem(frozen, 1);
      result.current.addItem(ambient, 1);
    });

    expect(result.current.hasMixedTempZones()).toBe(true);
  });

  it('switchMode clears cart and sets new mode', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 1);
    });

    act(() => {
      result.current.switchMode('pickup');
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.cartMode).toBe('pickup');
  });

  it('subtotal uses variant price when available', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct({ price_yen: 1000 });
    const variant = makeVariant({ price_yen: 1500 });

    act(() => {
      result.current.addItem(product, 2, variant);
    });

    expect(result.current.subtotal).toBe(3000);
  });

  it('persists to localStorage on change', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const product = makeProduct();

    act(() => {
      result.current.addItem(product, 1);
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });
});
