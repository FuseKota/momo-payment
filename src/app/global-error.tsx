'use client';

import { useEffect } from 'react';

// アプリ全体の最終フォールバックのエラー境界。
// global-error はエラー時にルートレイアウトを置き換えるため、
// 自前で <html>/<body> を描画する必要がある（通常の error.tsx では不可）。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <html lang="ja">
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            申し訳ありません。エラーが発生しました。
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            しばらく時間をおいて再度お試しください。
          </p>
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
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
