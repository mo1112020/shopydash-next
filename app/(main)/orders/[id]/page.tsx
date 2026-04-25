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
      // 1. Try single/sub order
      const { data: singleData, error: singleError } = await supabase
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

      if (!singleError && singleData) {
        return { type: 'single' as const, data: singleData };
      }

      // 2. Try parent order
      const { data: parentData, error: parentError } = await supabase
        .from("parent_orders")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (parentError || !parentData) return null;

      const { data: suborders } = await supabase
        .from("orders")
        .select(`
          *,
          shop:shops(id, name, slug, logo_url, phone, address, latitude, longitude),
          items:order_items(*),
          status_history:order_status_history(*)
        `)
        .eq("parent_order_id", params.id)
        .neq("status", "CANCELLED")
        .neq("status", "CANCELLED_BY_SHOP")
        .neq("status", "CANCELLED_BY_ADMIN")
        .order("created_at", { ascending: true });

      return {
        type: 'parent' as const,
        data: {
          ...parentData,
          suborders: suborders || [],
        }
      };
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
