"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Store, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AR } from "@/lib/i18n";
import { shopsService } from "@/services";
import { ShopCard } from "@/components/ShopCard";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function ShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const activeCategorySlug = searchParams.get("category");
  const queryClient = useQueryClient();

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("shops-list-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shops"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops"],
    queryFn: () => shopsService.getRankedShops(),
  });

  const availableCategories = useMemo(() => {
    if (!shops) return [];
    const categoryMap = new Map();
    shops.forEach((shop: any) => {
      if (shop.category) {
        categoryMap.set(shop.category.id, shop.category);
      }
    });
    return Array.from(categoryMap.values()).sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
  }, [shops]);

  const filteredShops = useMemo(() => {
    if (!shops) return [];
    return shops.filter((shop: any) => {
      const matchesSearch =
        !search || shop.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !activeCategorySlug || shop.category?.slug === activeCategorySlug;
      return matchesSearch && matchesCategory;
    });
  }, [shops, search, activeCategorySlug]);

  const handleCategoryClick = (slug: string) => {
    if (activeCategorySlug === slug) {
      router.push("/shops");
    } else {
      router.push(`/shops?category=${encodeURIComponent(slug)}`);
    }
  };

  return (
    <div className="py-8">
      <div className="container-app">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{AR.shops.title}</h1>
          <p className="text-muted-foreground mt-2">اكتشف أفضل المتاجر في منطقتك</p>
        </div>

        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن متجر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        <div className="mb-8">
          <div
            className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2"
            dir="rtl"
          >
            {availableCategories.length > 0 &&
              availableCategories.map((category) => {
                const isActive = category.slug === activeCategorySlug;
                return (
                  <Badge
                    key={category.id}
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all px-4 py-2 text-sm gap-2 whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
                        : "hover:bg-primary/10 hover:border-primary/30"
                    )}
                    onClick={() => handleCategoryClick(category.slug)}
                  >
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </Badge>
                );
              })}
          </div>
          {activeCategorySlug && (
            <div className="mt-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
              يتم عرض {filteredShops.length} متجر في قسم{" "}
              {availableCategories.find((c) => c.slug === activeCategorySlug)?.name}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-20 h-20 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))
            : filteredShops.map((shop: any, i: number) => (
                <ShopCard key={shop.id} shop={shop} index={i} />
              ))}
        </div>

        {filteredShops.length === 0 && !isLoading && (
          <div className="empty-state py-16">
            <div className="empty-state-icon">
              <Store className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{AR.shops.noShops}</h2>
            <p className="text-muted-foreground">
              لم يتم العثور على متاجر مطابقة لبحثك
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
