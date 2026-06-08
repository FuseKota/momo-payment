import Link from 'next/link';

// 非ローカライズなリクエスト（next-intl middleware を通らない経路）用の 404 フォールバック。
// ルートレイアウト(src/app/layout.tsx)は <html>/<body> を持たず children を素通しするため、
// ここで完全な HTML ドキュメントを自前で描画する必要がある。
// 通常のロケール付き 404 は src/app/[locale]/not-found.tsx が担当する。
export default function NotFound() {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
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
        <p style={{ fontSize: '3rem', fontWeight: 700, color: '#FF6680', margin: 0 }}>
          404
        </p>
        <h1 style={{ fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>
          ページが見つかりません
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/ja"
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#FF6680',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          トップページへ戻る
        </Link>
      </body>
    </html>
  );
}
