# Performance & SEO Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve page load speed and SEO signals without changing any UI design or user-facing functionality.

**Architecture:** Six independent, non-breaking changes: HTTP cache headers + build flags in next.config, image LCP priority hints in ShopCard, lazy dynamic imports for heavy dashboard-only components, longer React Query staleTime for catalog data, noindex metadata on auth pages, and cleaned-up global JSON-LD + twitter:site in the root layout.

**Tech Stack:** Next.js 14 App Router, `next/dynamic`, `@tanstack/react-query`, Schema.org JSON-LD

---

## File Map

| Action | File | Change |
|--------|------|--------|
| MODIFY | `next.config.mjs` | Add `poweredByHeader: false`, HTTP cache headers for static assets |
| MODIFY | `src/components/ShopCard.tsx` | Add optional `priority` prop passed to `<Image>` |
| MODIFY | `src/views/home.tsx` | Pass `priority={i === 0}` to first ShopCard |
| MODIFY | `src/views/dashboard.tsx` | Convert 8 heavy static imports to `dynamic()` |
| MODIFY | `app/providers.tsx` | Bump `staleTime` from 5 min to 10 min |
| MODIFY | `app/(main)/login/page.tsx` | Add `robots: { index: false }` |
| MODIFY | `app/(main)/register/page.tsx` | Add `robots: { index: false }` |
| MODIFY | `app/(main)/forgot-password/page.tsx` | Add `robots: { index: false }` |
| MODIFY | `app/(main)/reset-password/page.tsx` | Add `robots: { index: false }` |
| MODIFY | `app/layout.tsx` | Remove duplicate Organization JSON-LD; add `twitter:site` |

---

## Task 1: next.config — Cache Headers + poweredByHeader

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Replace `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 80, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -10
```

Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "perf: add HTTP cache headers and disable poweredByHeader"
```

---

## Task 2: LCP Image Priority in ShopCard

The first shop logo on the home page is the Largest Contentful Paint candidate. Adding `priority` tells Next.js to preload it instead of lazy-loading it.

**Files:**
- Modify: `src/components/ShopCard.tsx:13-22` (props interface + component signature)
- Modify: `src/components/ShopCard.tsx:97-103` (Image element)
- Modify: `src/views/home.tsx:250-252` (ShopCard usage)

- [ ] **Step 1: Add `priority` prop to `ShopCardProps` interface in `src/components/ShopCard.tsx`**

Change the interface from:
```ts
interface ShopCardProps {
  shop: Shop & { 
    category?: { name: string; icon: string | null } | null;
    working_hours?: WorkingHours[]; 
  };
  className?: string; // Allow external class overrides
  index?: number; // For animation delay
}

export function ShopCard({ shop, className, index = 0 }: ShopCardProps) {
```

To:
```ts
interface ShopCardProps {
  shop: Shop & { 
    category?: { name: string; icon: string | null } | null;
    working_hours?: WorkingHours[]; 
  };
  className?: string;
  index?: number;
  priority?: boolean;
}

export function ShopCard({ shop, className, index = 0, priority = false }: ShopCardProps) {
```

- [ ] **Step 2: Pass `priority` to `<Image>` in `src/components/ShopCard.tsx`**

Change:
```tsx
            <Image
              src={shop.logo_url}
              alt={shop.name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
```

To:
```tsx
            <Image
              src={shop.logo_url}
              alt={shop.name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              priority={priority}
            />
```

- [ ] **Step 3: Pass `priority` for the first shop in `src/views/home.tsx`**

Change (line ~251):
```tsx
shops.slice(0, 3).map((shop: any, i: number) => (
  <ShopCard key={shop.id} shop={shop} index={i} />
))
```

To:
```tsx
shops.slice(0, 3).map((shop: any, i: number) => (
  <ShopCard key={shop.id} shop={shop} index={i} priority={i === 0} />
))
```

- [ ] **Step 4: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShopCard.tsx src/views/home.tsx
git commit -m "perf: add LCP priority hint to first shop card image on home page"
```

---

## Task 3: Lazy-load Heavy Dashboard Components

These components are only shown for specific authenticated roles but are statically imported — they inflate the bundle for every dashboard visitor. Converting to `dynamic()` with `ssr: false` means they are code-split and only fetched when actually rendered.

Components to convert: `AdminFinancials`, `AdminShopFinancials`, `LiveOperations`, `TopCustomers`, `AdminDelivery`, `DeliveryDashboard`, `CourierAccount`, `ShopAnalytics`

**Files:**
- Modify: `src/views/dashboard.tsx:54-57, 162-165`

- [ ] **Step 1: Replace the 8 static imports with dynamic imports in `src/views/dashboard.tsx`**

Remove these lines (lines 54–57 and 162–165):
```ts
import { AdminDelivery } from "@/components/delivery/AdminDelivery";
import { DeliveryDashboard } from "@/components/delivery/DeliveryDashboard";
import { CourierAccount } from "@/components/delivery/CourierAccount";
import { ShopAnalytics } from "./dashboard/shop-analytics";
// ...
import { AdminFinancials } from "@/components/dashboard/AdminFinancials";
import { AdminShopFinancials } from "@/components/dashboard/AdminShopFinancials";
import { LiveOperations } from "@/components/dashboard/LiveOperations";
import { TopCustomers } from "@/components/dashboard/TopCustomers";
```

Add dynamic versions after the existing `RegionMapDrawer` dynamic import (after line 104):
```ts
const AdminDelivery = dynamic(
  () => import("@/components/delivery/AdminDelivery").then((m) => m.AdminDelivery),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const DeliveryDashboard = dynamic(
  () => import("@/components/delivery/DeliveryDashboard").then((m) => m.DeliveryDashboard),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const CourierAccount = dynamic(
  () => import("@/components/delivery/CourierAccount").then((m) => m.CourierAccount),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const ShopAnalytics = dynamic(
  () => import("./dashboard/shop-analytics").then((m) => m.ShopAnalytics),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const AdminFinancials = dynamic(
  () => import("@/components/dashboard/AdminFinancials").then((m) => m.AdminFinancials),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const AdminShopFinancials = dynamic(
  () => import("@/components/dashboard/AdminShopFinancials").then((m) => m.AdminShopFinancials),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const LiveOperations = dynamic(
  () => import("@/components/dashboard/LiveOperations").then((m) => m.LiveOperations),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);

const TopCustomers = dynamic(
  () => import("@/components/dashboard/TopCustomers").then((m) => m.TopCustomers),
  { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> }
);
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -15
```

Expected: build succeeds. Dashboard chunk should be smaller.

- [ ] **Step 3: Commit**

```bash
git add src/views/dashboard.tsx
git commit -m "perf: lazy-load heavy dashboard components with next/dynamic"
```

---

## Task 4: Increase React Query staleTime for Catalog Data

Catalog data (shops, categories, products) changes infrequently. Doubling `staleTime` halves background refetch frequency.

**Files:**
- Modify: `app/providers.tsx:13`

- [ ] **Step 1: Change `staleTime` in `app/providers.tsx`**

Change:
```ts
        staleTime: 1000 * 60 * 5,
```

To:
```ts
        staleTime: 1000 * 60 * 10,
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/providers.tsx
git commit -m "perf: increase React Query staleTime to 10min to reduce catalog refetches"
```

---

## Task 5: noindex Metadata on Auth Pages

Auth pages waste crawl budget. Adding `robots: { index: false }` tells all crawlers to skip them.

**Files:**
- Modify: `app/(main)/login/page.tsx`
- Modify: `app/(main)/register/page.tsx`
- Modify: `app/(main)/forgot-password/page.tsx`
- Modify: `app/(main)/reset-password/page.tsx`

- [ ] **Step 1: Update `app/(main)/login/page.tsx`**

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPage from "@/views/login";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
```

- [ ] **Step 2: Update `app/(main)/register/page.tsx`**

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterPage from "@/views/register";

export const metadata: Metadata = {
  title: "إنشاء حساب | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}
```

- [ ] **Step 3: Update `app/(main)/forgot-password/page.tsx`**

```tsx
import type { Metadata } from "next";
import ForgotPasswordPage from "@/views/forgot-password";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return <ForgotPasswordPage />;
}
```

- [ ] **Step 4: Update `app/(main)/reset-password/page.tsx`**

```tsx
import type { Metadata } from "next";
import ResetPasswordPage from "@/views/reset-password";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return <ResetPasswordPage />;
}
```

- [ ] **Step 5: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add "app/(main)/login/page.tsx" "app/(main)/register/page.tsx" "app/(main)/forgot-password/page.tsx" "app/(main)/reset-password/page.tsx"
git commit -m "seo: add noindex to auth pages to reduce crawl budget waste"
```

---

## Task 6: Fix Global Metadata in Root Layout

Remove the duplicate `Organization` JSON-LD block from `app/layout.tsx` (the home page `page.tsx` already outputs a more complete version). Add `twitter:site` to global metadata.

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/layout.tsx`**

```tsx
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
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "seo: remove duplicate Organization JSON-LD from root layout; add twitter:site"
```

---

## Self-Review

**Spec coverage:**
- ✅ Cache headers + `poweredByHeader` → Task 1
- ✅ LCP image priority on ShopCard → Task 2
- ✅ Dynamic imports for heavy dashboard components → Task 3
- ✅ React Query staleTime increase → Task 4
- ✅ noindex on auth pages → Task 5
- ✅ Remove duplicate JSON-LD + add `twitter:site` → Task 6

**Placeholder scan:** No TBD, no "implement later". All code blocks are complete.

**Type consistency:** `priority?: boolean` is defined in Task 2 Step 1 and consumed in Task 2 Steps 2–3. `dynamic()` pattern matches existing `RegionMapDrawer` usage in the same file.

**No design or functionality changes:** Every change is either config, metadata, or import strategy. Zero JSX UI changes to user-visible components.
