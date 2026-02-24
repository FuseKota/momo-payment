export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^0[0-9\-]{9,13}$/;
export const POSTAL_CODE_REGEX = /^\d{3}-?\d{4}$/;

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
