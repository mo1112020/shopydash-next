import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/database";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  
  // Need to get host to know which domain to scope cookies to
  // If headers() is not available during build/static generation, we default to localhost
  let host = "localhost";
  try {
    host = headers().get("host") || "localhost";
  } catch (e) {
    // Next.js throws when calling headers() in static generation
  }
  
  const cookieDomain = host.includes("shopydash.store") ? ".shopydash.store" : "localhost";

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, { ...options, domain: cookieDomain });
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
