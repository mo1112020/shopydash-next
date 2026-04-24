import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterPage from "@/views/register";

export const metadata: Metadata = {
  title: "إنشاء حساب | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}
