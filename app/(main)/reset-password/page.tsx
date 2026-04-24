import type { Metadata } from "next";
import ResetPasswordPage from "@/views/reset-password";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return <ResetPasswordPage />;
}
