// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

import { useFetch } from '../useFetch';

describe('useFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('成功時に data を返し isLoading が false になる', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 42 }),
    } as Response);

    const { result } = renderHook(() => useFetch<{ value: number }>('/api/x'));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ value: 42 });
  });

  it('url が null の間はフェッチしない', async () => {
    const { result } = renderHook(() => useFetch<unknown>(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('res.ok=false 時は onError を呼び data は null のまま', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500 } as Response);
    const onError = vi.fn();

    const { result } = renderHook(() => useFetch('/api/x', { onError }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeNull();
  });

  it('fetch が throw しても onError を呼ぶ', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network'));
    const onError = vi.fn();

    const { result } = renderHook(() => useFetch('/api/x', { onError }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('refetch で再フェッチする', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    } as Response);

    const { result } = renderHook(() => useFetch<{ value: number }>('/api/x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it('url が変わると再フェッチする', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    } as Response);

    const { result, rerender } = renderHook(({ url }) => useFetch(url), {
      initialProps: { url: '/api/a' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledTimes(1);

    rerender({ url: '/api/b' });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });
});
