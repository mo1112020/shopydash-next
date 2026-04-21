import { Suspense } from "react";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import ProductPage from "@/views/product";
import { productsService } from "@/services/catalog.service";

const BASE_URL = "https://www.shopydash.store";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await productsService.getById(params.id);
  if (!product) return { title: "منتج غير موجود | شوبي داش" };

  const shopName = (product.shop as any)?.name || "شوبي داش";
  const title = `${product.name} | ${shopName} | شوبي داش`;
  const description =
    product.description ||
    `اشتري ${product.name} من ${shopName} الآن عبر شوبي داش بأفضل سعر مع توصيل سريع في أبو حمص.`;

  return {
    title,
    description,
    keywords: `${product.name}, ${shopName}, شراء أون لاين, أبو حمص, شوبي داش`,
    alternates: { canonical: `${BASE_URL}/products/${product.id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/products/${product.id}`,
      type: "website",
      images: product.image_url
        ? [{ url: product.image_url, alt: product.name }]
        : [{ url: `${BASE_URL}/logo.png`, alt: "شوبي داش" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image_url ? [product.image_url] : [`${BASE_URL}/logo.png`],
    },
  };
}

export default async function Page({ params }: Props) {
  const queryClient = new QueryClient();
  const { id } = params;

  await queryClient.prefetchQuery({
    queryKey: ["product", id],
    queryFn: () => productsService.getById(id),
  });

  const product = queryClient.getQueryData<Awaited<ReturnType<typeof productsService.getById>>>(["product", id]);

  // Product JSON-LD schema
  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${BASE_URL}/products/${product.id}`,
        name: product.name,
        description: product.description || undefined,
        image: product.image_url || undefined,
        url: `${BASE_URL}/products/${product.id}`,
        brand: {
          "@type": "Brand",
          name: (product.shop as any)?.name || "شوبي داش",
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "EGP",
          price: product.price,
          availability: product.stock_quantity && product.stock_quantity > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: {
            "@type": "Organization",
            name: (product.shop as any)?.name || "شوبي داش",
          },
        },
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
          <ProductPage />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
