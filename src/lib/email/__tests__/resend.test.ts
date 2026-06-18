import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * メール送信（resend.ts）の単体テスト。
 * Resend SDK と env をモックし、各テンプレートが正しい宛先・件名・本文を生成することを検証する。
 * 共通レイアウト/送信ヘルパーへのリファクタの安全網も兼ねる。
 */

const mockSend = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'noreply@test.com',
    ADMIN_EMAIL: 'admin@test.com',
    NEXT_PUBLIC_APP_URL: 'https://shop.example.com',
  },
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendPaymentConfirmationEmail,
  sendOrderCancellationEmail,
  sendRefundNotificationEmail,
  sendAdminNewOrderEmail,
} from '@/lib/email/resend';

function lastCall() {
  return mockSend.mock.calls[mockSend.mock.calls.length - 1][0] as {
    from: string;
    to: string;
    subject: string;
    html: string;
  };
}

describe('email/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
  });

  it('sendOrderConfirmationEmail: 宛先/件名/本文に注文情報を含む', async () => {
    const res = await sendOrderConfirmationEmail({
      orderNo: 'ORD-001',
      customerName: '山田<太郎>',
      customerEmail: 'taro@example.com',
      orderType: 'SHIPPING',
      items: [{ name: '冷凍餃子', qty: 2, unitPrice: 500, subtotal: 1000 }],
      subtotal: 1000,
      shippingFee: 1200,
      total: 2200,
      shippingAddress: {
        postalCode: '1000001',
        prefecture: '東京都',
        city: '千代田区',
        address1: '千代田1-1',
      },
      locale: 'ja',
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBe('msg_1');
    const sent = lastCall();
    expect(sent.to).toBe('taro@example.com');
    expect(sent.from).toContain('noreply@test.com');
    expect(sent.subject).toContain('ORD-001');
    expect(sent.html).toContain('ORD-001');
    expect(sent.html).toContain('冷凍餃子');
    expect(sent.html).toContain('東京都');
    // 顧客名はHTMLエスケープされる
    expect(sent.html).toContain('山田&lt;太郎&gt;');
    expect(sent.html).not.toContain('山田<太郎>');
  });

  it('sendShippingNotificationEmail: 追跡番号を含む', async () => {
    await sendShippingNotificationEmail({
      orderNo: 'ORD-002',
      customerName: '佐藤花子',
      customerEmail: 'hanako@example.com',
      trackingNumber: '1234-5678-9012',
      locale: 'ja',
    });
    const sent = lastCall();
    expect(sent.to).toBe('hanako@example.com');
    expect(sent.html).toContain('1234-5678-9012');
  });

  it('sendPaymentConfirmationEmail: 金額を含む', async () => {
    await sendPaymentConfirmationEmail({
      orderNo: 'ORD-003',
      customerName: 'テスト',
      customerEmail: 't@example.com',
      total: 3300,
      locale: 'ja',
    });
    const sent = lastCall();
    expect(sent.subject).toContain('ORD-003');
    expect(sent.html).toContain('3,300');
  });

  it('sendOrderCancellationEmail: 注文番号を含む', async () => {
    await sendOrderCancellationEmail({
      orderNo: 'ORD-004',
      customerName: 'テスト',
      customerEmail: 't@example.com',
      locale: 'ja',
    });
    expect(lastCall().html).toContain('ORD-004');
  });

  it('sendRefundNotificationEmail: 返金額を含む', async () => {
    await sendRefundNotificationEmail({
      orderNo: 'ORD-005',
      customerName: 'テスト',
      customerEmail: 't@example.com',
      total: 5500,
      locale: 'ja',
    });
    expect(lastCall().html).toContain('5,500');
  });

  it('sendAdminNewOrderEmail: 管理者宛・顧客連絡先・ダッシュボードリンクを含む', async () => {
    const res = await sendAdminNewOrderEmail({
      orderId: 'order-uuid-1',
      orderNo: 'ORD-006',
      orderType: 'SHIPPING',
      paymentMethod: 'STRIPE',
      customerName: '田中',
      customerPhone: '09012345678',
      customerEmail: 'tanaka@example.com',
      items: [{ name: 'グッズ', qty: 1, subtotal: 800 }],
      total: 800,
    });
    expect(res.success).toBe(true);
    const sent = lastCall();
    expect(sent.to).toBe('admin@test.com');
    expect(sent.html).toContain('09012345678');
    expect(sent.html).toContain('https://shop.example.com/admin/orders/order-uuid-1');
  });

  it('zh-tw ロケールでも送信できる', async () => {
    await sendPaymentConfirmationEmail({
      orderNo: 'ORD-007',
      customerName: '客戶',
      customerEmail: 'c@example.com',
      total: 1000,
      locale: 'zh-tw',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(lastCall().to).toBe('c@example.com');
  });

  it('Resend がエラーを返したら success:false', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await sendPaymentConfirmationEmail({
      orderNo: 'ORD-008',
      customerName: 'テスト',
      customerEmail: 't@example.com',
      total: 100,
      locale: 'ja',
    });
    expect(res.success).toBe(false);
    expect(res.error).toEqual({ message: 'boom' });
  });

  it('send が throw しても success:false', async () => {
    mockSend.mockRejectedValue(new Error('network'));
    const res = await sendPaymentConfirmationEmail({
      orderNo: 'ORD-009',
      customerName: 'テスト',
      customerEmail: 't@example.com',
      total: 100,
      locale: 'ja',
    });
    expect(res.success).toBe(false);
  });
});
