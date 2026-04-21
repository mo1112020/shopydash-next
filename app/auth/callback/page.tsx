import { Suspense } from "react";
import AuthCallback from "@/views/auth/callback";

export default function Page() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
