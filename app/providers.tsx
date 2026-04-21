"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/store";
import { Toaster } from "@/components/ui/toaster";
import ReactGA from "react-ga4";
import { useEffect, useRef } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = makeQueryClient();
  }

  useEffect(() => {
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (gaMeasurementId) {
      setTimeout(() => {
        ReactGA.initialize(gaMeasurementId);
      }, 2500);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <AppProvider>
        {children}
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}
