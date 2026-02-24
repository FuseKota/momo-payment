/** 送料（円） */
export const SHIPPING_FEE_YEN = 1200;

/** カート内の1商品あたりの最大数量 */
export const MAX_ITEM_QUANTITY = 10;

export const statusLabels: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  RESERVED: { label: '予約済', color: 'info' },
  PENDING_PAYMENT: { label: '決済待ち', color: 'warning' },
  PAID: { label: '入金済', color: 'success' },
  PACKING: { label: '梱包中', color: 'primary' },
  SHIPPED: { label: '発送済', color: 'secondary' },
  FULFILLED: { label: '完了', color: 'default' },
  CANCELLED: { label: 'キャンセル', color: 'error' },
};
