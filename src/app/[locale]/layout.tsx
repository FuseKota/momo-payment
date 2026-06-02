import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Sans_TC } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
import ThemeRegistry from "@/lib/mui/ThemeRegistry";

// CJK フォントはサブセット先読みが効かず大量の woff2 を eager に読み込むため
// preload を無効化する（display: swap でフォールバック表示されるため FOIT なし）。
// 参考: https://nextjs.org/docs/app/api-reference/components/font#preload
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const htmlLangMap: Record<Locale, string> = {
  ja: "ja",
  "zh-tw": "zh-Hant-TW",
};

const fontVarMap: Record<Locale, string> = {
  ja: notoSansJP.variable,
  "zh-tw": notoSansTC.variable,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://momomusume.com";
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
      <body className={fontVarMap[locale as Locale] || notoSansJP.variable}>
        <NextIntlClientProvider messages={messages}>
          <ThemeRegistry>{children}</ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
