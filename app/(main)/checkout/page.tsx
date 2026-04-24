import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CheckoutPage from "@/views/checkout";

export const metadata = { title: "إتمام الطلب | Shopydash" };

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/checkout");

  return <CheckoutPage />;
}
