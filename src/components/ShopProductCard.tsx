"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart, useAuth } from "@/store/app-context";
import { Product } from "@/types/database";
import { formatPrice, cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { calculateDiscountedPrice } from "@/lib/offer-helpers";

interface ShopProductCardProps {
  product: Product;
  shopId: string;
  shop?: any;
  canOrder: boolean;
  onAddToCart?: () => void;
}

export function ShopProductCard({ product, shopId, shop, canOrder, onAddToCart }: ShopProductCardProps) {
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  // Debounce ref to prevent rapid-fire clicks
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingQuantityRef = useRef<number | null>(null);

  // Derive quantity directly from cart state (always in sync, no local state needed)
  const cartItem = cart?.items?.find((item: any) => item.product_id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  const requireAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      notify.error("يجب تسجيل الدخول أولاً للإضافة للسلة");
      router.push("/login");
      return false;
    }
    return true;
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canOrder || isPending) return;
    if (!requireAuth(e)) return;

    if (onAddToCart) { onAddToCart(); return; }

    setIsPending(true);
    addToCart(shopId, product.id, 1, product)
      .catch((err: any) => {
        if (err?.message !== 'SILENT_MODAL_LIMIT_EXCEEDED') {
          notify.error(err.message || "فشل إضافة المنتج");
        }
      })
      .finally(() => setIsPending(false));
  };

  // Debounced update to prevent rapid-fire API calls that crash
  const debouncedUpdate = useCallback((itemId: string, newQty: number) => {
    // Cancel any pending update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    pendingQuantityRef.current = newQty;

    debounceRef.current = setTimeout(() => {
      const qty = pendingQuantityRef.current;
      if (qty === null) return;
      pendingQuantityRef.current = null;

      if (qty <= 0) {
        removeFromCart(itemId).catch(() => {});
      } else {
        updateCartItem(itemId, qty).catch(() => {});
      }
    }, 200);
  }, [updateCartItem, removeFromCart]);

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;

    const next = quantity + 1;
    if (next > product.stock_quantity) {
      notify.error(`الكمية المتاحة: ${product.stock_quantity}`);
      return;
    }

    // If the item has a temp ID, rely on optimistic UI via addToCart instead
    if (cartItem.id.startsWith('temp-')) {
      // Item is still syncing with the server — update optimistically only
      return;
    }

    debouncedUpdate(cartItem.id, next);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;

    // If the item has a temp ID, skip — still syncing
    if (cartItem.id.startsWith('temp-')) return;

    const next = quantity - 1;
    debouncedUpdate(cartItem.id, next);
  };

  const discountPercentage =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  // Global Offer overrides normal display if enabled
  const { discountedPrice, hasOffer, originalPrice } = calculateDiscountedPrice(product.price, shop);
  const displayPrice = hasOffer ? discountedPrice : product.price;
  
  // Calculate percentage dynamically for the badge if there's a global offer
  const displayDiscountPercentage = hasOffer && originalPrice > 0 
    ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
    : discountPercentage;

  const inCart = quantity > 0;

  return (
    <Link
      href={canOrder ? `/products/${product.id}` : "#"}
      className={cn("group block h-full", !canOrder && "pointer-events-none opacity-60")}
    >
      <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:shadow-lg hover:border-primary/20 relative">
        {/* Image Container */}
        <div className="aspect-square relative overflow-hidden bg-muted/50">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-105",
                product.stock_quantity <= 0 && "grayscale opacity-80"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/20" />
            </div>
          )}

          {/* Discount badge */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {displayDiscountPercentage > 0 && (
              <Badge variant="destructive" className="font-bold shadow-sm backdrop-blur-sm">
                {hasOffer && <span className="mr-1">عرض</span>}
                -{displayDiscountPercentage}%
              </Badge>
            )}
          </div>

          {/* Out-of-stock overlay */}
          {product.stock_quantity <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] z-10">
              <Badge variant="secondary" className="font-bold text-sm px-3 py-1 shadow-md opacity-90">
                غير متوفر
              </Badge>
            </div>
          )}

          {/* ── Cart control — bottom-right of image ── */}
          {canOrder && product.stock_quantity > 0 && (
            <div className="absolute bottom-3 right-3 z-20">
              {/* When quantity > 0 show  ─  qty  + pill */}
              {inCart ? (
                <div
                  dir="ltr"
                  className={cn(
                    "flex items-center gap-0 bg-primary rounded-full shadow-lg overflow-hidden",
                    "transition-all duration-200 ease-out",
                    "opacity-100 translate-y-0"
                  )}
                >
                  <button
                    onClick={handleDecrease}
                    className="h-8 w-8 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors rounded-l-full"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span
                    className="text-white font-bold text-sm min-w-[1.5rem] text-center select-none tabular-nums"
                    key={quantity}
                  >
                    {quantity}
                  </span>

                  <button
                    onClick={handleIncrease}
                    className="h-8 w-8 flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors rounded-r-full"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* When quantity === 0 show plain + button */
                <Button
                  size="icon"
                  className={cn(
                    "rounded-full shadow-lg transition-all duration-200",
                    "opacity-100 md:opacity-0 md:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
                    "bg-primary hover:bg-primary/90"
                  )}
                  onClick={handleAdd}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 md:p-4 flex flex-col gap-1.5 flex-1">
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>

          <div className="flex items-end justify-between mt-auto pt-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base md:text-lg text-primary">
                  {formatPrice(displayPrice)}
                </span>
                {(hasOffer || (product.compare_at_price && product.compare_at_price > product.price)) && (
                  <span className="text-muted-foreground line-through text-[10px] md:text-xs decoration-destructive/50">
                    {formatPrice(hasOffer ? originalPrice : product.compare_at_price!)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
