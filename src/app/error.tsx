'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
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
  );
}
