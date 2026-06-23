import { useState, useEffect, useRef, useCallback } from 'react';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

/**
 * GET フェッチ + ローディング/エラー管理の共通フック。
 * 管理画面の各一覧ページで重複していた useState + useCallback + useEffect の定型を集約する。
 *
 * - url が変わると再フェッチ（フィルタ/ページネーションは呼び出し側で URL に反映）。
 * - url が null の間はフェッチしない（認証待ち等）。
 * - 取得失敗時は secureLog にログし、onError があれば呼ぶ（既存データは保持）。
 * - refetch() で手動再取得（「更新」ボタン等）。
 */
export function useFetch<T>(
  url: string | null,
  options?: { onError?: () => void }
): { data: T | null; isLoading: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadIndex, setReloadIndex] = useState(0);

  // onError はレンダー毎に新しい関数になりうるため ref で保持し、依存配列に含めない。
  // ref の更新はレンダー中ではなく effect 内で行う（react-hooks ルール準拠）。
  const onErrorRef = useRef(options?.onError);
  useEffect(() => {
    onErrorRef.current = options?.onError;
  });

  useEffect(() => {
    if (url === null) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`request failed: ${res.status}`);
        const json = (await res.json()) as T;
        if (!cancelled) setData(json);
      } catch (error) {
        if (!cancelled) {
          secureLog('error', 'useFetch request failed', safeErrorLog(error));
          onErrorRef.current?.();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, reloadIndex]);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  return { data, isLoading, refetch };
}
