import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import { Providers } from "./providers";
import "@/index.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-cairo",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "شوبي داش | تسوق محلي سهل وسريع",
  description:
    "شوبي داش - منصة التسوق المحلية الأولى في المنطقة. تسوق من أفضل المتاجر المحلية واحصل على منتجاتك اليومية بسهولة.",
  keywords: "سوق, تسوق, منتجات محلية, توصيل, شوبي داش, shopydash",
  authors: [{ name: "Shopydash" }],
  openGraph: {
    type: "website",
    url: "https://www.shopydash.store/",
    title: "شوبي داش | تسوق محلي سهل وسريع",
    description:
      "شوبي داش - منصة التسوق المحلية الأولى في المنطقة. تسوق من أفضل المتاجر المحلية واحصل على منتجاتك اليومية بسهولة.",
    images: [{ url: "https://www.shopydash.store/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shopydash",
    title: "شوبي داش | تسوق محلي سهل وسريع",
    description:
      "شوبي داش - منصة التسوق المحلية الأولى في المنطقة.",
    images: ["https://www.shopydash.store/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
