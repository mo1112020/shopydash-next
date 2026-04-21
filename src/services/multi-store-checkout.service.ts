import { supabase } from '@/lib/supabase';
import { mapboxMatrix } from './mapbox-matrix';
import { planRoute } from './route-planner';
import { calculateDeliveryFee, calculateFallbackFee } from './delivery-pricing';
import { deliverySettingsService } from './delivery-settings.service';
import { normalizeCoordinate } from '@/lib/coordinate-utils';
import type { Coordinate } from './mapbox-matrix';
import type { RoutePlan } from './route-planner';
import type { DeliveryFeeBreakdown } from '@/types/delivery-settings';
import type { CartItemWithProduct } from '@/types/database';

export interface CheckoutCalculation {
  parent_order_data: any;
  suborders_data: any[];
  delivery_fee_breakdown: DeliveryFeeBreakdown | null;
  route_plan: RoutePlan | null;
  validation_errors: string[];
  is_fallback: boolean;
  fallback_warning?: string;
}

export interface MultiStoreCheckoutParams {
  userId: string;
  cartItems: CartItemWithProduct[];
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

/**
 * Calculate multi-store checkout with route-based delivery fee
 */
export async function calculateMultiStoreCheckout(
  params: MultiStoreCheckoutParams
): Promise<CheckoutCalculation> {
  const errors: string[] = [];
  let isFallback = false;
  let fallbackWarning: string | undefined;

  // Group cart items by shop
  const itemsByShop = params.cartItems.reduce((acc, item) => {
    const shopId = item.product.shop_id;
    if (!acc[shopId]) acc[shopId] = [];
    acc[shopId].push(item);
    return acc;
  }, {} as Record<string, CartItemWithProduct[]>);

  const shopIds = Object.keys(itemsByShop);
  const settings = await deliverySettingsService.getSettings();

  // Validate customer coordinates
  const customerCoord = normalizeCoordinate(params.deliveryLatitude, params.deliveryLongitude);

  // Fetch shop data with coordinates
  const { data: shopsData, error: shopsError } = await supabase
    .from('shops')
    .select('id, name, latitude, longitude, region_id, is_active, status, approval_status')
    .in('id', shopIds);

  if (shopsError) {
    errors.push('فشل تحميل بيانات المتاجر');
    return { 
      parent_order_data: null, 
      suborders_data: [], 
      delivery_fee_breakdown: null, 
      route_plan: null, 
      validation_errors: errors,
      is_fallback: false,
    };
  }

  // Check max shops limit based on region
  let maxAllowed = settings.max_shops_per_order;
  if (shopsData && shopsData.length > 0) {
    const regionId = shopsData[0].region_id;
    if (regionId) {
      const { data: regionLimit } = await supabase
        .from('region_limits')
        .select('max_stores_allowed')
        .eq('region_id', regionId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (regionLimit) {
        maxAllowed = regionLimit.max_stores_allowed;
      }
    }
  }

  if (shopIds.length > maxAllowed) {
    errors.push(`لا يمكنك الطلب من أكثر من ${maxAllowed} متاجر في نفس الطلب`);
  }

  if (!customerCoord) {
    errors.push('الرجاء تحديد موقع التوصيل على الخريطة');
  }

  if (shopsError) {
    errors.push('فشل تحميل بيانات المتاجر');
    return { 
      parent_order_data: null, 
      suborders_data: [], 
      delivery_fee_breakdown: null, 
      route_plan: null, 
      validation_errors: errors,
      is_fallback: false,
    };
  }

  // Validate shop coordinates
  const shopCoords: Array<{ coord: Coordinate; shop_id: string; shop_name: string }> = [];
  for (const shop of shopsData || []) {
    const coord = normalizeCoordinate(shop.latitude, shop.longitude);
    if (!coord) {
      errors.push(`المتجر "${shop.name}" لا يحتوي على موقع محدد. لا يمكن إتمام الطلب.`);
    } else {
      shopCoords.push({
        coord: { longitude: coord.longitude, latitude: coord.latitude },
        shop_id: shop.id,
        shop_name: shop.name,
      });
    }
  }

  if (errors.length > 0) {
    return { 
      parent_order_data: null, 
      suborders_data: [], 
      delivery_fee_breakdown: null, 
      route_plan: null, 
      validation_errors: errors,
      is_fallback: false,
    };
  }

  // Build coordinates array: [customer, shop1, shop2, ...]
  const coordinates: Coordinate[] = [
    { longitude: customerCoord!.longitude, latitude: customerCoord!.latitude },
    ...shopCoords.map(s => s.coord),
  ];

  let route: RoutePlan;
  let feeBreakdown: DeliveryFeeBreakdown;

  // Try to get Mapbox distance matrix
  try {
    const matrix = await mapboxMatrix.getMatrix(coordinates);
    route = planRoute(matrix);
    feeBreakdown = await calculateDeliveryFee(route, shopIds.length);
  } catch (error: any) {
    console.error('Mapbox error, using fallback:', error);
    
    // Check fallback mode
    if (settings.fallback_mode === 'block_checkout') {
      errors.push('فشل حساب رسوم التوصيل. يرجى المحاولة مرة أخرى.');
      return { 
        parent_order_data: null, 
        suborders_data: [], 
        delivery_fee_breakdown: null, 
        route_plan: null, 
        validation_errors: errors,
        is_fallback: false,
      };
    }
    
    // Use fallback fee
    const fallback = await calculateFallbackFee();
    isFallback = true;
    fallbackWarning = fallback.warning;
    
    // Create dummy route for fallback
    route = {
      pickup_sequence: shopCoords.map((_, i) => i + 1),
      route_points: [0, ...shopCoords.map((_, i) => i + 1), 0],
      legs: [],
      total_km: 0,
      total_minutes: 0,
    };
    
    // Create fallback fee breakdown
    feeBreakdown = {
      base_fee: fallback.fee,
      km_component: 0,
      stops_component: 0,
      subtotal_fee: fallback.fee,
      final_fee: fallback.fee,
      total_km: 0,
      total_minutes: 0,
      shops_count: shopIds.length,
      settings_used: settings,
    };
  }

  // Build suborders data based on pickup sequence
  const subordersData = route.pickup_sequence.map((shopIndex, seqIndex) => {
    const shopData = shopCoords[shopIndex - 1];
    const shopId = shopData.shop_id;
    const items = itemsByShop[shopId];
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    return {
      shop_id: shopId,
      pickup_sequence_index: seqIndex,
      subtotal,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product.name,
        product_image: item.product.image_url,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      })),
    };
  });

  const totalSubtotal = subordersData.reduce((sum, sub) => sum + sub.subtotal, 0);

  // Platform Fee Calculation (Estimate for display)
  const platformFeeRaw = settings.platform_fee_fixed + (totalSubtotal * settings.platform_fee_percent / 100);
  const platformFee = Math.round(platformFeeRaw * 100) / 100;

  const parentOrderData = {
    user_id: params.userId,
    subtotal: totalSubtotal,
    total_delivery_fee: feeBreakdown.final_fee,
    platform_fee: platformFee, // Estimate
    total: totalSubtotal + feeBreakdown.final_fee + platformFee,
    customer_name: params.customerName,
    customer_phone: params.customerPhone,
    delivery_address: params.deliveryAddress,
    delivery_latitude: params.deliveryLatitude,
    delivery_longitude: params.deliveryLongitude,
    delivery_notes: params.notes || null,
    route_km: route.total_km,
    route_minutes: route.total_minutes,
    pickup_sequence: route.pickup_sequence,
    delivery_fee_breakdown: feeBreakdown,
    delivery_settings_snapshot: feeBreakdown.settings_used,
  };

  return {
    parent_order_data: parentOrderData,
    suborders_data: subordersData,
    delivery_fee_breakdown: feeBreakdown,
    route_plan: route,
    validation_errors: [],
    is_fallback: isFallback,
    fallback_warning: fallbackWarning,
  };
}


