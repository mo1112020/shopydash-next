import { Suspense } from "react";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import HomePage from "@/views/home";
import { categoriesService, shopsService } from "@/services/catalog.service";

const BASE_URL = "https://www.shopydash.store";

export default async function Page() {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["categories"],
      queryFn: () => categoriesService.getAll(),
    }),
    queryClient.prefetchQuery({
      queryKey: ["shops", "premium-home"],
      queryFn: () => shopsService.getRankedShops({ limit: 6, premiumOnly: true }),
    }),
  ]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: BASE_URL,
      name: "شوبي داش",
      alternateName: "Shopydash",
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/shops?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      name: "شوبي داش",
      description: "منصة التسوق المحلية الأولى في منطقة أبو حمص",
      sameAs: [],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <HomePage />
        </Suspense>
      </HydrationBoundary>
    </>
  );
}
