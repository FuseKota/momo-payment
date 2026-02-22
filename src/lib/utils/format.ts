/**
 * 価格をカンマ区切りでフォーマット（例: 1000 → "1,000"）
 */
export function formatPrice(price: number, locale: string = 'ja-JP'): string {
  return new Intl.NumberFormat(locale).format(price);
}

/**
 * unknown値を整数に変換（バリデーション付き）
 */
export function toInt(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) throw new Error('invalid number');
  if (!Number.isInteger(x)) throw new Error('must be integer');
  return x;
}

/**
 * 日付文字列をフォーマットに変換
 */
export function formatDate(dateStr: string | null, locale: string = 'ja-JP'): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
