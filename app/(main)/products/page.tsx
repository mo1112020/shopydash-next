import { Suspense } from "react";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import ProductsPage from "@/views/products";
import { shopsService } from "@/services/catalog.service";

const BASE_URL = "https://www.shopydash.store";

export const metadata: Metadata = {
  title: "تصفح المنتجات | شوبي داش",
  description:
    "اكتشف آلاف المنتجات من متاجر محلية موثوقة في أبو حمص. أسعار تنافسية وتوصيل سريع لباب منزلك.",
  keywords: "منتجات, تسوق أون لاين, أبو حمص, أسعار, توصيل",
  alternates: { canonical: `${BASE_URL}/products` },
  openGraph: {
    title: "المنتجات | شوبي داش",
    description: "آلاف المنتجات من متاجر محلية موثوقة مع توصيل سريع.",
    url: `${BASE_URL}/products`,
    type: "website",
  },
};

export default async function Page() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["ranked-shops"],
    queryFn: () => shopsService.getRankedShops({ limit: 10 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <ProductsPage />
      </Suspense>
    </HydrationBoundary>
  );
}
