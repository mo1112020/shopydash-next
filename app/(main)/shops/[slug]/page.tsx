import { Suspense } from "react";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import ShopPage from "@/views/shop";
import { shopsService, productsService } from "@/services/catalog.service";

const BASE_URL = "https://www.shopydash.store";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shop = await shopsService.getBySlug(params.slug);
  if (!shop) return { title: "متجر غير موجود | شوبي داش" };

  const title = `${shop.name} | شوبي داش`;
  const description =
    shop.description ||
    `تسوق الآن من ${shop.name} عبر شوبي داش وادفع عند الاستلام مع توصيل سريع في أبو حمص.`;

  return {
    title,
    description,
    keywords: `${shop.name}, متجر محلي, أبو حمص, توصيل, شوبي داش`,
    alternates: { canonical: `${BASE_URL}/shops/${shop.slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/shops/${shop.slug}`,
      type: "website",
      images: shop.logo_url
        ? [{ url: shop.logo_url, alt: shop.name }]
        : [{ url: `${BASE_URL}/logo.png`, alt: "شوبي داش" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: shop.logo_url ? [shop.logo_url] : [`${BASE_URL}/logo.png`],
    },
  };
}

export default async function Page({ params }: Props) {
  const queryClient = new QueryClient();
  const { slug } = params;

  // Prefetch main shop data first
  await queryClient.prefetchQuery({
    queryKey: ["shop", slug],
    queryFn: () => shopsService.getBySlug(slug),
  });

  const shop = queryClient.getQueryData<Awaited<ReturnType<typeof shopsService.getBySlug>>>(["shop", slug]);

  // Prefetch dependent queries in parallel
  if (shop?.id) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["shop-hours", shop.id],
        queryFn: () => shopsService.getHours(shop.id),
      }),
      queryClient.prefetchQuery({
        queryKey: ["products", "shop", shop.id],
        queryFn: () => productsService.getAll({ shopId: shop.id }),
      }),
    ]);
  }

  // LocalBusiness JSON-LD schema
  const jsonLd = shop
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${BASE_URL}/shops/${shop.slug}`,
        name: shop.name,
        description: shop.description || undefined,
        image: shop.logo_url || undefined,
        url: `${BASE_URL}/shops/${shop.slug}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "أبو حمص",
          addressCountry: "EG",
        },
        areaServed: "أبو حمص",
        priceRange: "$$",
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <ShopPage />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
