// 正規表現は client/server で共用する単一ソースから取得（後方互換のため再エクスポートも維持）
import { EMAIL_REGEX, PHONE_REGEX, POSTAL_CODE_REGEX } from '@/lib/validation/patterns';
export { EMAIL_REGEX, PHONE_REGEX, POSTAL_CODE_REGEX };

interface CustomerFields {
  name: string;
  email: string;
  phone: string;
}

/**
 * 顧客情報（名前・メール・電話番号）の共通バリデーション
 * @param form - フォーム値
 * @param getErrorMessage - エラーメッセージ取得関数（i18n キーに対応）
 * @returns エラーがあればフィールド名→メッセージのマップ
 */
export function validateCustomerFields(
  form: CustomerFields,
  getErrorMessage: (key: string) => string
): Partial<Record<keyof CustomerFields, string>> {
  const errors: Partial<Record<keyof CustomerFields, string>> = {};

  if (!form.name.trim()) errors.name = getErrorMessage('nameRequired');
  if (!form.email.trim()) {
    errors.email = getErrorMessage('emailRequired');
  } else if (!EMAIL_REGEX.test(form.email)) {
    errors.email = getErrorMessage('emailInvalid');
  }
  if (!form.phone.trim()) {
    errors.phone = getErrorMessage('phoneRequired');
  } else if (!PHONE_REGEX.test(form.phone)) {
    errors.phone = getErrorMessage('phoneInvalid');
  }

  return errors;
}

interface AddressFields {
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
}

/**
 * 住所フィールドの共通バリデーション
 */
export function validateAddressFields(
  form: AddressFields,
  getErrorMessage: (key: string) => string
): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};

  if (!form.postalCode.trim()) {
    errors.postalCode = getErrorMessage('postalCodeRequired');
  } else if (!POSTAL_CODE_REGEX.test(form.postalCode)) {
    errors.postalCode = getErrorMessage('postalCodeInvalid');
  }
  if (!form.prefecture.trim()) errors.prefecture = getErrorMessage('prefectureRequired');
  if (!form.city.trim()) errors.city = getErrorMessage('cityRequired');
  if (!form.address1.trim()) errors.address1 = getErrorMessage('address1Required');

  return errors;
}
