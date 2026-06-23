/** カート内の1商品あたりの最大数量 */
export const MAX_ITEM_QUANTITY = 10;

/**
 * 専用 CSS Module を持つルート（プレフィックス）。
 * これらへの <Link> を Next.js が自動プリフェッチすると、CSSを使わないページで
 * 未使用CSSが <link rel="preload" as="style"> され、Chrome の
 * 「preloaded but not used」警告が出る。該当リンクには prefetch={false} を付与する。
 * 新たに CSS Module を持つページを追加したらここに登録すること。
 */
export const CSS_MODULE_ROUTE_PREFIXES = ['/news', '/taiwan-night-market'] as const;

/**
 * href が CSS Module ルート（例: /news, /news/[slug], /taiwan-night-market）なら
 * 自動プリフェッチを無効化すべきか判定する。
 */
export function shouldDisablePrefetch(href: string): boolean {
  return CSS_MODULE_ROUTE_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`)
  );
}

export const statusLabels: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  PENDING_PAYMENT: { label: '決済待ち', color: 'warning' },
  PAID: { label: '入金済', color: 'success' },
  PACKING: { label: '梱包中', color: 'primary' },
  SHIPPED: { label: '発送済', color: 'secondary' },
  FULFILLED: { label: '完了', color: 'default' },
  CANCELED: { label: 'キャンセル', color: 'error' },
  REFUNDED: { label: '返金済', color: 'default' },
};
