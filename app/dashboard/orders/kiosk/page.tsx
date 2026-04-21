import { Suspense } from "react";
import KioskPage from "@/views/dashboard/kiosk";

export const metadata = { title: "كشك الطلبات | Shopydash" };

export default function Page() {
  return (
    <Suspense>
      <KioskPage />
    </Suspense>
  );
}
