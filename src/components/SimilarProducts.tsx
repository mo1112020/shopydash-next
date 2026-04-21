"use client";

import { useQuery } from "@tanstack/react-query";
import { productsService } from "@/services";
import { ShopProductCard } from "@/components/ShopProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SimilarProductsProps {
  shopId: string;
  currentProductId: string;
  categoryId?: string;
}

// ... imports
import { getShopOpenState } from "@/lib/shop-helpers";
import { supabase } from "@/lib/supabase";

export function SimilarProducts({ shopId, currentProductId, categoryId }: SimilarProductsProps) {
  // Fetch Shop Open State
  const { data: shopStatus } = useQuery({
    queryKey: ["shop-status", shopId],
    queryFn: async () => {
      // We need shop details (override_mode) and working hours
      const { data: shop } = await supabase
        .from("shops")
        .select("override_mode")
        .eq("id", shopId)
        .single();
        
      const { data: workingHours } = await supabase
        .from("shop_working_hours")
        .select("*")
        .eq("shop_id", shopId);
      
      if (!shop) return { isOpen: true }; // Fallback

      return getShopOpenState(
        shop as any, 
        workingHours || []
      );
    },
    enabled: !!shopId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["similar-products", shopId, currentProductId],
    queryFn: async () => {
      // Fetch all products from the shop
      const allShopProducts = await productsService.getAll({ shopId });
      
      // Filter out current product and optionally prioritize same category
      return allShopProducts
        .filter(p => p.id !== currentProductId)
        .sort((a, b) => {
           // Prioritize same category if available
           if (categoryId) {
             if (a.category_id === categoryId && b.category_id !== categoryId) return -1;
             if (a.category_id !== categoryId && b.category_id === categoryId) return 1;
           }
           // Then prioritize in-stock
           if (a.stock_quantity > 0 && b.stock_quantity <= 0) return -1;
           if (a.stock_quantity <= 0 && b.stock_quantity > 0) return 1;
           return 0;
        })
        .slice(0, 10); // Limit to 10
    },
    enabled: !!shopId,
  });

  const isShopOpen = shopStatus?.isOpen ?? true;

  if (isLoading) {
// ... skeleton
  }

  if (!products || products.length === 0) return null;

  return (
    <div className="space-y-4 py-8 border-t">
      <h2 className="text-2xl font-bold">منتجات قد تعجبك</h2>
      
      <ScrollArea className="w-full whitespace-nowrap rounded-md border-none">
        <div className="flex w-max space-x-4 p-1 space-x-reverse" dir="rtl">
          {products.map((product) => (
            <div key={product.id} className="w-[250px] whitespace-normal">
               <ShopProductCard 
                  product={product} 
                  shopId={shopId} 
                  canOrder={isShopOpen} 
               />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
