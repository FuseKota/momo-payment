import { routing } from '@/i18n/routing';

/**
 * ロケール別の絶対URLを生成する。
 * localePrefix: 'as-needed' に合わせ、デフォルトロケール(ja)はプレフィックスを付けない。
 * 例: localeUrl(base, 'ja', '/shop') => `${base}/shop`
 *     localeUrl(base, 'zh-tw', '/shop') => `${base}/zh-tw/shop`
 */
export function localeUrl(appUrl: string, locale: string, path: string = ''): string {
  return locale === routing.defaultLocale ? `${appUrl}${path}` : `${appUrl}/${locale}${path}`;
}

/**
 * hreflang(alternates.languages)用のロケール別URLマップ。
 * ja はプレフィックスなし、x-default も ja(=プレフィックスなし)に揃える。
 */
export function languageAlternates(appUrl: string, path: string = ''): Record<string, string> {
  return {
    ja: `${appUrl}${path}`,
    'zh-TW': `${appUrl}/zh-tw${path}`,
    en: `${appUrl}/en${path}`,
    'x-default': `${appUrl}${path}`,
  };
}
