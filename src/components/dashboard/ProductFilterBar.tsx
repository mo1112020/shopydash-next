import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ProductFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  stockFilter: string;
  setStockFilter: (filter: any) => void; // Using any for ease, ideally strict type
  sortBy: string;
  setSortBy: (sort: any) => void;
  categories: { id: string; name: string }[];
  lowStockCount: number;
}

export function ProductFilterBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  stockFilter,
  setStockFilter,
  sortBy,
  setSortBy,
  categories,
  lowStockCount,
}: ProductFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 bg-background/50 backdrop-blur-sm p-4 rounded-lg border shadow-sm">
      {/* Top Row: Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-1/2 lg:w-1/3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن منتج..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        
        {/* Quick filters / Stats */}
        {lowStockCount > 0 && (
          <Button 
            variant={stockFilter === 'LOW' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStockFilter(stockFilter === 'LOW' ? 'ALL' : 'LOW')}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <Filter className="w-4 h-4 ml-2" />
            منتجات قاربت على النفاذ
            <Badge variant="outline" className="mr-2 bg-amber-100 text-amber-700 border-amber-200">
              {lowStockCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Bottom Row: Dropdowns */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل التصنيفات</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stock Filter */}
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="حالة المخزون" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">الكل</SelectItem>
            <SelectItem value="AVAILABLE">متوفر</SelectItem>
            <SelectItem value="LOW">منخفض</SelectItem>
            <SelectItem value="OUT">نفذت الكمية</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px] h-9 gap-2">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UPDATED_DESC">أحدث التعديلات</SelectItem>
            <SelectItem value="NAME_ASC">الاسم (أ-ي)</SelectItem>
            <SelectItem value="PRICE_ASC">السعر: الأقل</SelectItem>
            <SelectItem value="PRICE_DESC">السعر: الأعلى</SelectItem>
            <SelectItem value="STOCK_ASC">الكمية: الأقل</SelectItem>
            <SelectItem value="STOCK_DESC">الكمية: الأعلى</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
