import { Suspense } from "react";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import ShopsPage from "@/views/shops";
import { shopsService } from "@/services/catalog.service";

const BASE_URL = "https://www.shopydash.store";

export const metadata: Metadata = {
  title: "تصفح المتاجر المحلية | شوبي داش",
  description:
    "اكتشف أفضل المتاجر المحلية في أبو حمص. تسوق البقالة، الإلكترونيات، الملابس وأكثر مع توصيل سريع لبابك.",
  keywords: "متاجر محلية, أبو حمص, تسوق, بقالة, إلكترونيات, توصيل",
  alternates: { canonical: `${BASE_URL}/shops` },
  openGraph: {
    title: "المتاجر المحلية | شوبي داش",
    description: "اكتشف أفضل المتاجر المحلية في أبو حمص مع توصيل سريع.",
    url: `${BASE_URL}/shops`,
    type: "website",
  },
};

export default async function Page() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["shops"],
    queryFn: () => shopsService.getRankedShops(),
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "المتاجر المحلية على شوبي داش",
    description: "قائمة بأفضل المتاجر المحلية في أبو حمص",
    url: `${BASE_URL}/shops`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <ShopsPage />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
