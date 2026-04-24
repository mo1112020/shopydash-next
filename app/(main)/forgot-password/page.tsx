import type { Metadata } from "next";
import ForgotPasswordPage from "@/views/forgot-password";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور | Shopydash",
  robots: { index: false },
};

export default function Page() {
  return <ForgotPasswordPage />;
}
