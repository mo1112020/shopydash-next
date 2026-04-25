"use client";

import Link from "next/link";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  Store,
  AlertCircle,
  CreditCard,
  Package,
  ArrowRight,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AR } from "@/lib/i18n";
import { formatPrice, cn } from "@/lib/utils";
import { useCart, useAuth } from "@/store";
import { useMemo, useState, useRef, useCallback } from "react";

export default function CartPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { cart, cartTotal, updateCartItem, removeFromCart } = useCart();

  // Debounce refs for quantity updates
  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingQtyRefs = useRef<Record<string, number>>({});

  // Group items by shop
  const itemsByShop = useMemo(() => {
    if (!cart?.items) return {};
    
    return cart.items.reduce((acc, item) => {
      const shopId = item.product?.shop_id || 'unknown';
      if (!acc[shopId]) {
        acc[shopId] = {
          shop: item.product?.shop || null,
          items: [],
          subtotal: 0,
        };
      }
      acc[shopId].items.push(item);
      acc[shopId].subtotal += (item.product?.price || 0) * item.quantity;
      return acc;
    }, {} as Record<string, any>);
  }, [cart?.items]);

  const shopsCount = Object.keys(itemsByShop).length;

  const inactiveShops = useMemo(() => {
    return Object.values(itemsByShop).filter(
      (data: any) => data.shop?.is_active === false || (data.shop?.status && data.shop?.status !== 'APPROVED')
    );
  }, [itemsByShop]);
  const hasInactiveShops = inactiveShops.length > 0;

  // Debounced quantity update to prevent crashes on rapid clicks
  const debouncedUpdate = useCallback((itemId: string, newQty: number) => {
    if (debounceRefs.current[itemId]) {
      clearTimeout(debounceRefs.current[itemId]);
    }
    pendingQtyRefs.current[itemId] = newQty;

    debounceRefs.current[itemId] = setTimeout(async () => {
      const qty = pendingQtyRefs.current[itemId];
      delete pendingQtyRefs.current[itemId];
      delete debounceRefs.current[itemId];

      try {
        if (qty <= 0) {
          await removeFromCart(itemId);
          notify.success(AR.cart.itemRemoved);
        } else {
          await updateCartItem(itemId, qty);
        }
      } catch {
        notify.error("حدث خطأ");
      }
    }, 250);
  }, [updateCartItem, removeFromCart]);

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (itemId.startsWith('temp-')) return; // Still syncing
    debouncedUpdate(itemId, newQuantity);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (itemId.startsWith('temp-')) return;
    try {
      await removeFromCart(itemId);
      notify.success(AR.cart.itemRemoved);
    } catch {
      notify.error("حدث خطأ");
    }
  };

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShoppingBag className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-6">
              قم بتسجيل الدخول لعرض سلة التسوق الخاصة بك
            </p>
            <Link href="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="py-16">
        <div className="container-app max-w-lg mx-auto text-center">
          <div className="py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h2 className="text-xl font-bold mb-2">{AR.cart.empty}</h2>
            <p className="text-muted-foreground mb-8 text-sm">
              {AR.cart.emptyDescription}
            </p>
            <Link href="/products">
              <Button className="gap-2 rounded-xl h-11 px-8">
                <Package className="w-4 h-4" />
                {AR.cart.startShopping}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="py-6 sm:py-8">
      <div className="container-app max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{AR.cart.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalItemCount} منتج {shopsCount > 1 ? `من ${shopsCount} متاجر` : ''}
            </p>
          </div>
          {shopsCount > 1 && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full">
              <Store className="w-3.5 h-3.5" />
              {shopsCount} متاجر
            </Badge>
          )}
        </div>

        {/* Inactive Shops Warning */}
        {hasInactiveShops && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">تنبيه المتاجر المتوقفة</p>
              <p className="mt-1 text-red-600/80 dark:text-red-400/70">
                بعض المنتجات في سلتك تنتمي لمتاجر متوقفة حالياً. يرجى إزالتها لتتمكن من إتمام الطلب.
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-3 space-y-5">
            {Object.entries(itemsByShop).map(([shopId, shopData]: [string, any]) => {
              const isInactive = shopData.shop?.is_active === false || (shopData.shop?.status && shopData.shop?.status !== 'APPROVED');
              
              return (
                <div
                  key={shopId}
                  className={cn(
                    "rounded-2xl border overflow-hidden",
                    isInactive && "border-red-200 dark:border-red-800/40"
                  )}
                >
                  {/* Shop Header */}
                  <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-b bg-muted/20",
                    isInactive && "bg-red-50/50 dark:bg-red-950/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {shopData.shop?.logo_url ? (
                          <img
                            src={shopData.shop.logo_url}
                            alt={shopData.shop.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                            <Store className="w-5 h-5 text-primary/60" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          {shopData.shop?.name || 'متجر'}
                          {isInactive && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">متوقف</Badge>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {shopData.items.length} منتج • {formatPrice(shopData.subtotal)}
                        </p>
                      </div>
                    </div>
                    {shopsCount > 1 && (
                      <Badge variant="outline" className="text-[10px] rounded-full">
                        متجر {Object.keys(itemsByShop).indexOf(shopId) + 1}
                      </Badge>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="divide-y">
                    {shopData.items.map((item: any) => (
                      <div key={item.id} className="flex gap-4 p-4 sm:p-5">
                        {/* Image */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                              <ShoppingBag className="w-6 h-6 text-primary/30" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="font-semibold text-sm line-clamp-2 leading-tight">
                              {item.product?.name}
                            </h4>
                            <p className="text-primary font-bold text-base mt-1.5">
                              {formatPrice(item.product?.price || 0)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity Pills */}
                            <div className="flex items-center rounded-full border overflow-hidden">
                              <button
                                onClick={() =>
                                  item.quantity <= 1
                                    ? handleRemoveItem(item.id)
                                    : handleUpdateQuantity(item.id, item.quantity - 1)
                                }
                                className={cn(
                                  "h-8 w-8 flex items-center justify-center transition-colors",
                                  item.quantity <= 1
                                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    : "hover:bg-muted"
                                )}
                              >
                                {item.quantity <= 1 ? (
                                  <Trash2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Minus className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="w-9 text-center font-bold text-sm select-none tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity + 1)
                                }
                                className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Line total */}
                            <span className="text-sm font-bold text-foreground">
                              {formatPrice((item.product?.price || 0) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Continue Shopping */}
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {AR.cart.continueShopping}
            </Link>
          </div>

          {/* ── Order Summary Sidebar ──────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-background p-6 sticky top-24 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {AR.checkout.orderSummary}
              </h3>

              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {AR.cart.subtotal} ({totalItemCount} منتج)
                  </span>
                  <span className="font-medium">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {AR.cart.deliveryFee}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    يُحسب عند الدفع
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/60 dark:bg-amber-950/10 p-3 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 border border-amber-100 dark:border-amber-900/20">
                <span>💡</span>
                <span>رسوم التوصيل تُحسب في الخطوة التالية بعد تحديد العنوان</span>
              </div>
              
              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-bold text-base">{AR.cart.total}</span>
                <div className="text-left">
                  <span className="font-black text-xl text-primary">
                    {formatPrice(cartTotal)}
                  </span>
                  <span className="text-[10px] text-muted-foreground mr-1">+ التوصيل</span>
                </div>
              </div>

              <Link
                href={hasInactiveShops ? "#" : "/checkout"}
                className="block"
                onClick={(e) => hasInactiveShops && e.preventDefault()}
              >
                <Button
                  className="w-full h-12 rounded-xl text-base font-bold gap-2"
                  size="lg"
                  disabled={hasInactiveShops}
                >
                  {hasInactiveShops ? (
                    "يرجى إزالة منتجات المتاجر المتوقفة"
                  ) : (
                    <>
                      {AR.cart.checkout}
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
