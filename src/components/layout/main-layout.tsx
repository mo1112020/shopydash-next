"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileCartBar } from "@/components/cart/mobile-cart-bar";
import { useEffect } from "react";
import ReactGA from "react-ga4";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCheckoutPage = pathname.startsWith("/checkout");
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";
  const isProductDetailPage = /^\/products\/.+/.test(pathname);
  const isDashboardPage = pathname.startsWith("/dashboard");

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: pathname });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {!isCheckoutPage && !isAuthPage && !isProductDetailPage && !isDashboardPage && (
        <Footer />
      )}
      {!isCheckoutPage && !isAuthPage && !isProductDetailPage && !isDashboardPage && (
        <MobileCartBar />
      )}
    </div>
  );
}
