import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import ThemeRegistry from "@/lib/mui/ThemeRegistry";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "もも娘 - オンライン注文",
  description: "もも娘のオンライン注文サイト。キッチンカー販売・配送に対応。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
