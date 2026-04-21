import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

function ogHTML(
  title: string,
  description: string,
  image: string,
  url: string
): string {
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
  const ua = request.headers.get("user-agent");

  if (!isCrawler(ua)) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  try {
    const shopMatch = path.match(/^\/shops\/([^/]+)$/);
    if (shopMatch) {
      const slug = shopMatch[1];
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/shops?slug=eq.${slug}&select=name,description,logo_url,cover_url&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const shops = await res.json();
      if (shops && shops.length > 0) {
        const shop = shops[0];
        const title = esc(`${shop.name} | Shopydash`);
        const desc = esc(shop.description || `تسوق من ${shop.name} عبر شوبي داش`);
        const image =
          shop.logo_url || shop.cover_url || "https://www.shopydash.store/logo.png";
        const pageUrl = `https://www.shopydash.store/shops/${slug}`;
        return new NextResponse(ogHTML(title, desc, image, pageUrl), {
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
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const products = await res.json();
      if (products && products.length > 0) {
        const p = products[0];
        const shopName = p.shop?.name || "Shopydash";
        const title = esc(`${p.name} | ${shopName}`);
        const desc = esc(
          p.description || `اشتري ${p.name} من ${shopName} الآن عبر شوبي داش`
        );
        const image = p.image_url || "https://www.shopydash.store/logo.png";
        const pageUrl = `https://www.shopydash.store/products/${id}`;
        return new NextResponse(ogHTML(title, desc, image, pageUrl), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
  } catch {
    // fall through to normal rendering
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/shops/:slug*", "/products/:id*"],
};
