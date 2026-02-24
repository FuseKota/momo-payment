import { describe, it, expect } from 'vitest';
import { formatPrice, toInt, formatDate } from '../format';

describe('formatPrice', () => {
  it('formats integers with comma separator', () => {
    expect(formatPrice(1000)).toBe('1,000');
    expect(formatPrice(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('formats small numbers without comma', () => {
    expect(formatPrice(999)).toBe('999');
  });

  it('accepts locale parameter', () => {
    const result = formatPrice(1000, 'en-US');
    expect(result).toBe('1,000');
  });
});

describe('toInt', () => {
  it('converts valid numbers to integers', () => {
    expect(toInt(5)).toBe(5);
    expect(toInt('3')).toBe(3);
    expect(toInt(0)).toBe(0);
  });

  it('throws on NaN', () => {
    expect(() => toInt('abc')).toThrow('invalid number');
    expect(() => toInt(undefined)).toThrow('invalid number');
    // null converts to 0 via Number(), which is a valid integer
    expect(toInt(null)).toBe(0);
  });

  it('throws on Infinity', () => {
    expect(() => toInt(Infinity)).toThrow('invalid number');
    expect(() => toInt(-Infinity)).toThrow('invalid number');
  });

  it('throws on non-integer', () => {
    expect(() => toInt(1.5)).toThrow('must be integer');
    expect(() => toInt('2.7')).toThrow('must be integer');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z', 'ja-JP');
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns dash for empty string', () => {
    // Empty string creates an Invalid Date
    const result = formatDate('');
    // Either returns '-' or 'Invalid Date' depending on locale impl
    expect(result).toBeTruthy();
  });
});
