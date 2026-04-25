import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.shopydash.store";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables");
}

export const supabase = createBrowserClient<Database>(
  SUPABASE_URL || "",
  SUPABASE_ANON_KEY || "",
  {
    cookieOptions: {
      domain: typeof window !== "undefined" && window.location.hostname.includes("shopydash.store") 
        ? ".shopydash.store" 
        : "localhost",
      path: "/",
      sameSite: "Lax",
    }
  }
);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Auth helpers
export const signUp = async (
  email: string,
  password: string,
  fullName: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Google OAuth sign in
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${SITE_URL}/auth/callback`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const globalSignOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  return { error };
};

export const resendVerificationEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });
  return { data, error };
};

export const forgotPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo: `${SITE_URL}/auth/callback`,
    }
  );
  return { data, error };
};

export const resetPassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

export const getCurrentUser = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { user: session?.user || null, error };
};

export const getSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { session, error };
};

// Storage helpers
export const uploadImage = async (
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> => {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
};

export const deleteImage = async (bucket: string, path: string) => {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error };
};

// Realtime subscriptions
export const subscribeToOrderUpdates = (
  orderId: string,
  callback: (payload: unknown) => void
) => {
  return supabase
    .channel(`order-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_status_history",
        filter: `order_id=eq.${orderId}`,
      },
      callback
    )
    .subscribe();
};

export const subscribeToShopOrders = (
  shopId: string,
  callback: (payload: unknown) => void
) => {
  return supabase
    .channel(`shop-orders-${shopId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `shop_id=eq.${shopId}`,
      },
      callback
    )
    .subscribe();
};
