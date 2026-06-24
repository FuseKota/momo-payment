/**
 * 管理画面（admin/*）用のエラーメッセージ変換ヘルパー。
 *
 * 管理画面は next-intl 非対応（運用言語は日本語のみ）のため、
 * API が返す生のエラーコード（英語 snake_case）や status を
 * 日本語の固定メッセージへ変換する。`err.error` の直接表示を全廃するための共通関数。
 *
 * 使い方:
 *   const res = await fetch(...);
 *   if (!res.ok) {
 *     const body = await res.json().catch(() => null);
 *     showSnackbar(translateAdminError(body, res.status, '保存に失敗しました'));
 *     return;
 *   }
 */

/** 既知のエラートークン → 日本語メッセージ */
const TOKEN_MESSAGES: Record<string, string> = {
  // 横断（admin-guards / CSRF / レート制限 / 認証）
  validation_error: '入力内容に誤りがあります。内容をご確認のうえ、もう一度お試しください。',
  invalid_json: 'リクエストの形式が正しくありません。ページを再読み込みしてお試しください。',
  // 注文ステータス更新（PATCH /api/admin/orders/[id]）
  use_ship_endpoint: '発送（SHIPPED）への変更は、注文詳細の「発送登録」から追跡番号とともに行ってください。',
  no_updatable_fields: '更新する項目がありません。ステータスを選択してください。',
  invalid_origin:
    'リクエストを安全に処理できませんでした。ページを再読み込みしてから、もう一度お試しください。',
  unauthorized: 'ログインの有効期限が切れた可能性があります。再度ログインしてください。',
  forbidden: 'この操作を行う権限がありません。',
  auth_error: '認証の確認中に問題が発生しました。再度ログインしてからお試しください。',
  rate_limit_exceeded:
    '短時間に操作が集中しています。しばらく時間をおいてから再度お試しください。',
  // 画像アップロード（upload.ts が返す機械可読コード）
  file_too_large: '画像のサイズが大きすぎます。5MB以下のファイルをお選びください。',
  mime_mismatch:
    '画像の形式が正しくありません。JPEG・PNG・WebP・GIF形式のファイルをお選びください。',
  invalid_image: '画像として認識できませんでした。別の画像ファイルをお選びください。',
  invalid_file_type:
    '対応していないファイル形式です。JPEG・PNG・WebP・GIF形式のファイルをお選びください。',
  upload_failed: '画像のアップロードに失敗しました。時間をおいて再度お試しください。',
  no_file: 'ファイルが選択されていません。',
  invalid_slug: 'スラッグの形式が正しくありません。',
  // Google Calendar 連携
  calendar_fetch_failed:
    'Googleカレンダーの読み込みに失敗しました。連携状態をご確認のうえ、しばらくして再度お試しください。',
  calendar_create_failed:
    'Googleカレンダーへの書き込みに失敗しました。時間をおいて再度お試しください。',
  calendar_delete_failed:
    'Googleカレンダー上の予定を削除できませんでした。時間をおいて再度お試しください。',
};

/**
 * API レスポンス（body.error と HTTP status）を日本語メッセージへ変換する。
 *
 * @param body   `await res.json()` の結果（{ error?: string } 想定。失敗時 null）
 * @param status HTTP ステータスコード
 * @param fallback 既知トークン・status に該当しない場合の汎用文言
 */
export function translateAdminError(
  body: { error?: unknown } | null | undefined,
  status: number,
  fallback = '処理に失敗しました。時間をおいて再度お試しください。'
): string {
  const token = typeof body?.error === 'string' ? body.error : undefined;
  if (token && TOKEN_MESSAGES[token]) return TOKEN_MESSAGES[token];

  // トークンが未知でも status から横断的な文言を出し分ける
  if (status === 401) return TOKEN_MESSAGES.unauthorized;
  if (status === 403) return TOKEN_MESSAGES.invalid_origin;
  if (status === 429) return TOKEN_MESSAGES.rate_limit_exceeded;
  if (status >= 500) return 'サーバーで問題が発生しました。時間をおいて再度お試しください。';

  return fallback;
}

/** fetch reject（通信断）時の管理画面向け文言。 */
export function adminNetworkErrorMessage(): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'インターネットに接続できません。通信環境をご確認のうえ、再度お試しください。';
  }
  return '通信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。';
}
