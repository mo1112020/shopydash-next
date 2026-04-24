# Cleanup & Full SSR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all dead code and add server-side rendering (with cookie-based auth via `@supabase/ssr`) to every page in the app.

**Architecture:** Public catalog pages already use SSR via React Query + HydrationBoundary. User-specific pages (orders, order detail) will gain the same pattern using a new server Supabase client that reads auth cookies. Auth-gated pages without data prefetch (cart, account, checkout) will get server-side auth checks with redirects to replace the current client-side redirect dance. The crawler-only middleware is extended to also refresh auth sessions on every request.

**Tech Stack:** Next.js 14 App Router, `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| DELETE | `src/vite-env.d.ts` | Vite leftover — unused in Next.js |
| DELETE | `src/components/ProtectedRoute.tsx` | Never imported anywhere |
| DELETE | `src/components/SEO.tsx` | Redundant client title setter — pages use `metadata`/`generateMetadata` |
| MODIFY | `src/views/shop.tsx` | Remove `SEO` import + usage |
| MODIFY | `src/views/product.tsx` | Remove `SEO` import + usage |
| MODIFY | `src/views/about.tsx` | Remove `SEO` import + usage |
| CREATE | `src/lib/supabase-server.ts` | Cookie-based server Supabase client factory |
| MODIFY | `middleware.ts` | Add session refresh via `@supabase/ssr`; expand matcher |
| MODIFY | `app/(main)/orders/page.tsx` | SSR prefetch page-1 orders |
| MODIFY | `app/(main)/orders/[id]/page.tsx` | SSR prefetch order by ID |
| MODIFY | `app/(main)/cart/page.tsx` | Server-side auth check + redirect |
| MODIFY | `app/(main)/account/page.tsx` | Server-side auth check + redirect |
| MODIFY | `app/(main)/checkout/page.tsx` | Server-side auth check + redirect |

---

## Task 1: Delete Unused Files

**Files:**
- Delete: `src/vite-env.d.ts`
- Delete: `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm /Users/mohamedsaad/Desktop/ShopyDash/src/vite-env.d.ts
rm /Users/mohamedsaad/Desktop/ShopyDash/src/components/ProtectedRoute.tsx
```

- [ ] **Step 2: Verify nothing imports them**

```bash
grep -r "vite-env\|ProtectedRoute" /Users/mohamedsaad/Desktop/ShopyDash/src /Users/mohamedsaad/Desktop/ShopyDash/app --include="*.tsx" --include="*.ts"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused vite-env.d.ts and ProtectedRoute component"
```

---

## Task 2: Remove Redundant SEO Component

The `SEO` component only calls `document.title = ...` on the client. Every page already sets the title server-side via Next.js `metadata` / `generateMetadata`. This task removes the component and its three usage sites.

**Files:**
- Modify: `src/views/shop.tsx`
- Modify: `src/views/product.tsx`
- Modify: `src/views/about.tsx`
- Delete: `src/components/SEO.tsx`

- [ ] **Step 1: Remove SEO from `src/views/shop.tsx`**

Find and remove this import (around line 30):
```ts
import { SEO } from "@/components/SEO";
```

Find and remove the usage (around line 207):
```tsx
<SEO title={shop.name} />
```
(Delete the entire `<SEO ... />` line wherever it appears in the return JSX.)

- [ ] **Step 2: Remove SEO from `src/views/product.tsx`**

Remove this import (around line 27):
```ts
import { SEO } from "@/components/SEO";
```

Remove the usage (around line 136):
```tsx
<SEO title={product.name} />
```

- [ ] **Step 3: Remove SEO from `src/views/about.tsx`**

Remove this import (around line 7):
```ts
import { SEO } from "@/components/SEO";
```

Remove the usage (around line 220):
```tsx
<SEO title="عن شوبي داش" />
```
(The exact prop value may vary — remove the entire `<SEO ... />` line.)

- [ ] **Step 4: Delete the SEO component file**

```bash
rm /Users/mohamedsaad/Desktop/ShopyDash/src/components/SEO.tsx
```

- [ ] **Step 5: Verify no remaining imports**

```bash
grep -r "from.*components/SEO\|import.*SEO" /Users/mohamedsaad/Desktop/ShopyDash/src /Users/mohamedsaad/Desktop/ShopyDash/app --include="*.tsx" --include="*.ts"
```

Expected: no output.

- [ ] **Step 6: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to SEO.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove redundant SEO client-component (pages use Next.js metadata)"
```

---

## Task 3: Install `@supabase/ssr`

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm install @supabase/ssr
```

- [ ] **Step 2: Verify installed**

```bash
grep "@supabase/ssr" /Users/mohamedsaad/Desktop/ShopyDash/package.json
```

Expected: a line like `"@supabase/ssr": "^0.x.x"`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @supabase/ssr for cookie-based server auth"
```

---

## Task 4: Create Server Supabase Client

**Files:**
- Create: `src/lib/supabase-server.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/supabase-server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `supabase-server.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase-server.ts
git commit -m "feat: add server-side Supabase client with cookie-based auth"
```

---

## Task 5: Update Middleware for Session Refresh

The current middleware only handles OG meta for social crawlers. Add session token refresh (required by `@supabase/ssr`) for all requests, then continue with crawler logic unchanged.

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Replace `middleware.ts` entirely**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const CRAWLER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "WhatsApp",
  "TelegramBot",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "Pinterest",
];

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return CRAWLER_AGENTS.some((agent) => userAgent.includes(agent));
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ogHTML(title: string, description: string, image: string, url: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body><p>${description}</p></body>
</html>`;
}

export async function middleware(request: NextRequest) {
  // Always refresh the auth session so server components can read it
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this line
  await supabase.auth.getUser();

  // Social crawler: serve OG HTML directly
  const ua = request.headers.get("user-agent");
  if (isCrawler(ua)) {
    const path = request.nextUrl.pathname;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const shopMatch = path.match(/^\/shops\/([^/]+)$/);
        if (shopMatch) {
          const slug = shopMatch[1];
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/shops?slug=eq.${slug}&select=name,description,logo_url,cover_url&limit=1`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
          );
          const shops = await res.json();
          if (shops?.length > 0) {
            const shop = shops[0];
            const title = esc(`${shop.name} | Shopydash`);
            const desc = esc(shop.description || `تسوق من ${shop.name} عبر شوبي داش`);
            const image = shop.logo_url || shop.cover_url || "https://www.shopydash.store/logo.png";
            return new NextResponse(ogHTML(title, desc, image, `https://www.shopydash.store/shops/${slug}`), {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
        }

        const productMatch = path.match(/^\/products\/([^/]+)$/);
        if (productMatch) {
          const id = productMatch[1];
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/products?id=eq.${id}&select=name,description,image_url,shop:shops(name)&limit=1`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
          );
          const products = await res.json();
          if (products?.length > 0) {
            const p = products[0];
            const shopName = p.shop?.name || "Shopydash";
            const title = esc(`${p.name} | ${shopName}`);
            const desc = esc(p.description || `اشتري ${p.name} من ${shopName} الآن عبر شوبي داش`);
            const image = p.image_url || "https://www.shopydash.store/logo.png";
            return new NextResponse(ogHTML(title, desc, image, `https://www.shopydash.store/products/${id}`), {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
        }
      } catch {
        // fall through to normal rendering
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -20
```

Expected: successful build, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: refresh Supabase auth session in middleware for SSR cookie support"
```

---

## Task 6: SSR Auth Guard for Cart, Account, Checkout

These pages use `AppContext` (not React Query), so data prefetching is not applicable. Instead, add a server-side auth check: if the user has no session cookie, redirect immediately — eliminating the current client-side redirect flicker.

**Files:**
- Modify: `app/(main)/cart/page.tsx`
- Modify: `app/(main)/account/page.tsx`
- Modify: `app/(main)/checkout/page.tsx`

- [ ] **Step 1: Update `app/(main)/cart/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CartPage from "@/views/cart";

export const metadata = { title: "سلة المشتريات | Shopydash" };

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/cart");

  return <CartPage />;
}
```

- [ ] **Step 2: Update `app/(main)/account/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AccountPage from "@/views/account";

export const metadata = { title: "حسابي | Shopydash" };

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account");

  return <AccountPage />;
}
```

Note: Remove `export const dynamic = "force-dynamic"` — the `await supabase.auth.getUser()` call makes this page dynamic automatically.

- [ ] **Step 3: Update `app/(main)/checkout/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CheckoutPage from "@/views/checkout";

export const metadata = { title: "إتمام الطلب | Shopydash" };

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/checkout");

  return <CheckoutPage />;
}
```

Note: Remove `export const dynamic = "force-dynamic"` for the same reason as above.

- [ ] **Step 4: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/cart/page.tsx app/\(main\)/account/page.tsx app/\(main\)/checkout/page.tsx
git commit -m "feat: server-side auth guard for cart, account, and checkout pages"
```

---

## Task 7: SSR Prefetch for Orders List Page

**Files:**
- Modify: `app/(main)/orders/page.tsx`

The orders view queries with `queryKey: ["orders", currentPage]` (page defaults to 1). We prefetch page 1 server-side and hydrate on the client.

- [ ] **Step 1: Replace `app/(main)/orders/page.tsx`**

```tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OrdersPage from "@/views/orders";

export const metadata = { title: "طلباتي | Shopydash" };

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/orders");

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["orders", 1],
    queryFn: async () => {
      const pageSize = 10;
      const { data, error, count } = await supabase
        .from("orders")
        .select(
          `*,
          shop:shops(id, name, slug, logo_url, phone),
          items:order_items(*),
          status_history:order_status_history(*)`,
          { count: "exact" }
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(0, pageSize - 1);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <OrdersPage />
      </Suspense>
    </HydrationBoundary>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -20
```

Expected: successful build, no type errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(main\)/orders/page.tsx
git commit -m "feat: SSR prefetch for orders list page using server Supabase client"
```

---

## Task 8: SSR Prefetch for Order Detail Page

**Files:**
- Modify: `app/(main)/orders/[id]/page.tsx`

The order detail view queries with `queryKey: ["order", id]`. We prefetch the order server-side.

- [ ] **Step 1: Replace `app/(main)/orders/[id]/page.tsx`**

```tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OrderPage from "@/views/order";

export const metadata = { title: "تفاصيل الطلب | Shopydash" };

type Props = { params: { id: string } };

export default async function Page({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/orders/${params.id}`);

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["order", params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
          shop:shops(id, name, slug, logo_url, phone),
          items:order_items(*),
          status_history:order_status_history(*),
          parent_order:parent_orders(id, order_number, total, platform_fee, total_delivery_fee)`
        )
        .eq("id", params.id)
        .maybeSingle();

      if (error) return null;
      return data;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <OrderPage />
      </Suspense>
    </HydrationBoundary>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/mohamedsaad/Desktop/ShopyDash && npm run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 3: Commit**

```bash
git add "app/(main)/orders/[id]/page.tsx"
git commit -m "feat: SSR prefetch for order detail page using server Supabase client"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Delete `vite-env.d.ts` → Task 1
- ✅ Delete `ProtectedRoute.tsx` → Task 1
- ✅ Remove redundant `SEO` component → Task 2
- ✅ Install `@supabase/ssr` → Task 3
- ✅ Server Supabase client factory → Task 4
- ✅ Middleware session refresh → Task 5
- ✅ Auth guard (cart, account, checkout) → Task 6
- ✅ SSR orders list → Task 7
- ✅ SSR order detail → Task 8

**Known scope boundary:** The `cart` and `account` views read data from `AppContext` (not React Query), so data prefetching into HydrationBoundary is not applicable without a larger AppContext refactor. Server-side auth guards (Task 6) eliminate the redirect flicker for those pages.

**Placeholder check:** All code blocks are complete. No "TBD" or "implement later" present.

**Type consistency:** `createSupabaseServerClient` is the same name across Tasks 4, 5, 6, 7, 8. QueryKeys `["orders", 1]` and `["order", params.id]` match exactly what the views use.
