import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 郵便番号検索API（GET /api/postal-code/lookup）の単体テスト。
 * - 日本(ja): 外部API(zipcloud)を fetch でモック
 * - 台湾(zh-tw): lookupTwZipcode をモック
 * - rate-limit はデフォルト許可、429 ケースで拒否に差し替え
 */

const mockCheckRateLimit = vi.fn();
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIP: () => '1.2.3.4',
}));

const mockLookupTw = vi.fn();
vi.mock('@/data/tw-zipcode', () => ({
  lookupTwZipcode: (...args: unknown[]) => mockLookupTw(...args),
}));

import { GET } from '@/app/api/postal-code/lookup/route';
import { NextRequest } from 'next/server';

function makeReq(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/postal-code/lookup');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

describe('GET /api/postal-code/lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rate limit 超過時は 429', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, resetIn: 42 });

    const res = await GET(makeReq({ zipcode: '1000001', locale: 'ja' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
  });

  it('パラメータ不正は 400 INVALID_PARAMS', async () => {
    const res = await GET(makeReq({ zipcode: '1' })); // locale 欠落 & 桁不足
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('INVALID_PARAMS');
  });

  it('日本: 正常に住所を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ address1: '東京都', address2: '千代田区', address3: '千代田' }],
        }),
      })
    );

    const res = await GET(makeReq({ zipcode: '100-0001', locale: 'ja' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ prefecture: '東京都', city: '千代田区', town: '千代田' });
  });

  it('日本: 該当なしは 404 NOT_FOUND', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }));

    const res = await GET(makeReq({ zipcode: '9999999', locale: 'ja' }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });

  it('日本: 外部API異常は 502 LOOKUP_FAILED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const res = await GET(makeReq({ zipcode: '1000001', locale: 'ja' }));
    const data = await res.json();
    expect(res.status).toBe(502);
    expect(data.error).toBe('LOOKUP_FAILED');
  });

  it('日本: fetch が throw しても 502 LOOKUP_FAILED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const res = await GET(makeReq({ zipcode: '1000001', locale: 'ja' }));
    const data = await res.json();
    expect(res.status).toBe(502);
    expect(data.error).toBe('LOOKUP_FAILED');
  });

  it('台湾: 先頭3桁で住所を返す', async () => {
    mockLookupTw.mockReturnValue({ county: '台北市', district: '中正區' });

    const res = await GET(makeReq({ zipcode: '100', locale: 'zh-tw' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(mockLookupTw).toHaveBeenCalledWith('100');
    expect(data).toEqual({ prefecture: '台北市', city: '中正區' });
  });

  it('台湾: 該当なしは 404 NOT_FOUND', async () => {
    mockLookupTw.mockReturnValue(null);

    const res = await GET(makeReq({ zipcode: '999', locale: 'zh-tw' }));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('NOT_FOUND');
  });
});
