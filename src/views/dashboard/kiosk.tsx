"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  User,
  MapPin,
  Phone,
  Truck,
  Package,
  ClipboardList,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";

import { useAuth } from "@/store";
import { useShopRealtime } from "@/hooks/useShopRealtime";
import { orderService, ORDER_STATUS_CONFIG } from "@/services/order.service";
import { shopsService } from "@/services/catalog.service";
import { SoundService } from "@/services/sound.service";
import { formatPrice, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";


// ─── Pipeline column definition ─────────────────────────────────────────
const KIOSK_COLUMNS = [
  {
    status: "PLACED",
    label: "جديد",
    icon: "🔔",
    color: "from-blue-500 to-blue-600",
    headerBg: "bg-blue-500",
    cardBorder: "border-blue-200 dark:border-blue-800",
    cardGlow: "shadow-blue-500/10",
    badgeBg: "bg-blue-500",
    emptyBg: "bg-blue-50/50 dark:bg-blue-950/20",
  },
  {
    status: "CONFIRMED",
    label: "مؤكد",
    icon: "✅",
    color: "from-indigo-500 to-indigo-600",
    headerBg: "bg-indigo-500",
    cardBorder: "border-indigo-200 dark:border-indigo-800",
    cardGlow: "shadow-indigo-500/10",
    badgeBg: "bg-indigo-500",
    emptyBg: "bg-indigo-50/50 dark:bg-indigo-950/20",
  },
  {
    status: "PREPARING",
    label: "قيد التجهيز",
    icon: "🍳",
    color: "from-amber-500 to-orange-500",
    headerBg: "bg-amber-500",
    cardBorder: "border-amber-200 dark:border-amber-800",
    cardGlow: "shadow-amber-500/10",
    badgeBg: "bg-amber-500",
    emptyBg: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  {
    status: "READY_FOR_PICKUP",
    label: "جاهز للاستلام",
    icon: "📦",
    color: "from-emerald-500 to-green-500",
    headerBg: "bg-emerald-500",
    cardBorder: "border-emerald-200 dark:border-emerald-800",
    cardGlow: "shadow-emerald-500/10",
    badgeBg: "bg-emerald-500",
    emptyBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
  },
  {
    status: "OUT_FOR_DELIVERY",
    label: "في الطريق",
    icon: "🚗",
    color: "from-purple-500 to-violet-500",
    headerBg: "bg-purple-500",
    cardBorder: "border-purple-200 dark:border-purple-800",
    cardGlow: "shadow-purple-500/10",
    badgeBg: "bg-purple-500",
    emptyBg: "bg-purple-50/50 dark:bg-purple-950/20",
  },
];

const ACTIVE_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
];

// ─── Status helpers ──────────────────────────────────────────────────────
const getNextStatus = (currentStatus: string): string | null => {
  const transitions: Record<string, string> = {
    PLACED: "CONFIRMED",
    CONFIRMED: "PREPARING",
    PREPARING: "READY_FOR_PICKUP",
  };
  return transitions[currentStatus] || null;
};

const getNextStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    CONFIRMED: "✓ قبول",
    PREPARING: "🍳 بدء التجهيز",
    READY_FOR_PICKUP: "📦 جاهز",
    OUT_FOR_DELIVERY: "🚗 خرج للتوصيل",
    DELIVERED: "✅ تم التسليم",
  };
  return labels[status] || status;
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Kiosk Order Card ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function KioskCard({
  order,
  column,
  onAdvance,
  onCancel,
  onViewDetails,
  isUpdating,
}: {
  order: any;
  column: (typeof KIOSK_COLUMNS)[0];
  onAdvance: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onViewDetails: (order: any) => void;
  isUpdating: boolean;
}) {
  const nextStatus = getNextStatus(order.status);
  const driver = order.delivery_user || order.parent_order?.delivery_user;
  const timeAgo = formatDistanceToNow(new Date(order.created_at), {
    locale: ar,
    addSuffix: true,
  });
  const shortId = order.order_number?.slice(-4) || order.order_number;

  // Time urgency — flash if placed > 3 min ago
  const minutesAgo =
    (Date.now() - new Date(order.created_at).getTime()) / 60000;
  const isUrgent = order.status === "PLACED" && minutesAgo > 3;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-background transition-all duration-300 group",
        column.cardBorder,
        column.cardGlow,
        isUrgent && "animate-pulse border-red-400 shadow-red-500/20 shadow-lg"
      )}
    >
      {/* Header — Order ID + Time */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-lg">#{shortId}</span>
            {order.parent_order_id && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0.5 h-5"
              >
                مشترك
              </Badge>
            )}
          </div>
          <span
            className={cn(
              "text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-full",
              isUrgent
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Customer */}
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="font-semibold truncate">
            {order.customer_name || "عميل زائر"}
          </span>
        </div>

        {/* Items preview */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {order.items?.length || 0} منتجات •{" "}
            {order.items
              ?.slice(0, 2)
              .map((i: any) => `${i.quantity}x ${i.product_name}`)
              .join("، ")}
            {order.items?.length > 2 && ` +${order.items.length - 2}`}
          </span>
        </div>

        {/* Driver */}
        {driver && (
          <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-2 py-1 rounded-lg w-fit">
            <Truck className="w-3.5 h-3.5" />
            <span className="font-medium truncate">{driver.full_name}</span>
          </div>
        )}

        {/* Total */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl px-4 py-2.5 text-center">
          <span className="font-black text-primary text-xl" dir="ltr">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>

      {/* Actions — BIG touch targets for kiosk */}
      <div className="flex flex-col gap-2 p-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
        {/* Primary action row */}
        {nextStatus && (
          <Button
            size="lg"
            className={cn(
              "w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r shadow-lg",
              column.color,
              "hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            )}
            onClick={() => onAdvance(order.id, nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              getNextStatusLabel(nextStatus)
            )}
          </Button>
        )}
        {/* Secondary row: Details + Cancel */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10 rounded-xl text-xs font-semibold gap-1.5"
            onClick={() => onViewDetails(order)}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            التفاصيل
          </Button>
          {ACTIVE_STATUSES.includes(order.status) && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl text-xs font-semibold gap-1.5 px-4 border-red-200 text-red-600 bg-red-50 hover:bg-red-500 hover:text-white hover:border-red-500 dark:border-red-800 dark:text-red-400 dark:bg-red-950/30 dark:hover:bg-red-600 dark:hover:text-white transition-all"
              onClick={() => onCancel(order.id)}
            >
              <X className="w-3.5 h-3.5" />
              إلغاء
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Kiosk Order Details (Full-screen overlay) ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function KioskOrderDetails({ order, open, onOpenChange }: any) {
  if (!order) return null;
  const parentOrder = order.parent_order;
  const driver = order.delivery_user || parentOrder?.delivery_user;
  const statusConfig =
    ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG];
  const isCancelled = order.status?.startsWith("CANCELLED");
  const shortOrderNum = order.order_number?.slice(-6) || order.order_number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-black mb-1">
                طلب #{shortOrderNum}
              </DialogTitle>
              <DialogDescription className="sr-only">
                تفاصيل الطلب رقم {shortOrderNum}
              </DialogDescription>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("text-xs", statusConfig?.color)}>
                  {statusConfig?.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "d MMM yyyy • h:mm a", {
                    locale: ar,
                  })}
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-3xl font-black text-primary">
                {formatPrice(order.total)}
              </p>
            </div>
          </div>

          {/* Cancellation reason */}
          {isCancelled && order.cancellation_reason && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">سبب الإلغاء:</p>
                <p className="text-xs mt-0.5">{order.cancellation_reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <ScrollArea className="max-h-[55vh]">
          <div className="px-6 py-5 space-y-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                بيانات العميل
              </h4>
              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {order.customer_name || "عميل زائر"}
                    </span>
                  </div>
                  {(order.delivery_phone || order.customer_phone) && (
                    <a
                      href={`tel:${order.delivery_phone || order.customer_phone}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {order.delivery_phone || order.customer_phone}
                    </a>
                  )}
                </div>
                <Separator />
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {order.delivery_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Driver */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                معلومات التوصيل
              </h4>
              {driver ? (
                <div className="bg-primary/5 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                        {driver.avatar_url ? (
                          <img
                            src={driver.avatar_url}
                            alt={driver.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {driver.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          مندوب التوصيل
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">
                        تم التعيين
                      </span>
                    </div>
                  </div>
                  {driver.phone && (
                    <a
                      href={`tel:${driver.phone}`}
                      className="flex items-center gap-2 text-sm text-primary mt-3 hover:underline"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5" /> {driver.phone}
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-muted/20 rounded-xl p-4 text-center border border-dashed border-muted-foreground/20">
                  <Clock className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground/60">
                    لم يتم تعيين مندوب بعد
                  </p>
                </div>
              )}
            </div>

            {/* Products */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                المنتجات ({order.items?.length || 0})
              </h4>
              <div className="bg-muted/30 rounded-xl divide-y">
                {order.items?.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {item.quantity}
                      </div>
                      <p className="text-sm font-medium">{item.product_name}</p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatPrice(item.total_price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {order.delivery_notes && (
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200/50">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  ملاحظات:
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {order.delivery_notes}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer — Total */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <span className="font-bold text-base">الإجمالي</span>
          <span className="font-black text-2xl text-primary">
            {formatPrice(order.total)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Kiosk Page Component ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export default function KioskMode() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [shop, setShop] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(SoundService.getMuteStatus());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Detail dialog
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  // Cancel dialog
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // ─── Data Loading ──────────────────────────────────────────────────
  const loadData = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setIsLoading(true);
      try {
        const userShop = await shopsService.getByOwnerId(user.id);
        setShop(userShop);
        if (userShop) {
          const shopOrders = await orderService.getShopOrdersEnhanced(
            userShop.id
          );
          setOrders(shopOrders);
        }
        setLastRefresh(new Date());
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30s as a safety net
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Realtime
  useShopRealtime(
    shop?.id,
    () => loadData(true),
    () => loadData(true)
  );

  // ─── Audio ─────────────────────────────────────────────────────────
  const toggleMute = () => {
    const s = SoundService.toggleMute();
    setIsMuted(s);
    toast({ description: s ? "تم كتم الصوت" : "تم تفعيل الصوت" });
  };

  // ─── Order Actions ─────────────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await orderService.updateStatus(orderId, newStatus as any, user.id);
      toast({ title: "تم بنجاح", description: "تم تحديث حالة الطلب" });
      loadData(true);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل تحديث حالة الطلب",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openCancelDialog = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelReason("");
    setShowCancelDialog(true);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) return;
    setIsUpdating(true);
    try {
      await orderService.cancelOrder(orderToCancel, cancelReason, "SHOP");
      toast({ title: "تم بنجاح", description: "تم إلغاء الطلب" });
      setShowCancelDialog(false);
      setOrderToCancel(null);
      setCancelReason("");
      loadData(true);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل إلغاء الطلب",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Computed ──────────────────────────────────────────────────────
  const activeOrders = useMemo(
    () =>
      orders
        .filter((o) => ACTIVE_STATUSES.includes(o.status))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        ),
    [orders]
  );

  const activeCount = activeOrders.length;
  const placedCount = activeOrders.filter(
    (o) => o.status === "PLACED"
  ).length;

  // ─── Loading State ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-40 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-muted-foreground">
            جاري تحميل وضع الطلبات...
          </p>
        </div>
      </div>
    );
  }

  // ─── No Shop State ─────────────────────────────────────────────────
  if (!shop) {
    return (
      <div className="fixed inset-0 z-40 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">لا يوجد متجر</p>
          <Button onClick={() => router.push("/dashboard")}>
            العودة للوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-background flex flex-col select-none"
      dir="rtl"
    >
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header className="h-14 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0">
        {/* Left: Back + Shop name */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => router.push("/dashboard/orders")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                {shop.name?.charAt(0) || "M"}
              </span>
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">{shop.name}</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                وضع الكشك
              </p>
            </div>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
            <span className="text-xs text-muted-foreground">طلبات نشطة</span>
            <Badge
              className={cn(
                "h-5 min-w-5 justify-center rounded-full text-[11px] font-bold",
                activeCount > 0 ? "bg-primary" : "bg-muted-foreground"
              )}
            >
              {activeCount}
            </Badge>
          </div>
          {placedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-full animate-pulse">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                🔔 طلبات جديدة
              </span>
              <Badge className="h-5 min-w-5 justify-center rounded-full text-[11px] font-bold bg-red-500">
                {placedCount}
              </Badge>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5">
          {/* Connection status */}
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
              isOnline
                ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
            )}
          >
            {isOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {isOnline ? "متصل" : "غير متصل"}
          </div>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[11px] text-muted-foreground font-mono">
            <Clock className="w-3 h-3" />
            {format(currentTime, "h:mm:ss a")}
          </div>

          {/* Mute */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-primary" />
            )}
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => loadData(true)}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* ── Pipeline Board ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
        <div
          className="flex gap-3 h-full"
          style={{ minWidth: `${KIOSK_COLUMNS.length * 310}px` }}
        >
          {KIOSK_COLUMNS.map((col) => {
            const colOrders = activeOrders.filter(
              (o) => o.status === col.status
            );
            return (
              <div
                key={col.status}
                className="flex flex-col flex-1 min-w-[280px] max-w-[380px]"
              >
                {/* Column Header */}
                <div
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl mb-3",
                    "bg-gradient-to-r text-white shadow-lg",
                    col.color
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{col.icon}</span>
                    <span className="text-sm font-bold">{col.label}</span>
                  </div>
                  <span className="text-sm font-black bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                    {colOrders.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-2 scrollbar-thin">
                  {colOrders.length === 0 ? (
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center h-40 rounded-2xl border-2 border-dashed border-muted-foreground/20",
                        col.emptyBg
                      )}
                    >
                      <ClipboardList className="w-8 h-8 mb-2 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground/40 font-medium">
                        لا توجد طلبات
                      </p>
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <KioskCard
                        key={order.id}
                        order={order}
                        column={col}
                        onAdvance={handleUpdateStatus}
                        onCancel={openCancelDialog}
                        onViewDetails={(o) => {
                          setSelectedOrder(o);
                          setShowOrderDialog(true);
                        }}
                        isUpdating={isUpdating}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Bar ─────────────────────────────────────────────── */}
      <footer className="h-10 border-t bg-muted/30 flex items-center justify-between px-4 flex-shrink-0 text-[11px] text-muted-foreground">
        <span>
          آخر تحديث:{" "}
          {format(lastRefresh, "h:mm:ss a", { locale: ar })}
        </span>
        <span className="font-medium">
          {shop.name} • وضع الكشك
        </span>
        <span>
          إجمالي الطلبات النشطة: {activeCount}
        </span>
      </footer>

      {/* ── Dialogs ────────────────────────────────────────────────── */}
      <KioskOrderDetails
        order={selectedOrder}
        open={showOrderDialog}
        onOpenChange={setShowOrderDialog}
      />

      {/* Cancel dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الطلب</DialogTitle>
            <DialogDescription>
              يرجى ذكر سبب الإلغاء لإتمام العملية.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب الإلغاء (مطلوب)</Label>
              <Textarea
                placeholder="يرجى توضيح سبب الإلغاء..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
              >
                تراجع
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isUpdating || !cancelReason.trim()}
              >
                {isUpdating ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
