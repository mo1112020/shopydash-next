import { Suspense } from "react";
import LoginPage from "@/views/login";

export const metadata = { title: "تسجيل الدخول | Shopydash" };

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
