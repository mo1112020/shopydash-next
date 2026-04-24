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
