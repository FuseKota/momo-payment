/**
 * env-utils（環境変数正規化ヘルパー）のユニットテスト
 */
import { describe, it, expect } from 'vitest';
import { normalizeServiceAccountKey } from '../env-utils';

describe('normalizeServiceAccountKey', () => {
  it('\\n エスケープを実際の改行へ復元する', () => {
    const input = '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n';
    expect(normalizeServiceAccountKey(input)).toBe(
      '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n'
    );
  });

  it('前後のダブルクォートを除去してから改行を復元する（Netlify 貼り付けミス対策）', () => {
    const input = '"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"';
    const out = normalizeServiceAccountKey(input);
    expect(out?.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true);
    expect(out?.includes('"')).toBe(false);
    expect(out).toBe('-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n');
  });

  it('片側だけのクォートは除去しない（前後揃っている場合のみ）', () => {
    const input = '"-----BEGIN PRIVATE KEY-----\\nABC';
    // 末尾にクォートが無いので除去されない
    expect(normalizeServiceAccountKey(input)).toBe('"-----BEGIN PRIVATE KEY-----\nABC');
  });

  it('既に実改行を含む値はそのまま（\\n が無ければ変化しない）', () => {
    const input = '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n';
    expect(normalizeServiceAccountKey(input)).toBe(input);
  });

  it('undefined / 空文字はそのまま返す', () => {
    expect(normalizeServiceAccountKey(undefined)).toBeUndefined();
    expect(normalizeServiceAccountKey('')).toBe('');
  });
});
