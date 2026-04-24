import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPage from "@/views/login";

export const metadata: Metadata = {
  title: "تسجيل الدخول | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
