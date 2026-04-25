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

  // Handle subdomain routing
  const host = request.headers.get("host");
  const url = request.nextUrl;
  
  // Check if we are on the dashboard subdomain
  if (host === "dashboard.shopydash.store" || host === "dashboard.localhost:3000") {
    const isAuthOrApiRoute = url.pathname.match(/^\/(login|register|forgot-password|reset-password|auth|api|favicon\.ico|_next)/);
    
    // If the path doesn't already start with /dashboard, and it's not an auth/api route, rewrite it internally
    if (!url.pathname.startsWith("/dashboard") && !isAuthOrApiRoute) {
      // If it's just "/", rewrite to "/dashboard". If it's "/orders", rewrite to "/dashboard/orders"
      url.pathname = `/dashboard${url.pathname === "/" ? "" : url.pathname}`;
      supabaseResponse = NextResponse.rewrite(url);
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const cookieDomain = host?.includes("shopydash.store") ? ".shopydash.store" : "localhost";

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          
          // Recreate response so it has the updated request cookies if needed
          // (Usually Next.js requires this pattern for middleware)
          supabaseResponse = NextResponse.next({ request });
          
          // Apply the rewrite again because creating a new NextResponse.next() erases the rewrite!
          if (host === "dashboard.shopydash.store" || host === "dashboard.localhost:3000") {
            const isAuthOrApiRoute = url.pathname.match(/^\/(login|register|forgot-password|reset-password|auth|api|favicon\.ico|_next)/);
            if (!url.pathname.startsWith("/dashboard") && !isAuthOrApiRoute) {
              supabaseResponse = NextResponse.rewrite(url);
            }
          }
          
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, domain: cookieDomain })
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove this line
  try {
    await supabase.auth.getUser();
  } catch {
    // non-fatal: server still serves pages without auth context
  }

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
