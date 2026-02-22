/**
 * 価格をカンマ区切りでフォーマット（例: 1000 → "1,000"）
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ja-JP').format(price);
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
 * 日付文字列を日本語フォーマットに変換
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
