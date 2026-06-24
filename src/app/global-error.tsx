'use client';

import { useEffect, useState } from 'react';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

// アプリ全体の最終フォールバックのエラー境界。
// global-error はエラー時にルートレイアウトを置き換えるため、自前で <html>/<body> を描画する。
// NextIntlClientProvider の外側で動くため useTranslations は使えない。
// ロケール別の静的文言マップを持ち、NEXT_LOCALE Cookie（または URL プレフィックス）で出し分ける。
type Locale = 'ja' | 'zh-tw' | 'en';

const COPY: Record<Locale, { lang: string; title: string; body: string; retry: string }> = {
  ja: {
    lang: 'ja',
    title: '申し訳ありません。エラーが発生しました。',
    body: 'しばらく時間をおいて再度お試しください。',
    retry: '再読み込み',
  },
  'zh-tw': {
    lang: 'zh-Hant-TW',
    title: '很抱歉，發生了錯誤。',
    body: '請稍候片刻後再試一次。',
    retry: '重新整理',
  },
  en: {
    lang: 'en',
    title: 'Sorry, something went wrong.',
    body: 'Please try again in a moment.',
    retry: 'Reload',
  },
};

function detectLocale(): Locale {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const cookieLocale = m?.[1];
    if (cookieLocale === 'zh-tw' || cookieLocale === 'en' || cookieLocale === 'ja') {
      return cookieLocale;
    }
    const seg = window.location?.pathname.split('/')[1];
    if (seg === 'zh-tw' || seg === 'en') return seg;
  }
  return 'ja';
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // SSR/初期描画は ja。マウント後に Cookie/URL から実ロケールへ切り替える
  // （Provider 外のためハイドレーション後の更新で言語を反映する）。
  const [locale, setLocale] = useState<Locale>('ja');

  useEffect(() => {
    secureLog('error', 'App error boundary', safeErrorLog(error));
  }, [error]);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const copy = COPY[locale];

  return (
    <html lang={copy.lang}>
      <body style={{ margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            color: '#333',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{copy.title}</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{copy.body}</p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#FF6680',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {copy.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
