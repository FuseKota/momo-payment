import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ja', 'zh-tw'],
  defaultLocale: 'ja',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
