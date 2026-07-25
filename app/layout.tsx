import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { getBrandSettings } from "@/lib/api";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrandSettings();
  return {
    title: `${brand.platformName} — La TV che vuoi, quando vuoi`,
    description: "Dirette, programmi e intrattenimento italiano in streaming.",
    icons: brand.faviconUrl
      ? { icon: brand.faviconUrl, shortcut: brand.faviconUrl, apple: brand.faviconUrl }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const brand = await getBrandSettings();

  return (
    <html lang="it" className={inter.variable}>
      <body style={{ "--brand-accent": brand.accentColor } as CSSProperties}>{children}</body>
    </html>
  );
}
