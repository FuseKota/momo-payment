import { Resend } from 'resend';
import { env } from '@/lib/env';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import jaMessages from '../../../messages/ja.json';
import zhTwMessages from '../../../messages/zh-tw.json';
import enMessages from '../../../messages/en.json';

const resend = new Resend(env.RESEND_API_KEY);

type Messages = typeof jaMessages;

function getMessages(locale: string): Messages {
  if (locale === 'zh-tw') return zhTwMessages;
  if (locale === 'en') return enMessages;
  return jaMessages;
}

// 本番では env.EMAIL_FROM 必須（env.ts で検証）。以下は開発時のフォールバック。
const FROM_EMAIL = env.EMAIL_FROM || 'info@sakura-sisters.com';

/** ユーザー入力値をHTMLテンプレートに挿入する前にエスケープ */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * 全メール共通の HTML 外枠（DOCTYPE / ヘッダ（ブランド名＋挨拶）/ フッタ）。
 * 各テンプレートは中身（innerHtml）のみを組み立てて渡す。
 */
function emailLayout(brandName: string, greeting: string, innerHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${greeting}</p>
      </div>
${innerHtml}
      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${brandName}</p>
      </div>
    </body>
    </html>
  `;
}

type SendResult = { success: boolean; messageId?: string; error?: unknown; skipped?: boolean };

/** Resend 送信 + 共通エラーハンドリング。errorLabel は失敗ログ用。 */
async function sendEmail(opts: {
  brandName: string;
  to: string;
  subject: string;
  html: string;
  errorLabel: string;
}): Promise<SendResult> {
  try {
    const { data: result, error } = await resend.emails.send({
      from: `${opts.brandName} <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      secureLog('error', opts.errorLabel, safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', opts.errorLabel, safeErrorLog(error));
    return { success: false, error };
  }
}

/** 注文明細テーブルの行 HTML を生成（顧客確認 / 管理者通知で共用） */
function renderItemsRows(items: Array<{ name: string; qty: number; subtotal: number }>): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">¥${item.subtotal.toLocaleString()}</td>
      </tr>
    `
    )
    .join('');
}

/** 配送先住所ブロック HTML（顧客確認 / 管理者通知で共用） */
function renderShippingAddress(
  e: Messages['email'],
  address?: {
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2?: string | null;
  }
): string {
  if (!address) return '';
  return `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.shippingDestination}</h3>
      <p style="margin: 0;">
        〒${escapeHtml(address.postalCode)}<br>
        ${escapeHtml(address.prefecture)}${escapeHtml(address.city)}${escapeHtml(address.address1)}<br>
        ${address.address2 ? escapeHtml(address.address2) : ''}
      </p>
    `;
}

/** 配送希望日時ブロック HTML（顧客確認 / 管理者通知で共用） */
function renderDeliverySchedule(
  m: Messages,
  deliveryDate?: string | null,
  deliveryTimeSlot?: string | null
): string {
  const e = m.email;
  const slotLabel =
    deliveryTimeSlot && deliveryTimeSlot !== 'UNSPECIFIED'
      ? (m.common.timeSlots as Record<string, string>)[deliveryTimeSlot] ?? ''
      : '';
  if (!deliveryDate && !slotLabel) return '';
  return `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.deliverySchedule}</h3>
      <p style="margin: 0;">
        ${escapeHtml(deliveryDate || '')} ${escapeHtml(slotLabel)}
      </p>
    `;
}

export interface OrderConfirmationData {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  orderType: 'SHIPPING';
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingAddress?: {
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2?: string;
  };
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  locale?: string;
}

export interface ShippingNotificationData {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  locale?: string;
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<SendResult> {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;

  const inner = `
      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${e.orderConfirmHonorific.replace('{name}', escapeHtml(data.customerName))}</p>
        <p style="margin: 0;">
          ${e.orderConfirmMessage.replace(/\n/g, '<br>')}
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <h3 style="color: #FF6680; margin-top: 0;">${e.orderInfo}</h3>
        <p style="margin: 0 0 8px;">
          <strong>${e.orderNo}</strong> ${data.orderNo}<br>
          <strong>${e.orderType}</strong> ${e.orderTypeShipping}
        </p>

        <h3 style="color: #FF6680; margin-top: 24px;">${e.orderedItems}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left;">${e.productName}</th>
              <th style="padding: 8px; text-align: right;">${e.qty}</th>
              <th style="padding: 8px; text-align: right;">${e.lineSubtotal}</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemsRows(data.items)}
          </tbody>
        </table>

        <div style="margin-top: 16px; text-align: right; border-top: 2px solid #eee; padding-top: 16px;">
          <p style="margin: 4px 0;">${e.subtotal} ¥${data.subtotal.toLocaleString()}</p>
          <p style="margin: 4px 0;">${e.shippingFee} ¥${data.shippingFee.toLocaleString()}</p>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #FF6680;">
            ${e.total} ¥${data.total.toLocaleString()}
          </p>
        </div>

        ${renderShippingAddress(e, data.shippingAddress)}
        ${renderDeliverySchedule(m, data.deliveryDate, data.deliveryTimeSlot)}
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 8px;">
          ${e.contactNotice}
        </p>
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>
`;

  return sendEmail({
    brandName: e.brandName,
    to: data.customerEmail,
    subject: e.orderConfirmSubject.replace('{orderNo}', data.orderNo),
    html: emailLayout(e.brandName, e.orderConfirmGreeting, inner),
    errorLabel: 'Failed to send order confirmation email',
  });
}

export async function sendShippingNotificationEmail(data: ShippingNotificationData): Promise<SendResult> {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;

  const trackingHtml = data.trackingNumber
    ? `
        <p style="margin: 16px 0;">
          <strong>${e.trackingNo}</strong> ${data.trackingNumber}
        </p>
      `
    : '';

  const inner = `
      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${e.orderConfirmHonorific.replace('{name}', escapeHtml(data.customerName))}</p>
        <p style="margin: 0;">
          ${e.shippingThankYou.replace(/\n/g, '<br>')}
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>${e.orderNo}</strong> ${data.orderNo}
        </p>
        ${trackingHtml}
        <p style="margin: 16px 0 0; color: #666;">
          ${e.shippingWaitNotice.replace(/\n/g, '<br>')}
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>
`;

  return sendEmail({
    brandName: e.brandName,
    to: data.customerEmail,
    subject: e.shippingSubject.replace('{orderNo}', data.orderNo),
    html: emailLayout(e.brandName, e.shippingGreeting, inner),
    errorLabel: 'Failed to send shipping notification email',
  });
}

export async function sendPaymentConfirmationEmail(data: {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  total: number;
  locale?: string;
}): Promise<SendResult> {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;

  const inner = `
      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${e.orderConfirmHonorific.replace('{name}', escapeHtml(data.customerName))}</p>
        <p style="margin: 0;">
          ${e.paymentCompleteMessage}
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>${e.orderNo}</strong> ${data.orderNo}<br>
          <strong>${e.paymentAmount}</strong> ¥${data.total.toLocaleString()}
        </p>
        <p style="margin: 16px 0 0; color: #666;">
          ${e.paymentShipNotice}
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>
`;

  return sendEmail({
    brandName: e.brandName,
    to: data.customerEmail,
    subject: e.paymentSubject.replace('{orderNo}', data.orderNo),
    html: emailLayout(e.brandName, e.paymentGreeting, inner),
    errorLabel: 'Failed to send payment confirmation email',
  });
}

/**
 * 注文キャンセル通知メール（顧客向け）
 * Stripe Checkout セッションの期限切れで注文が CANCELED になった際に送信する。
 */
export async function sendOrderCancellationEmail(data: {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  locale?: string;
}): Promise<SendResult> {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;

  const inner = `
      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${e.orderConfirmHonorific.replace('{name}', escapeHtml(data.customerName))}</p>
        <p style="margin: 0;">
          ${e.cancelMessage.replace(/\n/g, '<br>')}
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>${e.orderNo}</strong> ${data.orderNo}
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 8px;">
          ${e.contactNotice}
        </p>
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>
`;

  return sendEmail({
    brandName: e.brandName,
    to: data.customerEmail,
    subject: e.cancelSubject.replace('{orderNo}', data.orderNo),
    html: emailLayout(e.brandName, e.cancelGreeting, inner),
    errorLabel: 'Failed to send order cancellation email',
  });
}

/**
 * 返金通知メール（顧客向け）
 * 管理者が注文を全額返金した際に送信する。
 * ステータスは送信前に確定済みのため、送信失敗は呼び出し側でログのみ扱う。
 */
export async function sendRefundNotificationEmail(data: {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  total: number;
  locale?: string;
}): Promise<SendResult> {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;

  const inner = `
      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${e.orderConfirmHonorific.replace('{name}', escapeHtml(data.customerName))}</p>
        <p style="margin: 0;">
          ${e.refundMessage.replace(/\n/g, '<br>')}
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>${e.orderNo}</strong> ${data.orderNo}<br>
          <strong>${e.paymentAmount}</strong> ¥${data.total.toLocaleString()}
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 8px;">
          ${e.contactNotice}
        </p>
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>
`;

  return sendEmail({
    brandName: e.brandName,
    to: data.customerEmail,
    subject: e.refundSubject.replace('{orderNo}', data.orderNo),
    html: emailLayout(e.brandName, e.refundGreeting, inner),
    errorLabel: 'Failed to send refund notification email',
  });
}

export interface AdminNewOrderData {
  orderId: string;
  orderNo: string;
  orderType: 'SHIPPING';
  paymentMethod: 'STRIPE';
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  items: Array<{ name: string; qty: number; subtotal: number }>;
  total: number;
  shippingAddress?: {
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2?: string | null;
  };
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
}

/**
 * 新規注文の管理者向け通知メール（ADMIN_EMAIL 宛）
 * Stripe 決済成功時に送信する。
 * 文面は店舗運営者向けのため日本語固定。ADMIN_EMAIL 未設定時はスキップ。
 */
export async function sendAdminNewOrderEmail(data: AdminNewOrderData): Promise<SendResult> {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    secureLog('warn', 'ADMIN_EMAIL not configured, skipping admin new-order notification');
    return { success: false, skipped: true };
  }

  const m = getMessages('ja');
  const e = m.email;
  const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL}/admin/orders/${data.orderId}`;

  const inner = `
      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0;">${e.adminNewOrderMessage}</p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <h3 style="color: #FF6680; margin-top: 0;">${e.orderInfo}</h3>
        <p style="margin: 0 0 8px;">
          <strong>${e.orderNo}</strong> ${data.orderNo}<br>
          <strong>${e.orderType}</strong> ${e.orderTypeShipping}<br>
          <strong>${e.adminPaymentMethod}</strong> ${e.adminPaymentStripe}
        </p>

        <h3 style="color: #FF6680; margin-top: 24px;">${e.adminCustomerInfo}</h3>
        <p style="margin: 0 0 8px;">
          <strong>${e.adminCustomerName}</strong> ${escapeHtml(data.customerName)}<br>
          <strong>${e.adminCustomerPhone}</strong> ${escapeHtml(data.customerPhone)}<br>
          ${data.customerEmail ? `<strong>${e.adminCustomerEmail}</strong> ${escapeHtml(data.customerEmail)}` : ''}
        </p>

        <h3 style="color: #FF6680; margin-top: 24px;">${e.orderedItems}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left;">${e.productName}</th>
              <th style="padding: 8px; text-align: right;">${e.qty}</th>
              <th style="padding: 8px; text-align: right;">${e.lineSubtotal}</th>
            </tr>
          </thead>
          <tbody>
            ${renderItemsRows(data.items)}
          </tbody>
        </table>

        <div style="margin-top: 16px; text-align: right; border-top: 2px solid #eee; padding-top: 16px;">
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #FF6680;">
            ${e.total} ¥${data.total.toLocaleString()}
          </p>
        </div>

        ${renderShippingAddress(e, data.shippingAddress)}
        ${renderDeliverySchedule(m, data.deliveryDate, data.deliveryTimeSlot)}
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: #FF6680; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold;">
          ${e.adminViewInDashboard}
        </a>
      </div>
`;

  return sendEmail({
    brandName: e.brandName,
    to: adminEmail,
    subject: e.adminNewOrderSubject
      .replace('{orderNo}', data.orderNo)
      .replace('{orderType}', e.orderTypeShipping),
    html: emailLayout(e.brandName, e.adminNewOrderGreeting, inner),
    errorLabel: 'Failed to send admin new-order email',
  });
}
