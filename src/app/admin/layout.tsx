import { Noto_Sans_JP } from "next/font/google";
import ThemeRegistry from "@/lib/mui/ThemeRegistry";
import AdminShell from "./AdminShell";

// 管理画面も MUI テーマの var(--app-font-sans) を解決するため Sans を割り当てる
// CJK フォントは preload が効かないため無効化（display: swap でフォールバック表示）
const notoSansJP = Noto_Sans_JP({
  variable: "--app-font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

export const metadata = {
  title: "管理画面 | 福島もも娘",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={notoSansJP.variable}>
        <ThemeRegistry>
          <AdminShell>{children}</AdminShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
