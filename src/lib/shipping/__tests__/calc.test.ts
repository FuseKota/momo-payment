import { describe, it, expect } from 'vitest';
import {
  resolveZone,
  calcShippingFee,
  calcLeadTimeDays,
  calcMinDeliveryYmd,
  calcMaxDeliveryYmd,
  isDeliveryDateInRange,
  addDaysYmd,
  isValidYmd,
  normalizePref,
  MAX_LEAD_TIME_DAYS,
} from '@/lib/shipping';

describe('resolveZone', () => {
  it('各地帯の代表県を解決する', () => {
    expect(resolveZone('東京都')).toBe('KANTO');
    expect(resolveZone('宮城県')).toBe('SOUTH_TOHOKU');
    expect(resolveZone('青森県')).toBe('NORTH_TOHOKU');
    expect(resolveZone('新潟県')).toBe('SHINETSU');
    expect(resolveZone('富山県')).toBe('HOKURIKU');
    expect(resolveZone('愛知県')).toBe('TOKAI');
    expect(resolveZone('大阪府')).toBe('KANSAI');
    expect(resolveZone('広島県')).toBe('CHUGOKU');
    expect(resolveZone('香川県')).toBe('SHIKOKU');
    expect(resolveZone('福岡県')).toBe('NORTH_KYUSHU');
    expect(resolveZone('鹿児島県')).toBe('SOUTH_KYUSHU');
    expect(resolveZone('北海道')).toBe('HOKKAIDO');
    expect(resolveZone('沖縄県')).toBe('OKINAWA');
  });

  it('接尾辞なし（核名称）でも解決する', () => {
    expect(resolveZone('東京')).toBe('KANTO');
    expect(resolveZone('大阪')).toBe('KANSAI');
    expect(resolveZone('京都')).toBe('KANSAI'); // 京都は末尾が「都」だが正しく解決
    expect(resolveZone('沖縄')).toBe('OKINAWA');
  });

  it('前後の空白を無視する', () => {
    expect(resolveZone(' 東京都 ')).toBe('KANTO');
    expect(resolveZone('東京都　')).toBe('KANTO'); // 全角空白
  });

  it('未対応・不正な入力は null', () => {
    expect(resolveZone('')).toBeNull();
    expect(resolveZone('海外')).toBeNull();
    expect(resolveZone('Tokyo')).toBeNull();
    expect(resolveZone(null)).toBeNull();
    expect(resolveZone(undefined)).toBeNull();
  });
});

describe('calcShippingFee（60サイズ基本運賃 + 箱代200）', () => {
  it('地帯ごとの送料を返す', () => {
    expect(calcShippingFee('東京都')).toBe(840); // 関東 640 + 200
    expect(calcShippingFee('福島県')).toBe(840); // 南東北 640 + 200
    expect(calcShippingFee('青森県')).toBe(850); // 北東北 650 + 200
    expect(calcShippingFee('長野県')).toBe(850); // 信越 650 + 200
    expect(calcShippingFee('石川県')).toBe(850); // 北陸 650 + 200
    expect(calcShippingFee('愛知県')).toBe(850); // 東海 650 + 200
    expect(calcShippingFee('大阪府')).toBe(860); // 関西 660 + 200
    expect(calcShippingFee('広島県')).toBe(870); // 中国 670 + 200
    expect(calcShippingFee('香川県')).toBe(870); // 四国 670 + 200
    expect(calcShippingFee('福岡県')).toBe(870); // 北九州 670 + 200
    expect(calcShippingFee('北海道')).toBe(870); // 北海道 670 + 200
    expect(calcShippingFee('鹿児島県')).toBe(880); // 南九州 680 + 200
  });

  it('沖縄は南九州料金で代用（880）', () => {
    expect(calcShippingFee('沖縄県')).toBe(880);
  });

  it('未対応地域は null', () => {
    expect(calcShippingFee('海外')).toBeNull();
    expect(calcShippingFee('')).toBeNull();
  });
});

describe('calcLeadTimeDays（お届け日数 + 店側準備2日）', () => {
  it('地域別のリードタイムを返す', () => {
    expect(calcLeadTimeDays('東京都')).toBe(3); // 関東 1 + 2
    expect(calcLeadTimeDays('福島県')).toBe(3); // 東北 1 + 2
    expect(calcLeadTimeDays('大阪府')).toBe(4); // 近畿 2 + 2
    expect(calcLeadTimeDays('北海道')).toBe(4); // 北海道 2 + 2
    expect(calcLeadTimeDays('山梨県')).toBe(4); // 山梨は中部扱い 2 + 2
    expect(calcLeadTimeDays('福岡県')).toBe(5); // 九州 3 + 2
    expect(calcLeadTimeDays('沖縄県')).toBe(5); // 沖縄 3 + 2
  });

  it('未対応地域は null', () => {
    expect(calcLeadTimeDays('海外')).toBeNull();
  });

  it('MAX_LEAD_TIME_DAYS は最遠地域(九州/沖縄)と一致する', () => {
    expect(MAX_LEAD_TIME_DAYS).toBe(5);
  });
});

describe('addDaysYmd', () => {
  it('日付を加算する', () => {
    expect(addDaysYmd('2026-06-02', 3)).toBe('2026-06-05');
  });
  it('月跨ぎ', () => {
    expect(addDaysYmd('2026-06-30', 1)).toBe('2026-07-01');
  });
  it('年跨ぎ', () => {
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('うるう年', () => {
    expect(addDaysYmd('2024-02-28', 1)).toBe('2024-02-29');
  });
});

describe('isValidYmd', () => {
  it('正しい日付', () => {
    expect(isValidYmd('2026-06-02')).toBe(true);
    expect(isValidYmd('2024-02-29')).toBe(true);
  });
  it('不正な日付', () => {
    expect(isValidYmd('2026-13-01')).toBe(false);
    expect(isValidYmd('2026-02-30')).toBe(false);
    expect(isValidYmd('2026-6-2')).toBe(false);
    expect(isValidYmd('not-a-date')).toBe(false);
  });
});

describe('calcMinDeliveryYmd / calcMaxDeliveryYmd', () => {
  const from = '2026-06-02';
  it('最短お届け日（地域別）', () => {
    expect(calcMinDeliveryYmd('東京都', from)).toBe('2026-06-05'); // +3
    expect(calcMinDeliveryYmd('大阪府', from)).toBe('2026-06-06'); // +4
    expect(calcMinDeliveryYmd('福岡県', from)).toBe('2026-06-07'); // +5
  });
  it('未対応地域は null', () => {
    expect(calcMinDeliveryYmd('海外', from)).toBeNull();
  });
  it('最終選択可能日は注文日+14日', () => {
    expect(calcMaxDeliveryYmd(from)).toBe('2026-06-16');
  });
});

describe('isDeliveryDateInRange', () => {
  const from = '2026-06-02';
  it('範囲内（最短日〜+14日）は true', () => {
    expect(isDeliveryDateInRange('東京都', '2026-06-05', from)).toBe(true); // 最短日
    expect(isDeliveryDateInRange('東京都', '2026-06-16', from)).toBe(true); // 最終日
    expect(isDeliveryDateInRange('東京都', '2026-06-10', from)).toBe(true);
  });
  it('最短日より前は false', () => {
    expect(isDeliveryDateInRange('東京都', '2026-06-04', from)).toBe(false);
  });
  it('+14日より後は false', () => {
    expect(isDeliveryDateInRange('東京都', '2026-06-17', from)).toBe(false);
  });
  it('未対応地域・不正日付は false', () => {
    expect(isDeliveryDateInRange('海外', '2026-06-10', from)).toBe(false);
    expect(isDeliveryDateInRange('東京都', '2026-13-99', from)).toBe(false);
  });
});

describe('normalizePref', () => {
  it('空白を除去する', () => {
    expect(normalizePref(' 東京都 ')).toBe('東京都');
    expect(normalizePref('東京　都')).toBe('東京都');
    expect(normalizePref(null)).toBe('');
  });
});
