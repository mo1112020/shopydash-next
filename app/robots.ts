import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shops", "/shops/", "/products", "/products/", "/about"],
        disallow: [
          "/dashboard/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/orders/",
          "/auth/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: "https://www.shopydash.store/sitemap.xml",
    host: "https://www.shopydash.store",
  };
}
