import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import JsonLd from "@/components/seo/JsonLd";
import TikTokPixel from "@/components/analytics/TikTokPixel";
import { getLocale } from "@/lib/i18n";
import {
  CANONICAL_BRAND_NAME,
  CANONICAL_SITE_ORIGIN,
  GOOGLE_SITE_VERIFICATION,
} from "@/lib/seo/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_SITE_ORIGIN),
  title: CANONICAL_BRAND_NAME,
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
  openGraph: {
    siteName: CANONICAL_BRAND_NAME,
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd />
        <TikTokPixel />
        {children}
      </body>
    </html>
  );
}
