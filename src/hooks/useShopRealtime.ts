import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SoundService } from "@/services/sound.service";
import { notify } from "@/lib/notify";

export function useShopRealtime(shopId: string | undefined, onNewOrder: () => void, onOrderUpdate: () => void) {
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel(`shop-orders-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
             // New order -> Play Sound + Refresh List
             await SoundService.playNewOrderSound();
             notify.info(`طلب جديد وصل! رقم الطلب: ${(payload.new as any).order_number}`);
             onNewOrder();
          } else if (payload.eventType === "UPDATE") {
             // Order update -> Refresh List
             onOrderUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, onNewOrder, onOrderUpdate]);
}
