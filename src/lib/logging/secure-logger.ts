/**
 * セキュアロガー
 * ログから個人情報（PII）を除去してプライバシーを保護
 */

interface PIIPattern {
  pattern: RegExp;
  replacement: string;
}

/**
 * 個人情報のパターン
 */
const PII_PATTERNS: PIIPattern[] = [
  // メールアドレス
  {
    pattern: /[\w.-]+@[\w.-]+\.\w+/g,
    replacement: '[EMAIL]',
  },
  // 日本の電話番号
  {
    pattern: /0[0-9\-]{9,13}/g,
    replacement: '[PHONE]',
  },
  // 郵便番号（〒マークまたは"postal"/"zip"キー直後、または単独で境界がある場合）
  {
    pattern: /〒\d{3}-?\d{4}/g,
    replacement: '〒[POSTAL]',
  },
  // クレジットカード番号（一部マスク）
  {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '[CARD]',
  },
];

/**
 * 文字列から個人情報を除去
 */
function redactPII(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * オブジェクトから個人情報を除去（再帰的）
 */
function redactPIIFromObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactPII(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPIIFromObject);
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // 特定のキーは完全にマスク
      if (['email', 'phone', 'password', 'token', 'secret'].includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactPIIFromObject(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * セキュアなログ出力
 * @param level - ログレベル
 * @param message - メッセージ
 * @param data - 追加データ（PIIが除去される）
 */
export function secureLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: unknown
): void {
  const timestamp = new Date().toISOString();
  const sanitizedData = data ? redactPIIFromObject(data) : undefined;

  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    message,
  };

  if (sanitizedData !== undefined) {
    logEntry.data = sanitizedData;
  }

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(JSON.stringify(logEntry));
      }
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

/**
 * エラーオブジェクトを安全にログ用に変換
 */
export function safeErrorLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactPII(error.message),
      // スタックトレースは開発環境のみ
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };
  }

  if (typeof error === 'string') {
    return { message: redactPII(error) };
  }

  return { message: 'Unknown error' };
}
