"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse hash fragment for token type
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const type = hashParams.get("type");

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          router.push("/login?error=auth_failed");
          return;
        }

        // Handle different auth event types
        if (type === "recovery") {
          // Password reset — redirect to reset page
          router.push("/reset-password");
          return;
        }

        if (type === "signup" || type === "email") {
          // Email verification — redirect to login with success message
          // Sign out first so they log in fresh
          await supabase.auth.signOut();
          router.push("/login?verified=true");
          return;
        }

        if (data.session) {
          // Successfully authenticated (Google OAuth or other)
          router.push("/");
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Callback error:", err);
        router.push("/login?error=callback_failed");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center"
      dir="rtl"
    >
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-lg text-muted-foreground">جاري المعالجة...</p>
      </div>
    </div>
  );
}
