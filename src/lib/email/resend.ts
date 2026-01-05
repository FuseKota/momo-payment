import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
}

export interface ShippingNotificationData {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@momomusume.com';
const FROM_NAME = 'もも娘';

export async function sendOrderConfirmationEmail(data: OrderConfirmationData) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">¥${item.subtotal.toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  const shippingAddressHtml = data.shippingAddress
    ? `
      <h3 style="color: #FF6680; margin-top: 24px;">配送先</h3>
      <p style="margin: 0;">
        〒${data.shippingAddress.postalCode}<br>
        ${data.shippingAddress.prefecture}${data.shippingAddress.city}${data.shippingAddress.address1}<br>
        ${data.shippingAddress.address2 || ''}
      </p>
    `
    : '';

  const pickupInfoHtml =
    data.orderType === 'PICKUP' && data.pickupDate
      ? `
      <h3 style="color: #FF6680; margin-top: 24px;">受取予定</h3>
      <p style="margin: 0;">
        日時: ${data.pickupDate} ${data.pickupTime || ''}
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
        <h1 style="color: #FF6680; margin: 0;">もも娘</h1>
        <p style="color: #666; margin: 8px 0 0;">ご注文ありがとうございます</p>
      </div>

      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${data.customerName} 様</p>
        <p style="margin: 0;">
          この度はもも娘をご利用いただき、誠にありがとうございます。<br>
          以下の内容でご注文を承りました。
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <h3 style="color: #FF6680; margin-top: 0;">注文情報</h3>
        <p style="margin: 0 0 8px;">
          <strong>注文番号:</strong> ${data.orderNo}<br>
          <strong>注文種別:</strong> ${data.orderType === 'SHIPPING' ? '配送' : '店頭受取'}
        </p>

        <h3 style="color: #FF6680; margin-top: 24px;">ご注文商品</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left;">商品名</th>
              <th style="padding: 8px; text-align: right;">数量</th>
              <th style="padding: 8px; text-align: right;">小計</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 16px; text-align: right; border-top: 2px solid #eee; padding-top: 16px;">
          <p style="margin: 4px 0;">商品小計: ¥${data.subtotal.toLocaleString()}</p>
          <p style="margin: 4px 0;">送料: ¥${data.shippingFee.toLocaleString()}</p>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #FF6680;">
            合計: ¥${data.total.toLocaleString()}
          </p>
        </div>

        ${shippingAddressHtml}
        ${pickupInfoHtml}
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0 0 8px;">
          ご不明な点がございましたら、お気軽にお問い合わせください。
        </p>
        <p style="margin: 0;">
          このメールは自動送信されています。返信はお受けできませんのでご了承ください。
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© もも娘</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data: result, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `【もも娘】ご注文確認 - ${data.orderNo}`,
      html,
    });

    if (error) {
      console.error('Failed to send order confirmation email:', error);
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return { success: false, error };
  }
}

export async function sendShippingNotificationEmail(data: ShippingNotificationData) {
  const trackingHtml = data.trackingNumber
    ? `
      <p style="margin: 16px 0;">
        <strong>追跡番号:</strong> ${data.trackingNumber}
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
        <h1 style="color: #FF6680; margin: 0;">もも娘</h1>
        <p style="color: #666; margin: 8px 0 0;">発送完了のお知らせ</p>
      </div>

      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${data.customerName} 様</p>
        <p style="margin: 0;">
          いつもご利用いただきありがとうございます。<br>
          ご注文いただいた商品を発送いたしました。
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>注文番号:</strong> ${data.orderNo}
        </p>
        ${trackingHtml}
        <p style="margin: 16px 0 0; color: #666;">
          商品の到着まで今しばらくお待ちください。<br>
          冷凍便でお届けの場合は、届き次第冷凍庫での保管をお願いいたします。
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0;">
          このメールは自動送信されています。返信はお受けできませんのでご了承ください。
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© もも娘</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data: result, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `【もも娘】発送完了のお知らせ - ${data.orderNo}`,
      html,
    });

    if (error) {
      console.error('Failed to send shipping notification email:', error);
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Failed to send shipping notification email:', error);
    return { success: false, error };
  }
}

export async function sendPaymentConfirmationEmail(data: {
  orderNo: string;
  customerName: string;
  customerEmail: string;
  total: number;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #FF6680; margin: 0;">もも娘</h1>
        <p style="color: #666; margin: 8px 0 0;">お支払い完了のお知らせ</p>
      </div>

      <div style="background: #FFF0F3; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px;">${data.customerName} 様</p>
        <p style="margin: 0;">
          お支払いが完了しました。ありがとうございます。
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
        <p style="margin: 0;">
          <strong>注文番号:</strong> ${data.orderNo}<br>
          <strong>お支払い金額:</strong> ¥${data.total.toLocaleString()}
        </p>
        <p style="margin: 16px 0 0; color: #666;">
          商品の発送準備が整い次第、発送完了のお知らせをお送りします。
        </p>
      </div>

      <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; font-size: 12px; color: #666;">
        <p style="margin: 0;">
          このメールは自動送信されています。返信はお受けできませんのでご了承ください。
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
        <p style="margin: 0;">© もも娘</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { data: result, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `【もも娘】お支払い完了のお知らせ - ${data.orderNo}`,
      html,
    });

    if (error) {
      console.error('Failed to send payment confirmation email:', error);
      return { success: false, error };
    }

    return { success: true, messageId: result?.id };
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    return { success: false, error };
  }
}
