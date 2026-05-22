import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEWh 新規事業創出支援エージェント",
  description: "NEWhのノウハウをもとにプロジェクトデザインをリードする支援ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
