/**
 * 環境変数の正規化ヘルパー（副作用なし・単体テスト可能）。
 * env.ts 本体はインポート時に getEnv() を実行するため、純粋関数はここに分離する。
 */

/**
 * サービスアカウント秘密鍵（PEM）を正規化する。
 * - 環境変数にダブルクォート付きで保存された場合に備え、前後のクォートを除去する
 * - .env で `\n` エスケープされた改行を実際の改行へ復元する
 *
 * Netlify 等で値を `"..."` で囲って保存すると PEM 先頭が `"-----BEGIN...` となり、
 * JWT クライアントが鍵を解釈できず認証に失敗するため、ここで吸収する。
 */
export function normalizeServiceAccountKey(s: string | undefined): string | undefined {
  if (!s) return s;
  const unquoted = s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
  return unquoted.replace(/\\n/g, '\n');
}
