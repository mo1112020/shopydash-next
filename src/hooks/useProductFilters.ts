import { useState, useMemo } from "react";

type SortOption = 'NAME_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_ASC' | 'STOCK_DESC' | 'UPDATED_DESC';
type StockFilter = 'ALL' | 'LOW' | 'OUT' | 'AVAILABLE';

interface UseProductFiltersProps {
  products: any[]; // Using any[] for flexibility, can be typed properly
  initialLowStockThreshold?: number;
}

export function useProductFilters(products: any[], initialLowStockThreshold = 10) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("UPDATED_DESC");
  const [lowStockThreshold, setLowStockThreshold] = useState(initialLowStockThreshold);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query)
      );
    }

    // 2. Category
    if (selectedCategory !== "ALL") {
      result = result.filter(p => p.category_id === selectedCategory);
    }

    // 3. Stock Status
    if (stockFilter !== "ALL") {
      result = result.filter(p => {
        if (stockFilter === "OUT") return p.stock_quantity <= 0;
        if (stockFilter === "LOW") return p.stock_quantity > 0 && p.stock_quantity <= lowStockThreshold;
        if (stockFilter === "AVAILABLE") return p.stock_quantity > 0;
        return true;
      });
    }

    // 4. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "NAME_ASC":
          return a.name.localeCompare(b.name);
        case "PRICE_ASC":
          return a.price - b.price;
        case "PRICE_DESC":
          return b.price - a.price;
        case "STOCK_ASC":
          return a.stock_quantity - b.stock_quantity;
        case "STOCK_DESC":
          return b.stock_quantity - a.stock_quantity;
        case "UPDATED_DESC":
          // Handle potential missing updated_at, fallback to created_at or 0
          return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy, lowStockThreshold]);

  // Derived stats
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= lowStockThreshold).length;
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

  return {
    filteredProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    stockFilter,
    setStockFilter,
    sortBy,
    setSortBy,
    lowStockThreshold,
    setLowStockThreshold,
    stats: {
      lowStockCount,
      outOfStockCount
    }
  };
}
