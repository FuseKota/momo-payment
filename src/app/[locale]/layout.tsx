import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Sans_TC, Noto_Serif_JP, Noto_Serif_TC, Inter, Noto_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { localeUrl, languageAlternates } from "@/lib/seo/locale-url";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
import ThemeRegistry from "@/lib/mui/ThemeRegistry";

// 共有 CSS 変数 --app-font-sans / --app-font-serif にロケール別フォントを割り当て、
// MUI テーマ（var(--app-font-sans)）と CSS Module（var(--app-font-serif)）から参照する。
// CJK はサブセット先読みが効かないため preload: false（display: swap で FOIT なし）。
// 参考: https://nextjs.org/docs/app/api-reference/components/font#preload
const notoSansJP = Noto_Sans_JP({
  variable: "--app-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--app-font-serif",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});

const notoSansTC = Noto_Sans_TC({
  variable: "--app-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const notoSerifTC = Noto_Serif_TC({
  variable: "--app-font-serif",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});

// 英語(en)用。layout で複数ロケールのフォントを条件適用するため preload: true だと
// 全ページで先読みされ、ja/zh-tw では未使用のまま「preloaded but not used」警告になる。
// CJK フォントと同様 preload: false にして不要な先読みを避ける（display: swap で FOIT なし）。
const inter = Inter({
  variable: "--app-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const notoSerifEn = Noto_Serif({
  variable: "--app-font-serif",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});

const htmlLangMap: Record<Locale, string> = {
  ja: "ja",
  "zh-tw": "zh-Hant-TW",
  en: "en",
};

// ロケールごとに Sans + Serif の両変数を body に適用する
const fontClassMap: Record<Locale, string> = {
  ja: `${notoSansJP.variable} ${notoSerifJP.variable}`,
  "zh-tw": `${notoSansTC.variable} ${notoSerifTC.variable}`,
  en: `${inter.variable} ${notoSerifEn.variable}`,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taiwanyoichi-momomusume.com";
  const siteName = tc("siteName");
  // 各ページの <title> 末尾に付くサフィックスは短いブランド名（もも娘 / 桃娘）に統一し、
  // SERP での文字数超過を避ける。OG/JSON-LD には正式名称の siteName を使う。
  const brandShort = tc("brandShort");

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: t("title"),
      template: `%s | ${brandShort}`,
    },
    description: t("description"),
    alternates: {
      canonical: localeUrl(appUrl, locale),
      languages: languageAlternates(appUrl),
    },
    openGraph: {
      siteName,
      locale: locale === "zh-tw" ? "zh_TW" : locale === "en" ? "en_US" : "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
    // Google Search Console の所有権確認（HTMLメタ方式）。
    // GOOGLE_SITE_VERIFICATION 未設定ならメタタグは出力されない（DNS方式で確認する場合は未設定でOK）。
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={htmlLangMap[locale as Locale] || "ja"}>
      <body className={fontClassMap[locale as Locale] || fontClassMap.ja}>
        <NextIntlClientProvider messages={messages}>
          <ThemeRegistry>{children}</ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
