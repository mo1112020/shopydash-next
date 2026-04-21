import { Suspense } from "react";
import DashboardPage from "@/views/dashboard";

export const metadata = { title: "لوحة التحكم | Shopydash" };

export default function Page() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
