import { describe, it, expect } from 'vitest';
import {
  esc,
  paymentStatusLabel,
  paymentMethodLabel,
  preferredSchedule,
  fullAddress,
  buildCsv,
  escapeOrPattern,
  CSV_BOM,
  EXPORT_LIMIT,
} from '../orders-csv';
import type { AdminOrderExportRow } from '@/types/database';

/**
 * AdminOrderExportRow の最小ダミーを生成する。
 * 個別ケースで上書きしたいフィールドだけ overrides で渡す。
 */
function baseRow(overrides: Partial<AdminOrderExportRow> = {}): AdminOrderExportRow {
  return {
    id: 'ord-id',
    order_no: 'ORD-001',
    order_type: 'SHIPPING',
    status: 'PAID',
    payment_method: 'STRIPE',
    temp_zone: null,
    subtotal_yen: 1000,
    shipping_fee_yen: 0,
    total_yen: 1000,
    customer_name: '山田太郎',
    customer_phone: '09012345678',
    customer_email: 'taro@example.com',
    delivery_date: null,
    delivery_time_slot: null,
    agreement_accepted: true,
    admin_note: null,
    user_id: null,
    locale: 'ja',
    paid_at: null,
    refunded_at: null,
    lookup_token: null,
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
    order_items: [],
    shipping_addresses: null,
    payments: null,
    ...overrides,
  };
}

describe('CSV_BOM / EXPORT_LIMIT', () => {
  it('CSV_BOM は UTF-8 BOM (U+FEFF) である', () => {
    expect(CSV_BOM).toBe('﻿');
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });

  it('EXPORT_LIMIT は 5000', () => {
    expect(EXPORT_LIMIT).toBe(5000);
  });
});

describe('escapeOrPattern', () => {
  it('バックスラッシュ・%・_・カンマをエスケープする', () => {
    expect(escapeOrPattern('a%b_c')).toBe('a\\%b\\_c');
    expect(escapeOrPattern('x,y')).toBe('x\\,y');
    expect(escapeOrPattern('a\\b')).toBe('a\\\\b');
  });

  it('対象文字が無ければそのまま返す', () => {
    expect(escapeOrPattern('plain')).toBe('plain');
  });
});

describe('esc', () => {
  it('通常の値を全体ダブルクオートで囲む', () => {
    expect(esc('abc')).toBe('"abc"');
  });

  it('内部のダブルクオートを2重化する', () => {
    expect(esc('a"b')).toBe('"a""b"');
    expect(esc('"')).toBe('""""');
  });

  it('カンマを含む値もクオートで保持する', () => {
    expect(esc('a,b')).toBe('"a,b"');
  });

  it('改行を含む値もクオートで保持する', () => {
    expect(esc('a\nb')).toBe('"a\nb"');
    expect(esc('a\r\nb')).toBe('"a\r\nb"');
  });

  it('CSVインジェクション対策: = で始まる値の先頭に \' を付与する', () => {
    expect(esc('=1+1')).toBe('"\'=1+1"');
  });

  it('CSVインジェクション対策: + - @ で始まる値も同様', () => {
    expect(esc('+1')).toBe('"\'+1"');
    expect(esc('-1')).toBe('"\'-1"');
    expect(esc('@cmd')).toBe('"\'@cmd"');
  });

  it('数値も文字列化してクオートする', () => {
    expect(esc(1000)).toBe('"1000"');
    expect(esc(0)).toBe('"0"');
  });

  it('null / undefined は空文字になる', () => {
    expect(esc(null)).toBe('""');
    expect(esc(undefined)).toBe('""');
  });
});

describe('paymentStatusLabel', () => {
  it('status=REFUNDED は \'返金済\'（payment_method/paid_at に依らない）', () => {
    expect(
      paymentStatusLabel({
        status: 'REFUNDED',
        paid_at: '2026-06-17T10:00:00Z',
        payment_method: 'STRIPE',
        payments: [{ status: 'SUCCEEDED' }],
      })
    ).toBe('返金済');
  });

  it('STRIPE かつ payments[0].status=SUCCEEDED → \'決済完了\'', () => {
    expect(
      paymentStatusLabel({
        status: 'PAID',
        paid_at: null,
        payment_method: 'STRIPE',
        payments: [{ status: 'SUCCEEDED' }],
      })
    ).toBe('決済完了');
  });

  it('STRIPE かつ payments[0].status=FAILED → \'決済失敗\'', () => {
    expect(
      paymentStatusLabel({
        status: 'PENDING_PAYMENT',
        paid_at: null,
        payment_method: 'STRIPE',
        payments: [{ status: 'FAILED' }],
      })
    ).toBe('決済失敗');
  });

  it('STRIPE かつ paid_at あり → SUCCEEDED でなくても \'決済完了\'', () => {
    expect(
      paymentStatusLabel({
        status: 'PAID',
        paid_at: '2026-06-17T10:00:00Z',
        payment_method: 'STRIPE',
        payments: null,
      })
    ).toBe('決済完了');
  });

  it('STRIPE で payments も paid_at も無い既定 → \'決済待ち\'', () => {
    expect(
      paymentStatusLabel({
        status: 'PENDING_PAYMENT',
        paid_at: null,
        payment_method: 'STRIPE',
        payments: null,
      })
    ).toBe('決済待ち');
  });
});

describe('paymentMethodLabel', () => {
  it('STRIPE → \'オンライン決済\'', () => {
    expect(paymentMethodLabel('STRIPE')).toBe('オンライン決済');
  });

  it('未知の値はそのまま返す', () => {
    expect(paymentMethodLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('preferredSchedule', () => {
  it('SHIPPING は delivery_date と delivery_time_slot を連結する', () => {
    expect(
      preferredSchedule(
        baseRow({
          order_type: 'SHIPPING',
          delivery_date: '2026-06-22',
          delivery_time_slot: '午前中',
        })
      )
    ).toBe('2026-06-22 午前中');
  });
});

describe('fullAddress', () => {
  it('先頭住所の pref/city/address1/address2 を連結する', () => {
    expect(
      fullAddress([
        {
          postal_code: '1000001',
          pref: '東京都',
          city: '千代田区',
          address1: '千代田1-1',
          address2: '101号室',
          recipient_name: '受取太郎',
          recipient_phone: '0312345678',
        },
      ])
    ).toBe('東京都千代田区千代田1-1101号室');
  });

  it('address2 が null なら除いて連結する', () => {
    expect(
      fullAddress([
        {
          postal_code: '1000001',
          pref: '東京都',
          city: '千代田区',
          address1: '千代田1-1',
          address2: null,
          recipient_name: '受取太郎',
          recipient_phone: '0312345678',
        },
      ])
    ).toBe('東京都千代田区千代田1-1');
  });

  it('PostgREST の one-to-one 埋め込み（単一オブジェクト）も連結する', () => {
    expect(
      fullAddress({
        postal_code: '1000001',
        pref: '東京都',
        city: '千代田区',
        address1: '千代田1-1',
        address2: '101号室',
        recipient_name: '受取太郎',
        recipient_phone: '0312345678',
      })
    ).toBe('東京都千代田区千代田1-1101号室');
  });

  it('null / 空配列なら空文字を返す', () => {
    expect(fullAddress(null)).toBe('');
    expect(fullAddress([])).toBe('');
  });
});

describe('buildCsv', () => {
  it('行数=ヘッダ1行＋データ行で、区切りは CRLF', () => {
    const csv = buildCsv([baseRow(), baseRow()]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    // ヘッダ先頭セル
    expect(lines[0].startsWith('"注文番号"')).toBe(true);
  });

  it('ヘッダは全16列を含む', () => {
    const csv = buildCsv([]);
    const header = csv.split('\r\n')[0];
    expect(header).toBe(
      [
        '注文番号',
        '注文日時',
        '種別',
        'ステータス',
        '顧客名',
        'メール',
        '電話',
        '金額(円)',
        '決済方法',
        '決済状況',
        '受取or配送希望',
        '配送先郵便番号',
        '配送先住所',
        '配送先氏名',
        '配送先電話',
        '購入商品',
      ]
        .map((h) => `"${h}"`)
        .join(',')
    );
  });

  it('BOM を含まない（buildCsv は BOM 無し）', () => {
    const csv = buildCsv([baseRow()]);
    expect(csv.startsWith(CSV_BOM)).toBe(false);
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('SHIPPING は種別が \'配送\' で配送先住所が連結される', () => {
    const csv = buildCsv([
      baseRow({
        order_type: 'SHIPPING',
        shipping_addresses: [
          {
            postal_code: '1000001',
            pref: '東京都',
            city: '千代田区',
            address1: '千代田1-1',
            address2: null,
            recipient_name: '受取太郎',
            recipient_phone: '0312345678',
          },
        ],
      }),
    ]);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine).toContain('"配送"');
    expect(dataLine).toContain('"東京都千代田区千代田1-1"');
    expect(dataLine).toContain('"1000001"');
    expect(dataLine).toContain('"受取太郎"');
  });

  it('shipping_addresses が単一オブジェクト（実 PostgREST 形状）でも住所列が出力される', () => {
    const csv = buildCsv([
      baseRow({
        order_type: 'SHIPPING',
        // PostgREST は UNIQUE FK を one-to-one と判定し配列ではなくオブジェクトを返す
        shipping_addresses: {
          postal_code: '5300001',
          pref: '大阪府',
          city: '大阪市北区',
          address1: '梅田1-1',
          address2: null,
          recipient_name: '受取花子',
          recipient_phone: '0612345678',
        },
      }),
    ]);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine).toContain('"大阪府大阪市北区梅田1-1"');
    expect(dataLine).toContain('"5300001"');
    expect(dataLine).toContain('"受取花子"');
    expect(dataLine).toContain('"0612345678"');
  });

  it('order_items は \'商品×数量 / ...\' 形式で連結する', () => {
    const csv = buildCsv([
      baseRow({
        order_items: [
          { product_name: '餃子', qty: 2 },
          { product_name: '小籠包', qty: 3 },
        ],
      }),
    ]);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine).toContain('"餃子×2 / 小籠包×3"');
  });

  it('ステータスは statusLabels でラベル化される（PAID → 入金済）', () => {
    const csv = buildCsv([baseRow({ status: 'PAID' })]);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine).toContain('"入金済"');
  });

  it('customer_email が null なら空セルになる', () => {
    const csv = buildCsv([baseRow({ customer_email: null })]);
    const cells = csv.split('\r\n')[1].split(',');
    // メールは6列目（index 5）
    expect(cells[5]).toBe('""');
  });
});
