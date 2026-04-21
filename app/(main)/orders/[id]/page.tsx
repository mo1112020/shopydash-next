import { Suspense } from "react";
import OrderPage from "@/views/order";

export const metadata = { title: "تفاصيل الطلب | Shopydash" };

export default function Page() {
  return (
    <Suspense>
      <OrderPage />
    </Suspense>
  );
}
