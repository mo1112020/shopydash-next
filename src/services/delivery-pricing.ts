import { deliverySettingsService } from './delivery-settings.service';
import type { RoutePlan } from './route-planner';
import type { DeliveryFeeBreakdown, RoundingRule } from '@/types/delivery-settings';

/**
 * Apply rounding rule to delivery fee
 */
function applyRounding(value: number, rule: RoundingRule): number {
  switch (rule) {
    case 'nearest_int':
      return Math.round(value);
    case 'nearest_0_5':
      return Math.round(value * 2) / 2;
    case 'ceil_int':
      return Math.ceil(value);
    default:
      return Math.round(value);
  }
}

/**
 * Calculate delivery fee based on route and settings
 * 
 * @param route Planned route with distance and duration
 * @param shopsCount Number of shops in the order
 * @returns Delivery fee breakdown with settings snapshot
 */
export async function calculateDeliveryFee(
  route: RoutePlan,
  shopsCount: number
): Promise<DeliveryFeeBreakdown> {
  const settings = await deliverySettingsService.getSettings();

  // Calculate components (always distance-based for MVP)
  const kmComponent = route.total_km * settings.km_rate;
  const stopsComponent = Math.max(0, shopsCount - 1) * settings.pickup_stop_fee;
  
  const subtotal = settings.base_fee + kmComponent + stopsComponent;
  const clamped = Math.max(settings.min_fee, Math.min(settings.max_fee, subtotal));
  const final = applyRounding(clamped, settings.rounding_rule);

  return {
    base_fee: settings.base_fee,
    km_component: Number(kmComponent.toFixed(2)),
    stops_component: stopsComponent,
    subtotal_fee: Number(subtotal.toFixed(2)),
    final_fee: final,
    total_km: route.total_km,
    total_minutes: route.total_minutes,
    shops_count: shopsCount,
    settings_used: settings,
  };
}

/**
 * Calculate fallback delivery fee when Mapbox fails
 */
export async function calculateFallbackFee(): Promise<{
  fee: number;
  is_fallback: boolean;
  warning: string;
}> {
  const settings = await deliverySettingsService.getSettings();
  
  return {
    fee: settings.fixed_fallback_fee,
    is_fallback: true,
    warning: 'تم حساب رسوم التوصيل بشكل تقديري بسبب خطأ مؤقت. الرسوم المعروضة نهائية.',
  };
}
