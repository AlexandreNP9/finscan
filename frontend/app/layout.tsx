import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinScan",
  description: "Controle de gastos a partir das notas fiscais (NFC-e).",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f7f7f8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-[15px]">{children}</body>
    </html>
  );
}
