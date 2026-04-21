"use client";

import { useEffect } from "react";
import { AR } from "@/lib/i18n";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

// Client-side title updater — server-side metadata is handled via generateMetadata in each page.tsx
export function SEO({ title }: SEOProps) {
  const siteTitle = title ? `${title} | Shopydash` : AR.app.name;

  useEffect(() => {
    document.title = siteTitle;
  }, [siteTitle]);

  return null;
}
