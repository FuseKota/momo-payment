/**
 * セキュアロガーのユニットテスト
 * PIIが正しく除去されることを確認
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { secureLog, safeErrorLog } from '../secure-logger';

describe('secure-logger', () => {
  const consoleSpy = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
    consoleSpy.error.mockClear();
    consoleSpy.debug.mockClear();
    vi.spyOn(console, 'log').mockImplementation(consoleSpy.log);
    vi.spyOn(console, 'warn').mockImplementation(consoleSpy.warn);
    vi.spyOn(console, 'error').mockImplementation(consoleSpy.error);
    vi.spyOn(console, 'debug').mockImplementation(consoleSpy.debug);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('secureLog', () => {
    it('メールアドレスがマスクされる', () => {
      secureLog('info', 'User action', { email: 'test@example.com' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('test@example.com');
      expect(logOutput).toContain('[REDACTED]');
    });

    it('電話番号がマスクされる', () => {
      secureLog('info', 'User action', { phone: '090-1234-5678' });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('090-1234-5678');
      expect(logOutput).toContain('[REDACTED]');
    });

    it('文字列内のメールアドレスがマスクされる', () => {
      secureLog('info', 'User action', { info: 'Contact: user@domain.com' });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('user@domain.com');
      expect(logOutput).toContain('[EMAIL]');
    });

    it('文字列内の電話番号がマスクされる', () => {
      secureLog('info', 'User action', { info: 'Phone: 03-1234-5678' });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('03-1234-5678');
      expect(logOutput).toContain('[PHONE]');
    });

    it('郵便番号がマスクされる', () => {
      secureLog('info', 'User action', { info: '〒123-4567' });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('123-4567');
      expect(logOutput).toContain('[POSTAL]');
    });

    it('password キーは完全にマスクされる', () => {
      secureLog('info', 'Login attempt', { password: 'secret123' });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('secret123');
      expect(logOutput).toContain('[REDACTED]');
    });

    it('token キーは完全にマスクされる', () => {
      secureLog('info', 'Auth', { token: 'abc123xyz' });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('abc123xyz');
      expect(logOutput).toContain('[REDACTED]');
    });

    it('ネストされたオブジェクトのPIIもマスクされる', () => {
      secureLog('info', 'Order', {
        customer: {
          email: 'nested@test.com',
          phone: '090-0000-0000',
        },
      });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('nested@test.com');
      expect(logOutput).not.toContain('090-0000-0000');
    });

    it('配列内のPIIもマスクされる', () => {
      secureLog('info', 'Bulk', {
        emails: ['a@test.com', 'b@test.com'],
      });

      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).not.toContain('a@test.com');
      expect(logOutput).not.toContain('b@test.com');
    });

    it('適切なログレベルが使用される', () => {
      secureLog('warn', 'Warning', {});
      expect(consoleSpy.warn).toHaveBeenCalled();

      secureLog('error', 'Error', {});
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('safeErrorLog', () => {
    it('Errorオブジェクトを安全に変換する', () => {
      const error = new Error('User test@test.com not found');
      const result = safeErrorLog(error);

      expect(result.name).toBe('Error');
      expect(result.message).not.toContain('test@test.com');
      expect(result.message).toContain('[EMAIL]');
    });

    it('文字列エラーも処理する', () => {
      const result = safeErrorLog('Error with phone 090-1111-2222');

      expect(result.message).not.toContain('090-1111-2222');
      expect(result.message).toContain('[PHONE]');
    });

    it('未知のエラー型も処理する', () => {
      const result = safeErrorLog({ custom: 'error' });
      expect(result.message).toBe('Unknown error');
    });
  });
});
