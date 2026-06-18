/**
 * 注文CSVエクスポート用の純関数群。
 *
 * Next.js の route.ts は HTTP メソッド等の限られた名前以外を export できないため、
 * テスト可能なヘルパーはこのファイルに切り出して route から import する。
 */

import { statusLabels } from '@/lib/utils/constants';
import type { AdminOrderExportRow } from '@/types/database';

/** CSV エクスポートの安全上限（全件取得時の暴発を防ぐ） */
export const EXPORT_LIMIT = 5000;

/** UTF-8 BOM（Excel での文字化け防止） */
export const CSV_BOM = '﻿';

/**
 * Supabase の .or() に渡す ilike パターン用エスケープ。
 * GET /api/admin/orders と同一ロジック。
 */
export function escapeOrPattern(value: string): string {
  return value.replace(/[\\%_,]/g, (ch) => `\\${ch}`);
}

/**
 * CSV セルのエスケープ。
 * - ダブルクオートは2重化し、全体をダブルクオートで囲む
 * - CSVインジェクション対策: =,+,-,@ で始まる値の先頭に ' を付与
 */
export function esc(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // CSV インジェクション対策（数式評価の無効化）
  if (/^[=+\-@]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * payment_status はDB列が無いため、注文/決済状態から表示用ラベルを導出する。
 */
export function paymentStatusLabel(o: {
  status: string;
  paid_at: string | null;
  payment_method: string;
  payments: { status: string }[] | null;
}): string {
  if (o.status === 'REFUNDED') return '返金済';
  const paymentStatus = o.payments?.[0]?.status;
  if (paymentStatus === 'SUCCEEDED' || o.paid_at) return '決済完了';
  if (paymentStatus === 'FAILED') return '決済失敗';
  return '決済待ち';
}

/** 決済方法の表示ラベル */
export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'STRIPE':
      return 'オンライン決済';
    default:
      return method;
  }
}

/** 配送希望日時 */
export function preferredSchedule(o: AdminOrderExportRow): string {
  return [o.delivery_date, o.delivery_time_slot].filter(Boolean).join(' ');
}

/** 配送先住所を1セルに結合 */
export function fullAddress(addr: AdminOrderExportRow['shipping_addresses']): string {
  const a = addr?.[0];
  if (!a) return '';
  return [a.pref, a.city, a.address1, a.address2].filter(Boolean).join('');
}

/**
 * 注文配列から CSV 文字列を生成する純関数（BOM は含まない）。
 * 区切りは CRLF。
 */
export function buildCsv(rows: AdminOrderExportRow[]): string {
  const header = [
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
  ];

  const lines: string[] = [header.map(esc).join(',')];

  for (const o of rows) {
    const addr = o.shipping_addresses?.[0];
    const items = (o.order_items ?? [])
      .map((it) => `${it.product_name}×${it.qty}`)
      .join(' / ');

    const row = [
      o.order_no,
      o.created_at,
      '配送',
      statusLabels[o.status]?.label ?? o.status,
      o.customer_name,
      o.customer_email ?? '',
      o.customer_phone,
      o.total_yen,
      paymentMethodLabel(o.payment_method),
      paymentStatusLabel(o),
      preferredSchedule(o),
      addr?.postal_code ?? '',
      fullAddress(o.shipping_addresses),
      addr?.recipient_name ?? '',
      addr?.recipient_phone ?? '',
      items,
    ];
    lines.push(row.map(esc).join(','));
  }

  return lines.join('\r\n');
}
