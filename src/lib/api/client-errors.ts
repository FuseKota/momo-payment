/**
 * クライアント側の共通エラーハンドリング・ヘルパー（顧客向け画面用）。
 *
 * API が返す生のエラーコード（英語 snake_case）や fetch の例外メッセージを
 * 画面にそのまま出さず、横断的な status / ネットワーク状態を
 * `common.errors.*` の i18n キーへ変換する。
 *
 * 使い方（next-intl）:
 *   const tc = useTranslations('common');
 *   // mutation（保存/決済系）: 横断キーがあれば優先、無ければ画面固有の汎用へ
 *   const key = commonErrorKeyForStatus(res.status);
 *   setError(key ? tc(key) : t('errors.orderFailed'));
 *   // fetch reject（オフライン/通信断）:
 *   setError(tc(networkErrorKey()));
 *
 * 原則: API の生トークン・err.message を画面に直接表示しないこと。
 */

/** `common.errors.*` のサブキー（useTranslations('common') に渡す相対パス） */
export type CommonErrorKey =
  | 'errors.networkError'
  | 'errors.offline'
  | 'errors.rateLimited'
  | 'errors.forbidden'
  | 'errors.sessionExpired'
  | 'errors.serverError'
  | 'errors.loadFailed'
  | 'errors.somethingWrong';

/**
 * fetch が reject した時（ネットワーク断 / タイムアウト / オフライン）のキー。
 * navigator.onLine が false ならオフライン専用文言、それ以外は汎用の通信エラー。
 */
export function networkErrorKey(): CommonErrorKey {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'errors.offline';
  }
  return 'errors.networkError';
}

/**
 * 横断的に扱うべき HTTP ステータスのみ `common.errors.*` キーへ変換する。
 * それ以外（一般的な 4xx 等）は null を返し、呼び出し側の画面固有の
 * 汎用メッセージ（例: checkoutShipping.errors.orderFailed）へフォールバックさせる。
 */
export function commonErrorKeyForStatus(status: number): CommonErrorKey | null {
  if (status === 401) return 'errors.sessionExpired';
  if (status === 403) return 'errors.forbidden';
  if (status === 429) return 'errors.rateLimited';
  if (status >= 500) return 'errors.serverError';
  return null;
}

/** セッション切れ（401）か。検知時はログイン画面へ誘導するために使う。 */
export function isSessionExpired(status: number): boolean {
  return status === 401;
}
