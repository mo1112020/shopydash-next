import { MetadataRoute } from "next";

const BASE_URL = "https://www.shopydash.store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shops`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  if (!supabaseUrl || !supabaseKey) return staticPages;

  try {
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    const [shopsRes, productsRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/shops?approval_status=eq.APPROVED&is_active=eq.true&select=slug,updated_at`,
        { headers, next: { revalidate: 3600 } }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/products?is_active=eq.true&select=id,updated_at`,
        { headers, next: { revalidate: 3600 } }
      ),
    ]);

    const shops: Array<{ slug: string; updated_at: string }> = await shopsRes.json();
    const products: Array<{ id: string; updated_at: string }> = await productsRes.json();

    const shopPages: MetadataRoute.Sitemap = Array.isArray(shops)
      ? shops.map((shop) => ({
          url: `${BASE_URL}/shops/${shop.slug}`,
          lastModified: new Date(shop.updated_at),
          changeFrequency: "daily" as const,
          priority: 0.8,
        }))
      : [];

    const productPages: MetadataRoute.Sitemap = Array.isArray(products)
      ? products.map((product) => ({
          url: `${BASE_URL}/products/${product.id}`,
          lastModified: new Date(product.updated_at),
          changeFrequency: "daily" as const,
          priority: 0.7,
        }))
      : [];

    return [...staticPages, ...shopPages, ...productPages];
  } catch {
    return staticPages;
  }
}
