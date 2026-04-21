"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Package,
  ShoppingBag,
  Phone,
  MapPin,
  Clock,
  ClipboardList,
  CheckCircle,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Store,
  MessageCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Hash,
  CreditCard,
  Timer,
  CircleDot,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AR } from "@/lib/i18n";
import { formatPrice, cn } from "@/lib/utils";
import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services";
import type { OrderStatus, ParentOrderWithSuborders, OrderWithItems } from "@/types/database";

const statusIcons: Record<OrderStatus, typeof Package> = {
  PLACED: ClipboardList,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY_FOR_PICKUP: Store,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: XCircle,
  CANCELLED_BY_SHOP: Store,
  CANCELLED_BY_ADMIN: XCircle,
};

const statusOrder: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const statusLabels: Record<string, string> = {
  PLACED: "تم الاستلام",
  CONFIRMED: "تم التأكيد",
  PREPARING: "قيد التجهيز",
  READY_FOR_PICKUP: "جاهز",
  OUT_FOR_DELIVERY: "في الطريق",
  DELIVERED: "تم التسليم",
};

// ─── Helper: Format order number to show only last 6 chars ───────────
function formatOrderId(orderNumber: string): string {
  if (!orderNumber) return "";
  // Show last 6 characters as a short ID
  const shortId = orderNumber.slice(-6).toUpperCase();
  return `#${shortId}`;
}

// ─── Visual Order Tracker (Step Progress) ────────────────────────────
function OrderTracker({
  currentStatus,
  statusHistory,
  isCancelled,
  isDelivered,
  cancellationReason,
  cancelledBy,
}: {
  currentStatus: OrderStatus;
  statusHistory?: any[];
  isCancelled: boolean;
  isDelivered: boolean;
  cancellationReason?: string;
  cancelledBy?: string;
}) {
  const currentIndex = statusOrder.indexOf(currentStatus);

  if (isCancelled) {
    return (
      <div className="p-5 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200/50 dark:border-red-800/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400">
              تم إلغاء الطلب
            </h3>
            {cancelledBy && (
              <p className="text-xs text-red-500 dark:text-red-400/70">
                {cancelledBy === "CANCELLED_BY_ADMIN" ? "بواسطة الإدارة" : "بواسطة المتجر"}
              </p>
            )}
          </div>
        </div>
        {cancellationReason && (
          <div className="mt-3 p-3 bg-white/60 dark:bg-red-950/40 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-300">
              <span className="font-semibold">السبب: </span>
              {cancellationReason}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {statusOrder.map((status, index) => {
        const isCompleted = currentIndex >= index;
        const isCurrent = currentIndex === index;
        const isLast = index === statusOrder.length - 1;
        const StatusIcon = statusIcons[status];
        const historyEntry = statusHistory?.find((h) => h.status === status);

        return (
          <div key={status} className="flex gap-4">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0",
                  isCompleted
                    ? isDelivered && isLast
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                      : "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted/60 text-muted-foreground/40 border-2 border-muted",
                  isCurrent &&
                    !isDelivered &&
                    "ring-4 ring-primary/20 scale-110"
                )}
              >
                <StatusIcon className="w-4.5 h-4.5" />
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 h-10 my-1 rounded-full transition-all duration-500",
                    isCompleted && currentIndex > index
                      ? isDelivered
                        ? "bg-green-500"
                        : "bg-primary"
                      : "bg-muted"
                  )}
                />
              )}
            </div>

            {/* Label + time */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "font-semibold text-sm mt-2.5 leading-tight",
                  isCompleted ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {statusLabels[status] || ORDER_STATUS_CONFIG[status]?.label}
              </p>
              {historyEntry && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(historyEntry.created_at).toLocaleTimeString("ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  •{" "}
                  {new Date(historyEntry.created_at).toLocaleDateString("ar-EG", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      // 1. Try single/sub order
      const order = await orderService.getById(id!);
      if (order) return { type: 'single' as const, data: order as OrderWithItems };

      // 2. Try parent order
      const parent = await orderService.getParentOrder(id!);
      if (parent) return { type: 'parent' as const, data: parent as ParentOrderWithSuborders };

      return null;
    },
    enabled: !!id && isAuthenticated,
    refetchInterval: 10000, 
  });

  const queryClient = useQueryClient();

  // Real-time Subscription
  useEffect(() => {
    if (!orderData || !id) return;

    const channels: any[] = [];

    if (orderData.type === 'parent') {
      // Subscribe to Parent Order
      const parentChannel = supabase
        .channel(`parent-order-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "parent_orders",
            filter: `id=eq.${id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
            notify.info("تم تحديث حالة الطلب");
          }
        )
        .subscribe();
      channels.push(parentChannel);

      // Subscribe to Suborders
      const subChannel = supabase
        .channel(`suborders-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `parent_order_id=eq.${id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["order", id] });
          }
        )
        .subscribe();
      channels.push(subChannel);
      
    } else {
      // Subscribe to Single Order
      const singleChannel = supabase
        .channel(`order-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `id=eq.${id}`,
          },
          () => {
             queryClient.invalidateQueries({ queryKey: ["order", id] });
             notify.info("تم تحديث حالة الطلب");
          }
        )
        .subscribe();
      channels.push(singleChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [id, orderData?.type, queryClient]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const copyOrderNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    notify.success("تم نسخ رقم الطلب");
  };

  const contactShop = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const contactWhatsApp = (phone: string, orderNum: string) => {
    const p = phone.replace(/^0/, "20");
    const message = `مرحباً، أستفسر عن الطلب رقم ${orderNum}`;
    window.open(
      `https://wa.me/${p}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">يجب تسجيل الدخول</h2>
            <Link href="/login">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container-app max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="py-16">
        <div className="container-app text-center">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">الطلب غير موجود</h2>
            <p className="text-muted-foreground mb-4">
              تأكد من رقم الطلب وحاول مرة أخرى
            </p>
            <Link href="/orders">
              <Button>{AR.orders.title}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Render Parent Order View
  // ═══════════════════════════════════════════════════════════════════
  if (orderData.type === 'parent') {
    const order = orderData.data;
    const isCancelled = order.status === 'CANCELLED';
    const activeSuborders = order.suborders.filter(s => s.status !== 'CANCELLED');
    const allDelivered = activeSuborders.length > 0 && activeSuborders.every(s => s.status === 'DELIVERED');
    
    // Calculate overall progress based on suborders
    let overallStatus = order.status;
    if (activeSuborders.length > 0) {
      if (activeSuborders.some(s => s.status === 'OUT_FOR_DELIVERY')) overallStatus = 'OUT_FOR_DELIVERY';
      else if (activeSuborders.some(s => s.status === 'READY_FOR_PICKUP')) overallStatus = 'READY_FOR_PICKUP';
      else if (activeSuborders.some(s => s.status === 'PREPARING')) overallStatus = 'PREPARING';
    }

    return (
      <div className="py-6 sm:py-8">
        <div className="container-app max-w-4xl mx-auto">
          {/* Back */}
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للطلبات
          </Link>

          {/* ── Hero Header Card ──────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/10 border p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs font-semibold">
                    طلب مجمّع
                  </Badge>
                  <Badge
                    variant="default"
                    className={cn("text-xs", 
                      isCancelled ? "bg-destructive" : 
                      allDelivered ? "bg-green-500" : 
                      "bg-primary"
                    )}
                  >
                    {isCancelled ? 'ملغي' : allDelivered ? 'تم التسليم' : 'جاري المعالجة'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                    {formatOrderId(order.order_number)}
                  </h1>
                  <button
                    onClick={() => copyOrderNumber(order.order_number)}
                    className="p-2 hover:bg-muted rounded-xl transition-colors group"
                    title="نسخ رقم الطلب الكامل"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDateTime(order.created_at)}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-muted-foreground mb-1">الإجمالي</p>
                <p className="text-3xl font-black text-primary">
                  {formatPrice(order.total)}
                </p>
              </div>
            </div>
            {/* Subtle decorator */}
            <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              
              {/* ── Delivery Status ────────────────────────────────── */}
              <div className="rounded-2xl border bg-background p-6">
                <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-primary" />
                  </div>
                  حالة التوصيل
                </h2>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 mb-6">
                   <div className="p-3 bg-primary/10 rounded-full">
                     <Timer className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <p className="font-semibold text-sm">الوقت المقدر</p>
                     <p className="text-muted-foreground text-sm">
                       {order.route_minutes ? `${Math.ceil(order.route_minutes)} - ${Math.ceil(order.route_minutes + 15)} دقيقة` : '30-45 دقيقة'}
                     </p>
                   </div>
                </div>
                
                {/* Suborders List */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">تفاصيل المتاجر ({order.suborders.length})</h3>
                  {order.suborders.map((suborder) => (
                    <div key={suborder.id} className="border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                            {suborder.shop?.logo_url ? (
                              <img src={suborder.shop.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                             <h4 className="font-semibold text-sm">{suborder.shop?.name}</h4>
                             <Badge 
                               variant="outline" 
                               className={cn(
                                 "text-[10px] mt-1",
                                 suborder.status === 'DELIVERED' && "border-green-300 text-green-600 bg-green-50",
                                 suborder.status === 'CANCELLED' && "border-red-300 text-red-600 bg-red-50"
                               )}
                             >
                               {ORDER_STATUS_CONFIG[suborder.status].label}
                             </Badge>
                             {(suborder.status === 'CANCELLED' || suborder.status === 'CANCELLED_BY_SHOP' || suborder.status === 'CANCELLED_BY_ADMIN') && suborder.cancellation_reason && (
                               <div className="mt-2 text-xs text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                                 <span className="font-semibold">سبب الإلغاء:</span> {suborder.cancellation_reason}
                               </div>
                             )}
                          </div>
                        </div>
                        {suborder.shop?.phone && (
                           <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => contactShop(suborder.shop.phone)}>
                             <Phone className="w-4 h-4" />
                           </Button>
                        )}
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 mr-[52px]">
                        {suborder.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.quantity}x {item.product_name}</span>
                            <span className="font-medium">{formatPrice(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Delivery Info ──────────────────────────────────── */}
              <div className="rounded-2xl border bg-background p-6">
                <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  {AR.checkout.deliveryInfo}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{AR.checkout.address}</p>
                      <p className="font-medium text-sm">{order.delivery_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                     <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                     <div>
                       <p className="text-xs text-muted-foreground mb-1">{AR.checkout.phone}</p>
                       <p className="font-medium text-sm font-mono" dir="ltr">{order.customer_phone}</p>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar Summary ──────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border bg-background p-6 sticky top-24">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  {AR.checkout.orderSummary}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{AR.cart.subtotal}</span>
                    <span className="font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{AR.cart.deliveryFee}</span>
                    <span className="font-medium">{formatPrice(order.total_delivery_fee)}</span>
                  </div>
                  {order.platform_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">رسوم الخدمة</span>
                      <span className="font-medium">{formatPrice(order.platform_fee)}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-base">الإجمالي</span>
                  <span className="font-black text-xl text-primary">{formatPrice(order.total)}</span>
                </div>
                
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    {order.payment_method === 'COD' ? 'الدفع عند الاستلام' : order.payment_method}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Render Single Order View
  // ═══════════════════════════════════════════════════════════════════
  const order = orderData.data as OrderWithItems;
  const currentStatusIndex = statusOrder.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === "CANCELLED" || order.status === "CANCELLED_BY_SHOP" || order.status === "CANCELLED_BY_ADMIN";
  const isDelivered = order.status === "DELIVERED";
  const isActive = !isCancelled && !isDelivered;

  return (
    <div className="py-6 sm:py-8">
      <div className="container-app max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للطلبات
        </Link>

        {/* ── Hero Header Card ────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/10 border p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {order.parent_order && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    طلب مشترك
                  </Badge>
                )}
                <Badge
                  variant="default"
                  className={cn("text-xs",
                    isCancelled ? "bg-destructive" :
                    isDelivered ? "bg-green-500" :
                    "bg-primary"
                  )}
                >
                  {ORDER_STATUS_CONFIG[order.status as OrderStatus]?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  {formatOrderId(order.order_number)}
                </h1>
                <button
                  onClick={() => copyOrderNumber(order.order_number)}
                  className="p-2 hover:bg-muted rounded-xl transition-colors group"
                  title={`نسخ الرقم الكامل: ${order.order_number}`}
                >
                  <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(order.created_at)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground mb-1">الإجمالي</p>
              <p className="text-3xl font-black text-primary">
                {formatPrice(order.total)}
              </p>
            </div>
          </div>
          {/* Subtle decorator */}
          <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
        </div>

        {/* Multi-Store Parent Link Banner */}
        {order.parent_order && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                   <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                   <p className="font-semibold text-sm">هذا الطلب جزء من طلب مجمّع</p>
                   <p className="text-xs text-muted-foreground">
                      تم دمج الرسوم والتوصيل في الطلب الرئيسي {formatOrderId(order.parent_order.order_number)}
                   </p>
                </div>
             </div>
             <Link href={`/orders/${order.parent_order.id}`}>
                <Button size="sm" variant="outline" className="gap-2 rounded-xl">
                   عرض الطلب المجمّع
                   <ArrowRight className="w-4 h-4 rotate-180" />
                </Button>
             </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            
            {/* ── Order Progress Tracker ──────────────────────────── */}
            <div className="rounded-2xl border bg-background p-6">
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                {AR.orders.trackOrder}
              </h2>

              <OrderTracker
                currentStatus={order.status as OrderStatus}
                statusHistory={(order as any).status_history}
                isCancelled={isCancelled}
                isDelivered={isDelivered}
                cancellationReason={(order as any).cancellation_reason}
                cancelledBy={order.status}
              />

              {/* Estimated Time */}
              {isActive && (
                <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-full">
                    <Timer className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">الوقت المتوقع للتوصيل</p>
                    <p className="text-sm text-muted-foreground">
                      30-45 دقيقة
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Order Items ─────────────────────────────────────── */}
            <div className="rounded-2xl border bg-background p-6">
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                {AR.orders.items} ({order.items?.length})
              </h2>
              <div className="space-y-0 divide-y">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex-shrink-0 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-primary/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} × {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-bold text-primary text-sm">
                      {formatPrice(item.total_price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Delivery Info ────────────────────────────────────── */}
            <div className="rounded-2xl border bg-background p-6">
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                {AR.checkout.deliveryInfo}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {AR.checkout.address}
                    </p>
                    <p className="font-medium text-sm">{order.delivery_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                  <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {AR.checkout.phone}
                    </p>
                    <p className="font-medium text-sm font-mono" dir="ltr">
                      {order.customer_phone}
                    </p>
                  </div>
                </div>
              </div>
              {order.delivery_notes && (
                <div className="flex items-start gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl mt-3 border border-amber-100 dark:border-amber-900/20">
                  <ClipboardList className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                      {AR.checkout.notes}
                    </p>
                    <p className="font-medium text-sm">{order.delivery_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Shop Card */}
            <div className="rounded-2xl border bg-background p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {order.shop?.logo_url ? (
                    <img
                      src={order.shop.logo_url}
                      alt={order.shop.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                      <Store className="w-6 h-6 text-primary/60" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold">{order.shop?.name}</p>
                  {order.shop?.phone && (
                    <p
                      className="text-xs text-muted-foreground font-mono mt-0.5"
                      dir="ltr"
                    >
                      {order.shop.phone}
                    </p>
                  )}
                </div>
              </div>

              {order.shop?.phone && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 rounded-xl h-10"
                    onClick={() => contactShop(order.shop.phone)}
                  >
                    <Phone className="w-4 h-4" />
                    اتصال
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 rounded-xl h-10"
                    onClick={() =>
                      contactWhatsApp(order.shop.phone, order.order_number)
                    }
                  >
                    <MessageCircle className="w-4 h-4" />
                    واتساب
                  </Button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="rounded-2xl border bg-background p-6 sticky top-24">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                {AR.checkout.orderSummary}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {AR.cart.subtotal}
                  </span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {AR.cart.deliveryFee}
                  </span>
                  <span className="font-medium">
                    {order.parent_order ? (
                       <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">مشترك</span>
                    ) : (
                       formatPrice(order.delivery_fee) 
                    )}
                  </span>
                </div>
                {order.platform_fee > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">رسوم الخدمة</span>
                    <span className="font-medium">{formatPrice(order.platform_fee)}</span>
                  </div>
                ) : order.parent_order && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">رسوم الخدمة</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">مشترك</span>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-base">{AR.cart.total}</span>
                <span className="font-black text-xl text-primary">
                  {formatPrice(order.total)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  الدفع عند الاستلام
                </p>
              </div>

              {/* Reorder Button - Only for delivered orders */}
              {isDelivered && (
                <Link
                  href={`/shops/${order.shop?.slug}`}
                  className="block mt-4"
                >
                  <Button variant="outline" className="w-full gap-2 rounded-xl h-11">
                    <RotateCcw className="w-4 h-4" />
                    اطلب مرة أخرى
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
