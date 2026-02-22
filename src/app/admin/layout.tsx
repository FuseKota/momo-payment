import { Noto_Sans_JP } from "next/font/google";
import ThemeRegistry from "@/lib/mui/ThemeRegistry";
import AdminShell from "./AdminShell";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata = {
  title: "管理画面 | 福島もも娘",
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
