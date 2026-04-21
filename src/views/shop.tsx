"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Ensure this import exists
import {
  Store,
  Star,
  Clock,
  Phone,
  MapPin,
  ShoppingBag,
  MessageCircle,
  Navigation,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AR } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { ShopProductCard } from "@/components/ShopProductCard";
import { Input } from "@/components/ui/input";
import { shopsService, productsService } from "@/services";
import { SEO } from "@/components/SEO";



import { getShopOpenState } from "@/lib/shop-helpers";

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  // State for search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop", slug],
    queryFn: () => shopsService.getBySlug(slug!),
    enabled: !!slug,
  });

  // Fetch Working Hours
  const { data: workingHours } = useQuery({
    queryKey: ["shop-hours", shop?.id],
    queryFn: () => shop?.id ? shopsService.getHours(shop.id) : Promise.resolve([]),
    enabled: !!shop?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!shop?.id) return;

    const channel = supabase
      .channel(`shop-status-${shop.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT/UPDATE/DELETE)
          schema: 'public',
          table: 'shops',
          filter: `id=eq.${shop.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop", slug] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_working_hours',
          filter: `shop_id=eq.${shop.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-hours", shop.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop?.id, slug, queryClient]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "shop", shop?.id],
    queryFn: () => productsService.getAll({ shopId: shop?.id }),
    enabled: !!shop?.id,
  });

  // --- Handlers ---
  const handleOpenMaps = () => {
    if (shop?.latitude && shop?.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`,
        "_blank"
      );
    } else if (shop?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`,
        "_blank"
      );
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shop?.name,
        text: shop?.description || "",
        url: window.location.href,
      });
    }
  };

  const handleCall = () => {
    if (shop?.phone) {
      window.location.href = `tel:${shop.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (shop?.whatsapp) {
      window.open(`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`, "_blank");
    }
  };


  if (shopLoading) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Skeleton className="h-64 w-full" />
        <div className="container-app py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="py-16" dir="rtl">
        <div className="container-app text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">المتجر غير موجود</h2>
          <Link href="/shops">
            <Button variant="outline">عرض المتاجر</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (shop.is_active === false || shop.status !== "APPROVED") {
    return (
      <div className="py-24 min-h-[60vh] flex flex-col items-center justify-center" dir="rtl">
        <div className="container-app text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">المتجر غير متاح</h2>
          <p className="text-muted-foreground mb-6">
            عذراً، هذا المتجر متوقف حالياً عن استقبال الطلبات.
          </p>
          <Link href="/shops">
            <Button size="lg" className="w-full">عودة لقائمة المتاجر</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Status
  // If workingHours is undefined, pass empty array to rely on legacy/override
  const shopStatus = getShopOpenState(shop, workingHours || []);
  const isApproved = shop.approval_status === "APPROVED";
  const canOrder = isApproved && shopStatus.isOpen;

  // Format Today's Hours
  const today = new Date().getDay();
  const todayShifts = workingHours?.filter(h => h.day_of_week === today && h.is_enabled)
    .sort((a,b) => (a.period_index || 0) - (b.period_index || 0)) || [];
    
  let todayTimeRange = "مغلق اليوم";
  if (todayShifts.length > 0) {
    todayTimeRange = todayShifts.map(s => 
      `${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}`
    ).join(" / ");
  }

  // --- End Logic ---



  return (
    <div className="min-h-screen" dir="rtl">
      <SEO 
        title={shop.name} 
        description={shop.description || `تسوق من ${shop.name} عبر شوبي داش`} 
        image={shop.cover_url || shop.logo_url || "https://shopydash.store/logo.png"} 
        url={`https://shopydash.store/shops/${shop.slug}`} 
      />
      {/* Cover Hero Section */}
      <div className="relative mb-8 md:mb-12">
        <div className="relative h-32 md:h-48 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden rounded-b-3xl">
          {shop.cover_url ? (
            <img
              src={shop.cover_url}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-16 h-16 md:w-24 md:h-24 text-primary/20" />
            </div>
          )}
        </div>
        
        {/* Logo Overlay - Positioned at bottom right with white border */}
        <div className="absolute bottom-0 right-4 md:right-6 translate-y-1/2 z-10">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-black/5">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                <Store className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shop Info Section */}
      <div className="bg-background">
        <div className="container-app pb-2">
          {/* Main Title Row: Name, Badges, Orders */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{shop.name}</h1>
            
            {shop.is_premium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 border-0 text-[10px] md:text-xs py-0 h-5 md:h-6 px-1.5 md:px-2">
                <Star className="w-2.5 h-2.5 md:w-3 md:h-3 ml-1 fill-current" />
                مميز
              </Badge>
            )}

            {(shop as any).category && (
              <Badge variant="outline" className="text-[10px] md:text-xs py-0 h-5 md:h-6 px-1.5 md:px-2">
                {(shop as any).category?.icon && <span className="ml-1">{(shop as any).category.icon}</span>}
                {(shop as any).category?.name}
              </Badge>
            )}

            <span className="text-[10px] md:text-xs font-medium text-muted-foreground bg-muted/60 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
              {shop.total_orders || 0} طلب
            </span>
          </div>

          {/* Minimum Order Banner */}
          {shop.min_order_amount > 0 && (
            <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 text-primary text-sm font-medium">
              <ShoppingBag className="w-4 h-4" />
              <span>الحد الأدنى للطلب من هذا المتجر: {formatPrice(shop.min_order_amount)}</span>
            </div>
          )}

          {/* Warning if not approved */}
          {!isApproved && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                هذا المتجر قيد المراجعة ولا يقبل طلبات حالياً
              </p>
            </div>
          )}

          {/* Warning if closed */}
          {isApproved && !shopStatus.isOpen && (
            <div className="mt-4 p-3 bg-muted border rounded-lg">
              <p className="text-sm text-muted-foreground">
                 {shop.override_mode === 'FORCE_CLOSED' 
                   ? "المتجر مغلق مؤقتاً من قبل المالك. يرجى المحاولة لاحقاً."
                   : "المتجر مغلق حالياً حسب ساعات العمل. يمكنك تصفح المنتجات ولكن لا يمكنك الطلب."
                 }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-muted/30">
        <div className="container-app py-4 md:py-6">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="products" className="text-base">
                المنتجات
              </TabsTrigger>
              <TabsTrigger value="about" className="text-base">
                عن المتجر
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {!canOrder && (
                <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg">
                  لا يمكن الطلب من هذا المتجر حالياً
                </div>
              )}

              {/* Search & Categories */}
              <div className="space-y-4 sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن منتج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {products && products.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-sides">
                    <Badge
                      variant={selectedCategory === null ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedCategory(null)}
                    >
                      الكل
                    </Badge>
                    {/* Extract Unique Categories */}
                    {Array.from(new Set(products.map((p: any) => p.category?.id).filter(Boolean))).map((catId: any) => {
                      const category = products.find((p: any) => p.category?.id === catId)?.category;
                      if (!category) return null;
                      return (
                         <Badge
                          key={catId}
                          variant={selectedCategory === catId ? "default" : "outline"}
                          className="cursor-pointer whitespace-nowrap px-4 py-1.5 text-sm hover:opacity-80 transition-opacity flex items-center gap-1.5"
                          onClick={() => setSelectedCategory(catId)}
                        >
                          {/* {category.icon && <span>{category.icon}</span>} */}
                          {category.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i} className="overflow-hidden border-none shadow-none bg-muted/10">
                        <Skeleton className="aspect-square rounded-xl" />
                        <div className="pt-3 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(() => {
                      const filteredProducts = products?.filter((p: any) => {
                         const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                         const matchesCategory = selectedCategory ? p.category?.id === selectedCategory : true;
                         return matchesSearch && matchesCategory;
                      });

                      if (!filteredProducts || filteredProducts.length === 0) {
                         return (
                           <div className="col-span-full py-16 text-center">
                             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                               <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                             </div>
                             <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
                             <p className="text-muted-foreground">
                               لم يتم العثور على منتجات تطابق بحثك
                             </p>
                             {searchQuery && (
                               <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                                 مسح البحث
                               </Button>
                             )}
                           </div>
                         );
                      }

                      return filteredProducts.map((product: any) => (
                        <ShopProductCard 
                          key={product.id} 
                          product={product} 
                          shopId={shop!.id}
                          shop={shop}
                          canOrder={canOrder} 
                        />
                      ));
                    })()}
                  </div>
                </>
              )}
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about">
              <Card>
                <CardContent className="p-6 space-y-6" dir="rtl">
                  <div className="text-right">
                    <h3 className="font-semibold text-lg mb-4">عن المتجر</h3>
                    {shop.description ? (
                      <p className="text-muted-foreground leading-relaxed">
                        {shop.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        لا توجد معلومات إضافية عن المتجر
                      </p>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4 pt-4 border-t">
                    {shop.address && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-right">
                          <h4 className="font-medium mb-1">العنوان</h4>
                          <p className="text-muted-foreground text-sm">
                            {shop.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {shop.phone && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-right">
                          <h4 className="font-medium mb-1">رقم الهاتف</h4>
                          <p className="text-muted-foreground text-sm">
                            {shop.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-right">
                        <h4 className="font-medium mb-1">حالة المتجر</h4>
                        <div className="flex flex-col gap-1">
                          <p
                            className={`text-sm font-medium ${
                              shopStatus.isOpen ? "text-success" : "text-destructive"
                            }`}
                          >
                            {shopStatus.isOpen ? "مفتوح" : "مغلق"}
                          </p>
                          <p className="text-xs text-muted-foreground" dir="ltr">
                             {todayTimeRange}
                          </p>
                        </div>
                      </div>
                    </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={handleOpenMaps} disabled={!shop.latitude && !shop.address} className="flex-1 sm:flex-none">
                      <MapPin className="w-4 h-4 ml-2" />
                      Google Maps
                    </Button>
                    
                    {shop.phone && (
                      <Button variant="outline" onClick={handleCall} className="flex-1 sm:flex-none">
                        <Phone className="w-4 h-4 ml-2" />
                        اتصال
                      </Button>
                    )}

                    {shop.whatsapp && (
                      <Button variant="outline" onClick={handleWhatsApp} className="flex-1 sm:flex-none">
                        <MessageCircle className="w-4 h-4 ml-2" />
                        واتساب
                      </Button>
                    )}
                  </div>
                </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
