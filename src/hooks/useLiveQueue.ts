import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types/database";

export function useLiveQueue() {
  const [orders, setOrders] = useState<any[]>([]); // Using any[] to support ParentOrder structure
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Fetch
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("parent_orders")
        .select("*")
        .eq("status", "READY_FOR_PICKUP")
        .is("delivery_user_id", null)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setOrders(data);
      }
      setIsLoading(false);
    };

    fetchOrders();

    // 2. Realtime Subscription
    const channel = supabase
      .channel("live-queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parent_orders",
        },
        (payload) => {
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;

          if (payload.eventType === "INSERT") {
             // If new order is ready and unassigned -> Add
             if (newOrder.status === 'READY_FOR_PICKUP' && !newOrder.delivery_user_id) {
                setOrders(prev => {
                    if (prev.find(o => o.id === newOrder.id)) return prev;
                    return [newOrder, ...prev]; // Add to top
                });
             }
          } 
          else if (payload.eventType === "UPDATE") {
             // Situation A: Order becomes available (changed to READY or unassigned)
             if (newOrder.status === 'READY_FOR_PICKUP' && !newOrder.delivery_user_id) {
                setOrders(prev => {
                    // Avoid duplicates
                    if (prev.find(o => o.id === newOrder.id)) return prev.map(o => o.id === newOrder.id ? newOrder : o);
                    return [...prev, newOrder];
                });
             }
             // Situation B: Order taken or status changed -> Remove
             else {
                setOrders(prev => prev.filter(o => o.id !== newOrder.id));
             }
          }
          // DELETE
          else if (payload.eventType === "DELETE") {
             setOrders(prev => prev.filter(o => o.id !== oldOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { orders, isLoading };
}
