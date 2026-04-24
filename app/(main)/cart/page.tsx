import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CartPage from "@/views/cart";

export const metadata = { title: "سلة المشتريات | Shopydash" };

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/cart");

  return <CartPage />;
}
