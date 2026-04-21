import { Suspense } from "react";
import RegisterPage from "@/views/register";

export const metadata = { title: "إنشاء حساب | Shopydash" };

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}
