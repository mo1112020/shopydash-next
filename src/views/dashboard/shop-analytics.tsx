"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Store, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  BarChart2,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shopsService } from "@/services/catalog.service";
import { Shop } from "@/types/database";
import { formatPrice } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopHoursSettings } from "@/components/dashboard/ShopHoursSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnalyticsData {
  date: string;
  revenue: number;
  orders_count: number;
}

export function ShopAnalytics({ shopId }: { shopId: string }) {
  const id = shopId;
  const [shop, setShop] = useState<Shop | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => { if (id) loadData(id); }, [id, period]);

  const loadData = async (shopId: string) => {
    setLoading(true);
    try {
      const shopData = await shopsService.getById(shopId);
      setShop(shopData);
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), period));
      const analyticsData = await shopsService.getAnalytics(shopId, startDate, endDate);
      const days = [];
      let currentDate = startDate;
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const existing = analyticsData.find(d => d.date === dateStr);
        days.push(existing || { date: dateStr, revenue: 0, orders_count: 0 });
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      }
      setAnalytics(days);
    } catch (error) {
      console.error(error);
      notify.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
      </div>
    );
  }

  if (!shop) {
    return <div className="p-8 text-center text-muted-foreground">المتجر غير موجود</div>;
  }

  const totalRevenue = analytics.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalOrders = analytics.reduce((acc, curr) => acc + curr.orders_count, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/shops">
            <Button variant="outline" size="icon"><ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
              {shop.logo_url
                ? <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                : <Store className="w-5 h-5 text-primary" />
              }
            </div>
            <div>
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <p className="text-xs text-muted-foreground">لوحة التحليلات والأداء</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge variant={shop.is_active ? "default" : "destructive"}>{shop.is_active ? "نشط" : "متوقف"}</Badge>
          <Badge variant="outline">
            {shop.override_mode === 'AUTO' ? "مجَدول" : (shop.override_mode === 'FORCE_OPEN' ? "مفتوح يدوياً" : "مغلق يدوياً")}
          </Badge>
          <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-5" dir="rtl">
        <TabsList>
          <TabsTrigger value="analytics">نظرة عامة والتحليلات</TabsTrigger>
          <TabsTrigger value="settings">ساعات العمل والإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-5">
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: <DollarSign className="w-5 h-5 text-green-600"/>, bg: "bg-green-100", label: "إجمالي المبيعات", value: formatPrice(totalRevenue), sub: `خلال ${period} يوم` },
              { icon: <ShoppingCart className="w-5 h-5 text-primary"/>, bg: "bg-primary/10", label: "عدد الطلبات", value: String(totalOrders), sub: `خلال ${period} يوم` },
              { icon: <TrendingUp className="w-5 h-5 text-amber-600"/>, bg: "bg-amber-100", label: "متوسط قيمة الطلب", value: formatPrice(avgOrderValue), sub: "معدل السلة" },
            ].map(kpi => (
              <Card key={kpi.label} className="border-muted">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full ${kpi.bg} flex items-center justify-center`}>{kpi.icon}</div>
                    <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
                  </div>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-muted">
              <CardHeader className="pb-2 pt-4 px-5 bg-muted/20 border-b rounded-t-lg">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                  </div>
                  المبيعات اليومية
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd/MM")} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", direction: "rtl", textAlign: "right" }} labelFormatter={(l) => format(new Date(l), "PPP", { locale: ar })} />
                    <Line type="monotone" dataKey="revenue" name="المبيعات" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2 pt-4 px-5 bg-muted/20 border-b rounded-t-lg">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <BarChart2 className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  الطلبات اليومية
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[280px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd/MM")} stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", direction: "rtl", textAlign: "right" }} labelFormatter={(l) => format(new Date(l), "PPP", { locale: ar })} />
                    <Bar dataKey="orders_count" name="الطلبات" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <ShopHoursSettings shop={shop} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
