/**
 * お届け時間帯（佐川急便の指定枠に準拠）
 */
export const DELIVERY_TIME_SLOTS = [
  'UNSPECIFIED', // 指定なし
  'AM', // 午前中（8:00-12:00）
  'T12_14', // 12:00-14:00
  'T14_16', // 14:00-16:00
  'T16_18', // 16:00-18:00
  'T18_21', // 18:00-21:00
] as const;

export type DeliveryTimeSlot = (typeof DELIVERY_TIME_SLOTS)[number];

/** デフォルト（指定なし） */
export const DEFAULT_DELIVERY_TIME_SLOT: DeliveryTimeSlot = 'UNSPECIFIED';

/** 指定の有無判定（UNSPECIFIED は「指定なし」） */
export function isTimeSlotSpecified(
  slot: string | null | undefined
): slot is Exclude<DeliveryTimeSlot, 'UNSPECIFIED'> {
  return !!slot && slot !== 'UNSPECIFIED' && (DELIVERY_TIME_SLOTS as readonly string[]).includes(slot);
}
