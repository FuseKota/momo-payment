import { useState, useEffect, useRef, useCallback } from 'react';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

/**
 * GET フェッチ + ローディング/エラー管理の共通フック。
 * 管理画面の各一覧ページで重複していた useState + useCallback + useEffect の定型を集約する。
 *
 * - url が変わると再フェッチ（フィルタ/ページネーションは呼び出し側で URL に反映）。
 * - url が null の間はフェッチしない（認証待ち等）。
 * - 取得失敗時は secureLog にログし、isError/errorStatus を立て、onError があれば呼ぶ（既存データは保持）。
 *   errorStatus は HTTP ステータス（非ok時）、ネットワーク断/例外時は null。
 * - refetch() で手動再取得（「更新」ボタン等）。失敗状態はエラー表示＋再試行導線に利用する。
 */
export function useFetch<T>(
  url: string | null,
  options?: { onError?: (status: number | null) => void }
): {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  errorStatus: number | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // null = エラーなし / { status } = エラー（status は HTTP コード、null はネットワーク断・例外）
  const [error, setError] = useState<{ status: number | null } | null>(null);
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
    setError(null);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (!cancelled) {
            secureLog('error', 'useFetch request failed', { status: res.status });
            setError({ status: res.status });
            onErrorRef.current?.(res.status);
          }
          return;
        }
        const json = (await res.json()) as T;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          secureLog('error', 'useFetch request failed', safeErrorLog(err));
          setError({ status: null });
          onErrorRef.current?.(null);
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

  return {
    data,
    isLoading,
    isError: error !== null,
    errorStatus: error?.status ?? null,
    refetch,
  };
}
