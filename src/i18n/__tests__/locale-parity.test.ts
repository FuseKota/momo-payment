import { describe, it, expect } from 'vitest';
import ja from '../../../messages/ja.json';
import zhTw from '../../../messages/zh-tw.json';
import en from '../../../messages/en.json';

/**
 * 3ロケール（ja / zh-tw / en）のメッセージファイルが完全に同じキー集合を持つことを保証する。
 * エラーメッセージ等のキーを追加する際、1ファイルだけ更新して他言語で
 * 「キー欠落 → 実行時に英語キーが露出」する退行を防ぐためのガード。
 */
type Json = Record<string, unknown>;

function flattenKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Json, path);
    }
    return [path];
  });
}

describe('i18n locale parity', () => {
  const jaKeys = new Set(flattenKeys(ja as Json));
  const zhKeys = new Set(flattenKeys(zhTw as Json));
  const enKeys = new Set(flattenKeys(en as Json));

  it('zh-tw は ja と同じキー集合を持つ', () => {
    const missing = [...jaKeys].filter((k) => !zhKeys.has(k));
    const extra = [...zhKeys].filter((k) => !jaKeys.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('en は ja と同じキー集合を持つ', () => {
    const missing = [...jaKeys].filter((k) => !enKeys.has(k));
    const extra = [...enKeys].filter((k) => !jaKeys.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});
