import Link from "next/link";
import { Home, Store, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-16" dir="rtl">
      <div className="container-app">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-12">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>

            {/* 404 */}
            <h1 className="text-7xl font-bold text-primary mb-4">404</h1>

            {/* Title */}
            <h2 className="text-3xl font-bold mb-3">الصفحة غير موجودة</h2>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground mb-8">
              الرابط غير صحيح أو تم حذف الصفحة
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <Home className="w-5 h-5" />
                  العودة للرئيسية
                </Button>
              </Link>
              <Link href="/shops">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                >
                  <Store className="w-5 h-5" />
                  تصفح المتاجر
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
