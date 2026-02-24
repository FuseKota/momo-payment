// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn().mockReturnValue('ja'),
}));

import { usePostalCodeLookup } from '../usePostalCodeLookup';

describe('usePostalCodeLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('initializes with correct defaults', () => {
    const { result } = renderHook(() => usePostalCodeLookup());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns address on successful lookup', async () => {
    const mockAddress = { prefecture: '東京都', city: '千代田区', town: '千代田' };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAddress),
    } as Response);

    const { result } = renderHook(() => usePostalCodeLookup());

    let lookupResult: any;
    await act(async () => {
      lookupResult = await result.current.lookup('1000001');
    });

    expect(lookupResult).toEqual(mockAddress);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets NOT_FOUND error when address not found', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'NOT_FOUND' }),
    } as Response);

    const { result } = renderHook(() => usePostalCodeLookup());

    let lookupResult: any;
    await act(async () => {
      lookupResult = await result.current.lookup('0000000');
    });

    expect(lookupResult).toBeNull();
    expect(result.current.error).toBe('NOT_FOUND');
  });

  it('sets RATE_LIMITED error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'RATE_LIMITED' }),
    } as Response);

    const { result } = renderHook(() => usePostalCodeLookup());

    await act(async () => {
      await result.current.lookup('1000001');
    });

    expect(result.current.error).toBe('RATE_LIMITED');
  });

  it('sets LOOKUP_FAILED on fetch error', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePostalCodeLookup());

    await act(async () => {
      await result.current.lookup('1000001');
    });

    expect(result.current.error).toBe('LOOKUP_FAILED');
  });

  it('sets LOOKUP_FAILED for INVALID_PARAMS', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'INVALID_PARAMS' }),
    } as Response);

    const { result } = renderHook(() => usePostalCodeLookup());

    await act(async () => {
      await result.current.lookup('abc');
    });

    expect(result.current.error).toBe('LOOKUP_FAILED');
  });

  it('clearError clears the error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'NOT_FOUND' }),
    } as Response);

    const { result } = renderHook(() => usePostalCodeLookup());

    await act(async () => {
      await result.current.lookup('0000000');
    });
    expect(result.current.error).toBe('NOT_FOUND');

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading during lookup', async () => {
    let resolvePromise: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(global.fetch).mockReturnValue(fetchPromise);

    const { result } = renderHook(() => usePostalCodeLookup());

    let lookupPromise: Promise<any>;
    act(() => {
      lookupPromise = result.current.lookup('1000001');
    });

    // isLoading should be true while waiting
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ prefecture: '東京都', city: '千代田区' }),
      } as Response);
      await lookupPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('passes locale parameter in query string', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ prefecture: '東京都', city: '千代田区' }),
    } as Response);

    const { result } = renderHook(() => usePostalCodeLookup());

    await act(async () => {
      await result.current.lookup('1000001');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('locale=ja')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('zipcode=1000001')
    );
  });
});
