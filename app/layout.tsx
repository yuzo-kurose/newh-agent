import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEWh 新規事業創出支援エージェント",
  description: "NEWhのノウハウをもとにプロジェクトデザインをリードする支援ツール",
};

// スマホで等倍表示させる（未設定だとデスクトップ幅で縮小描画される）。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
