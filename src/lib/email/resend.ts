import { Resend } from 'resend';
import { env } from '@/lib/env';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import jaMessages from '../../../messages/ja.json';
import zhTwMessages from '../../../messages/zh-tw.json';

const resend = new Resend(env.RESEND_API_KEY);

type Messages = typeof jaMessages;

function getMessages(locale: string): Messages {
  return locale === 'zh-tw' ? zhTwMessages : jaMessages;
}

export interface OrderConfirmationData {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  orderType: 'SHIPPING' | 'PICKUP';
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
  pickupDate?: string;
  pickupTime?: string;
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

export async function sendOrderConfirmationEmail(data: OrderConfirmationData) {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;
  const fromName = e.brandName;

  const itemsHtml = data.items
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

  const shippingAddressHtml = data.shippingAddress
    ? `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.shippingDestination}</h3>
      <p style="margin: 0;">
        〒${escapeHtml(data.shippingAddress.postalCode)}<br>
        ${escapeHtml(data.shippingAddress.prefecture)}${escapeHtml(data.shippingAddress.city)}${escapeHtml(data.shippingAddress.address1)}<br>
        ${data.shippingAddress.address2 ? escapeHtml(data.shippingAddress.address2) : ''}
      </p>
    `
    : '';

  const pickupInfoHtml =
    data.orderType === 'PICKUP' && data.pickupDate
      ? `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.pickupSchedule}</h3>
      <p style="margin: 0;">
        ${e.dateTime} ${escapeHtml(data.pickupDate || '')} ${escapeHtml(data.pickupTime || '')}
      </p>
    `
      : '';

  const deliverySlotLabel =
    data.deliveryTimeSlot && data.deliveryTimeSlot !== 'UNSPECIFIED'
      ? (m.common.timeSlots as Record<string, string>)[data.deliveryTimeSlot] ?? ''
      : '';
  const deliveryScheduleHtml =
    data.orderType === 'SHIPPING' && (data.deliveryDate || deliverySlotLabel)
      ? `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.deliverySchedule}</h3>
      <p style="margin: 0;">
        ${escapeHtml(data.deliveryDate || '')} ${escapeHtml(deliverySlotLabel)}
      </p>
    `
      : '';

  const orderTypeLabel = data.orderType === 'SHIPPING' ? e.orderTypeShipping : e.orderTypePickup;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${e.brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${e.orderConfirmGreeting}</p>
      </div>

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
          <strong>${e.orderType}</strong> ${orderTypeLabel}
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
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 16px; text-align: right; border-top: 2px solid #eee; padding-top: 16px;">
          <p style="margin: 4px 0;">${e.subtotal} ¥${data.subtotal.toLocaleString()}</p>
          <p style="margin: 4px 0;">${e.shippingFee} ¥${data.shippingFee.toLocaleString()}</p>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #FF6680;">
            ${e.total} ¥${data.total.toLocaleString()}
          </p>
        </div>

        ${shippingAddressHtml}
        ${deliveryScheduleHtml}
        ${pickupInfoHtml}
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 8px;">
          ${e.contactNotice}
        </p>
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${e.brandName}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const subject = e.orderConfirmSubject.replace('{orderNo}', data.orderNo);
    const { data: result, error } = await resend.emails.send({
      from: `${fromName} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      secureLog('error', 'Failed to send order confirmation email', safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', 'Failed to send order confirmation email', safeErrorLog(error));
    return { success: false, error };
  }
}

export async function sendShippingNotificationEmail(data: ShippingNotificationData) {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;
  const fromName = e.brandName;

  const trackingHtml = data.trackingNumber
    ? `
      <p style="margin: 16px 0;">
        <strong>${e.trackingNo}</strong> ${data.trackingNumber}
      </p>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${e.brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${e.shippingGreeting}</p>
      </div>

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

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${e.brandName}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const subject = e.shippingSubject.replace('{orderNo}', data.orderNo);
    const { data: result, error } = await resend.emails.send({
      from: `${fromName} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      secureLog('error', 'Failed to send shipping notification email', safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', 'Failed to send shipping notification email', safeErrorLog(error));
    return { success: false, error };
  }
}

export async function sendPaymentConfirmationEmail(data: {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  total: number;
  locale?: string;
}) {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;
  const fromName = e.brandName;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${e.brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${e.paymentGreeting}</p>
      </div>

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

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${e.brandName}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const subject = e.paymentSubject.replace('{orderNo}', data.orderNo);
    const { data: result, error } = await resend.emails.send({
      from: `${fromName} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      secureLog('error', 'Failed to send payment confirmation email', safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', 'Failed to send payment confirmation email', safeErrorLog(error));
    return { success: false, error };
  }
}

/**
 * 店頭払いの入金確認メール（顧客向け）
 * 管理者が mark-paid で現地での支払いを確認した際に送信する。
 * オンライン決済の sendPaymentConfirmationEmail とは文面が異なる（発送案内なし）。
 */
export async function sendPickupPaymentReceivedEmail(data: {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  total: number;
  locale?: string;
}) {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;
  const fromName = e.brandName;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${e.brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${e.pickupPaidGreeting}</p>
      </div>

      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${e.orderConfirmHonorific.replace('{name}', escapeHtml(data.customerName))}</p>
        <p style="margin: 0;">
          ${e.pickupPaidMessage.replace(/\n/g, '<br>')}
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>${e.orderNo}</strong> ${data.orderNo}<br>
          <strong>${e.paymentAmount}</strong> ¥${data.total.toLocaleString()}
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0;">
          ${e.autoSendNotice}
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${e.brandName}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const subject = e.pickupPaidSubject.replace('{orderNo}', data.orderNo);
    const { data: result, error } = await resend.emails.send({
      from: `${fromName} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      secureLog('error', 'Failed to send pickup payment received email', safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', 'Failed to send pickup payment received email', safeErrorLog(error));
    return { success: false, error };
  }
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
}) {
  const m = getMessages(data.locale || 'ja');
  const e = m.email;
  const fromName = e.brandName;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${e.brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${e.cancelGreeting}</p>
      </div>

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

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${e.brandName}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const subject = e.cancelSubject.replace('{orderNo}', data.orderNo);
    const { data: result, error } = await resend.emails.send({
      from: `${fromName} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      html,
    });

    if (error) {
      secureLog('error', 'Failed to send order cancellation email', safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', 'Failed to send order cancellation email', safeErrorLog(error));
    return { success: false, error };
  }
}

export interface AdminNewOrderData {
  orderId: string;
  orderNo: string;
  orderType: 'SHIPPING' | 'PICKUP';
  paymentMethod: 'STRIPE' | 'PAY_AT_PICKUP';
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
  pickupDate?: string | null;
  pickupTime?: string | null;
  deliveryDate?: string | null;
  deliveryTimeSlot?: string | null;
}

/**
 * 新規注文の管理者向け通知メール（ADMIN_EMAIL 宛）
 * 注文が確定したタイミング（店頭払い=作成時 / Stripe=決済成功時）に送信する。
 * 文面は店舗運営者向けのため日本語固定。ADMIN_EMAIL 未設定時はスキップ。
 */
export async function sendAdminNewOrderEmail(data: AdminNewOrderData) {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    secureLog('warn', 'ADMIN_EMAIL not configured, skipping admin new-order notification');
    return { success: false, skipped: true };
  }

  const m = getMessages('ja');
  const e = m.email;
  const fromName = e.brandName;

  const orderTypeLabel = data.orderType === 'SHIPPING' ? e.orderTypeShipping : e.orderTypePickup;
  const paymentLabel =
    data.paymentMethod === 'PAY_AT_PICKUP' ? e.adminPaymentOnSite : e.adminPaymentStripe;

  const itemsHtml = data.items
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

  const shippingAddressHtml = data.shippingAddress
    ? `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.shippingDestination}</h3>
      <p style="margin: 0;">
        〒${escapeHtml(data.shippingAddress.postalCode)}<br>
        ${escapeHtml(data.shippingAddress.prefecture)}${escapeHtml(data.shippingAddress.city)}${escapeHtml(data.shippingAddress.address1)}<br>
        ${data.shippingAddress.address2 ? escapeHtml(data.shippingAddress.address2) : ''}
      </p>
    `
    : '';

  const pickupInfoHtml =
    data.orderType === 'PICKUP' && data.pickupDate
      ? `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.pickupSchedule}</h3>
      <p style="margin: 0;">
        ${e.dateTime} ${escapeHtml(data.pickupDate || '')} ${escapeHtml(data.pickupTime || '')}
      </p>
    `
      : '';

  const deliverySlotLabel =
    data.deliveryTimeSlot && data.deliveryTimeSlot !== 'UNSPECIFIED'
      ? (m.common.timeSlots as Record<string, string>)[data.deliveryTimeSlot] ?? ''
      : '';
  const deliveryScheduleHtml =
    data.orderType === 'SHIPPING' && (data.deliveryDate || deliverySlotLabel)
      ? `
      <h3 style="color: #FF6680; margin-top: 24px;">${e.deliverySchedule}</h3>
      <p style="margin: 0;">
        ${escapeHtml(data.deliveryDate || '')} ${escapeHtml(deliverySlotLabel)}
      </p>
    `
      : '';

  const dashboardUrl = `${env.NEXT_PUBLIC_APP_URL}/admin/orders/${data.orderId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">${e.brandName}</h1>
        <p style="color: #666; margin: 8px 0 0;">${e.adminNewOrderGreeting}</p>
      </div>

      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0;">${e.adminNewOrderMessage}</p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <h3 style="color: #FF6680; margin-top: 0;">${e.orderInfo}</h3>
        <p style="margin: 0 0 8px;">
          <strong>${e.orderNo}</strong> ${data.orderNo}<br>
          <strong>${e.orderType}</strong> ${orderTypeLabel}<br>
          <strong>${e.adminPaymentMethod}</strong> ${paymentLabel}
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
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 16px; text-align: right; border-top: 2px solid #eee; padding-top: 16px;">
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #FF6680;">
            ${e.total} ¥${data.total.toLocaleString()}
          </p>
        </div>

        ${shippingAddressHtml}
        ${deliveryScheduleHtml}
        ${pickupInfoHtml}
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: #FF6680; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold;">
          ${e.adminViewInDashboard}
        </a>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© ${e.brandName}</p>
      </div>
    </body>
    </html>
  `;

  try {
    const subject = e.adminNewOrderSubject
      .replace('{orderNo}', data.orderNo)
      .replace('{orderType}', orderTypeLabel);
    const { data: result, error } = await resend.emails.send({
      from: `${fromName} <${FROM_EMAIL}>`,
      to: adminEmail,
      subject,
      html,
    });

    if (error) {
      secureLog('error', 'Failed to send admin new-order email', safeErrorLog(error));
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    secureLog('error', 'Failed to send admin new-order email', safeErrorLog(error));
    return { success: false, error };
  }
}
