"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store";
import { supabase } from "@/lib/supabase";
import { Send, CheckCircle, XCircle } from "lucide-react";

export function TelegramConnect() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  if (!user || user.role !== 'DELIVERY') return null;

  const handleDisconnect = async () => {
    setLoading(true);
    const { error } = await supabase
        .from('profiles')
        .update({ telegram_enabled: false }) // Or set chat_id to null if preferred, but disabling is safer
        .eq('id', user.id);
    
    if (!error) {
        await refreshUser();
        router.refresh();
    }
    setLoading(false);
  };

  const isConnected = user.telegram_enabled && user.telegram_chat_id;
  const botName = "SahlaDeliveryBot"; 
  const botLink = `https://t.me/${botName}?start=${user.id}`;

  return (
    <div className="p-4 border rounded-lg bg-card shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Send className="w-5 h-5 text-blue-500" />
          تنبيهات تيليجرام
        </h3>
        {isConnected ? (
           <span className="text-sm text-green-600 flex items-center gap-1 font-medium bg-green-50 px-2 py-1 rounded-full">
             <CheckCircle className="w-4 h-4" /> متصل
           </span>
        ) : (
           <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">
             غير متصل
           </span>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isConnected 
            ? "يتم إرسال تنبيهات الطلبات الجديدة إلى حسابك في تيليجرام."
            : "اربط حسابك لتستقبل تنبيهات الطلبات الجديدة فوراً على تيليجرام."
          }
        </p>

        {!isConnected && (
            <Button 
                className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white"
                onClick={() => window.open(botLink, '_blank')}
            >
                ربط الحساب الآن
            </Button>
        )}

        {isConnected && (
            <Button 
                variant="outline" 
                className="w-full text-destructive hover:bg-destructive/10 border-destructive/50"
                onClick={handleDisconnect}
                disabled={loading}
            >
                {loading ? "جاري الفصل..." : "إيقاف التنبيهات"}
            </Button>
        )}
      </div>
    </div>
  );
}
