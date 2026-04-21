"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingBag,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Filter,
  RefreshCw,
  Store,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AR } from "@/lib/i18n";
import { formatPrice, cn } from "@/lib/utils";
import { useAuth } from "@/store";
import { orderService, ORDER_STATUS_CONFIG } from "@/services";
import { getCurrentUser } from "@/lib/supabase";
import type { OrderStatus, OrderWithItems } from "@/types/database";

const statusVariantMap: Record<
  OrderStatus,
  | "placed"
  | "confirmed"
  | "preparing"
  | "outForDelivery"
  | "delivered"
  | "cancelled"
> = {
  PLACED: "placed",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY_FOR_PICKUP: "preparing",
  OUT_FOR_DELIVERY: "outForDelivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  CANCELLED_BY_SHOP: "cancelled",
  CANCELLED_BY_ADMIN: "cancelled",
};

const statusIcons: Record<OrderStatus, typeof Package> = {
  PLACED: Clock,
  CONFIRMED: CheckCircle,
  PREPARING: Package,
  READY_FOR_PICKUP: Store,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
  CANCELLED_BY_SHOP: Store,
  CANCELLED_BY_ADMIN: XCircle,
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["orders", currentPage],
    queryFn: async () => {
      const { user } = await getCurrentUser();
      if (!user) return { data: [], count: 0 };
      return orderService.getByUser(user.id, currentPage, pageSize);
    },
    enabled: isAuthenticated,
  });

  const orders = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders?.filter((o) => o.status === statusFilter);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString("ar-EG");
  };

  const getStatusProgress = (status: OrderStatus): number => {
    const progressMap: Record<OrderStatus, number> = {
      PLACED: 20,
      CONFIRMED: 40,
      PREPARING: 60,
      READY_FOR_PICKUP: 70,
      OUT_FOR_DELIVERY: 80,
      DELIVERED: 100,
      CANCELLED: 0,
      CANCELLED_BY_SHOP: 0,
      CANCELLED_BY_ADMIN: 0,
    };
    return progressMap[status];
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
            <p className="text-muted-foreground mb-4">
              قم بتسجيل الدخول لعرض طلباتك
            </p>
            <Link href="/login?redirect=/orders">
              <Button>{AR.auth.login}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{AR.orders.title}</h1>
            <p className="text-muted-foreground mt-1">
              {orders?.length || 0} طلب
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw
                className={cn("w-4 h-4", isRefetching && "animate-spin")}
              />
            </Button>
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="جميع الطلبات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلبات</SelectItem>
                <SelectItem value="PLACED">قيد المراجعة</SelectItem>
                <SelectItem value="CONFIRMED">مؤكدة</SelectItem>
                <SelectItem value="PREPARING">قيد التجهيز</SelectItem>
                <SelectItem value="READY_FOR_PICKUP">جاهز للاستلام</SelectItem>
                <SelectItem value="OUT_FOR_DELIVERY">في الطريق</SelectItem>
                <SelectItem value="DELIVERED">تم التسليم</SelectItem>
                <SelectItem value="CANCELLED">ملغية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = statusIcons[order.status as OrderStatus];
              const progress = getStatusProgress(order.status as OrderStatus);
              const isCancelled = order.status === "CANCELLED";
              const isDelivered = order.status === "DELIVERED";

              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card
                    interactive
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-0">
                      {/* Progress bar */}
                      {!isCancelled && (
                        <div className="h-1 bg-muted">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              isDelivered ? "bg-success" : "bg-primary"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}

                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Shop Logo */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                            {order.shop?.logo_url ? (
                              <img
                                src={order.shop.logo_url}
                                alt={order.shop.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                                <ShoppingBag className="w-7 h-7 text-primary" />
                              </div>
                            )}
                          </div>

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  statusVariantMap[order.status as OrderStatus]
                                }
                                className="gap-1"
                              >
                                <StatusIcon className="w-3 h-3" />
                                {
                                  ORDER_STATUS_CONFIG[
                                    order.status as OrderStatus
                                  ]?.label
                                }
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(order.created_at)}
                              </span>
                            </div>
                            <p className="font-semibold text-lg">
                              {order.shop?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-mono">
                                {order.order_number}
                              </span>
                              <span className="mx-2">•</span>
                              {order.items?.length} منتج
                            </p>
                          </div>

                          {/* Price & Action */}
                          <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                            <p className="font-bold text-primary text-xl">
                              {formatPrice(order.total)}
                            </p>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="w-4 h-4" />
                              التفاصيل
                            </Button>
                          </div>
                        </div>

                        {/* Order Items Preview */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Package className="w-4 h-4" />
                              <span className="truncate">
                                {order.items
                                  .slice(0, 3)
                                  .map((item) => item.product_name)
                                  .join("، ")}
                                {order.items.length > 3 &&
                                  ` و${order.items.length - 3} آخرين`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state py-16">
            <div className="empty-state-icon">
              <Package className="w-full h-full" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {statusFilter === "all"
                ? AR.orders.empty
                : "لا توجد طلبات بهذه الحالة"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {statusFilter === "all"
                ? AR.orders.emptyDescription
                : "جرب تغيير الفلتر لعرض طلبات أخرى"}
            </p>
            {statusFilter === "all" ? (
              <Link href="/products">
                <Button>{AR.cart.startShopping}</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={() => setStatusFilter("all")}>
                عرض جميع الطلبات
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12 pb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  className="w-9 h-9 p-0 rounded-lg"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-2"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
