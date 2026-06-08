'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// ロケール付き 404（例: /ja/存在しないパス）。
// [locale]/layout.tsx 配下で描画されるため <html>/<body>・フォント・i18n が適用される。
export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: '#333',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '3rem', fontWeight: 700, color: '#FF6680', margin: 0 }}>
        404
      </p>
      <h1 style={{ fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>{t('title')}</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>{t('description')}</p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#FF6680',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
