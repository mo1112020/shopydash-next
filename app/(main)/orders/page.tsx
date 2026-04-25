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
    queryKey: ["orders", 1, user.id],
    queryFn: async () => {
      const pageSize = 6;
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
