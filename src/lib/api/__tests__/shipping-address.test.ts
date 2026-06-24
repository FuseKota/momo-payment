import { describe, it, expect } from 'vitest';
import { firstShippingAddress } from '../shipping-address';

describe('firstShippingAddress', () => {
  const addr = { postal_code: '1000001', pref: '東京都' };

  it('PostgREST one-to-one 埋め込み（単一オブジェクト）をそのまま返す', () => {
    expect(firstShippingAddress(addr)).toBe(addr);
  });

  it('配列なら先頭要素を返す', () => {
    expect(firstShippingAddress([addr])).toBe(addr);
  });

  it('null / undefined は null', () => {
    expect(firstShippingAddress(null)).toBeNull();
    expect(firstShippingAddress(undefined)).toBeNull();
  });

  it('空配列は null', () => {
    expect(firstShippingAddress([])).toBeNull();
  });
});
