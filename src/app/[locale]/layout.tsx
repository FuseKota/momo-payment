import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Sans_TC, Noto_Serif_JP, Noto_Serif_TC } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

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

const htmlLangMap: Record<Locale, string> = {
  ja: "ja",
  "zh-tw": "zh-Hant-TW",
};

// ロケールごとに Sans + Serif の両変数を body に適用する
const fontClassMap: Record<Locale, string> = {
  ja: `${notoSansJP.variable} ${notoSerifJP.variable}`,
  "zh-tw": `${notoSansTC.variable} ${notoSerifTC.variable}`,
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

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: t("title"),
      template: `%s | ${siteName}`,
    },
    description: t("description"),
    alternates: {
      canonical: `${appUrl}/${locale}`,
      languages: {
        ja: `${appUrl}/ja`,
        "zh-TW": `${appUrl}/zh-tw`,
        "x-default": `${appUrl}/ja`,
      },
    },
    openGraph: {
      siteName,
      locale: locale === "zh-tw" ? "zh_TW" : "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
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
