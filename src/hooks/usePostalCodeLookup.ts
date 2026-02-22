'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';

export type LookupErrorCode = 'NOT_FOUND' | 'RATE_LIMITED' | 'LOOKUP_FAILED';

interface AddressResult {
  prefecture: string;
  city: string;
  town?: string;
}

interface UsePostalCodeLookupReturn {
  lookup: (zipcode: string) => Promise<AddressResult | null>;
  isLoading: boolean;
  error: LookupErrorCode | null;
  clearError: () => void;
}

const ERROR_MAP: Record<string, LookupErrorCode> = {
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  LOOKUP_FAILED: 'LOOKUP_FAILED',
  INVALID_PARAMS: 'LOOKUP_FAILED',
};

export function usePostalCodeLookup(): UsePostalCodeLookupReturn {
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LookupErrorCode | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const lookup = useCallback(
    async (zipcode: string): Promise<AddressResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          zipcode,
          locale: locale === 'zh-tw' ? 'zh-tw' : 'ja',
        });

        const res = await fetch(`/api/postal-code/lookup?${params}`);

        if (!res.ok) {
          const data = await res.json();
          const code = ERROR_MAP[data.error] || 'LOOKUP_FAILED';
          setError(code);
          return null;
        }

        const result: AddressResult = await res.json();
        return result;
      } catch {
        setError('LOOKUP_FAILED');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [locale]
  );

  return { lookup, isLoading, error, clearError };
}
