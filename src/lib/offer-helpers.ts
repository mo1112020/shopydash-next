/**
 * Helper to calculate discounted price for a product if the shop has an active global offer.
 */
export function calculateDiscountedPrice(
  basePrice: number,
  shop?: {
    global_offer_enabled?: boolean;
    global_offer_type?: 'percentage' | 'fixed' | null;
    global_offer_value?: number | null;
    global_offer_start_time?: string | null;
    global_offer_end_time?: string | null;
  } | null
): { discountedPrice: number; hasOffer: boolean; originalPrice: number } {
  // If no shop data or offer isn't enabled, return the base price
  if (!shop || !shop.global_offer_enabled) {
    return { discountedPrice: basePrice, hasOffer: false, originalPrice: basePrice };
  }

  const {
    global_offer_type,
    global_offer_value,
    global_offer_start_time,
    global_offer_end_time,
  } = shop;

  // Validate offer value and type
  if (!global_offer_value || !global_offer_type) {
    return { discountedPrice: basePrice, hasOffer: false, originalPrice: basePrice };
  }

  // Validate time bounds if they exist
  const now = new Date().getTime();
  
  if (global_offer_start_time) {
    const startTime = new Date(global_offer_start_time).getTime();
    if (now < startTime) {
      return { discountedPrice: basePrice, hasOffer: false, originalPrice: basePrice };
    }
  }

  if (global_offer_end_time) {
    const endTime = new Date(global_offer_end_time).getTime();
    if (now > endTime) {
      return { discountedPrice: basePrice, hasOffer: false, originalPrice: basePrice };
    }
  }

  // Calculate discount
  let discountedPrice = basePrice;

  if (global_offer_type === 'percentage') {
    // E.g. 20% off of 100 = 80
    const discountAmount = (basePrice * global_offer_value) / 100;
    discountedPrice = basePrice - discountAmount;
  } else if (global_offer_type === 'fixed') {
    // E.g. $10 off of $100 = $90
    discountedPrice = basePrice - global_offer_value;
  }

  // Ensure price never drops below 0
  discountedPrice = Math.max(0, discountedPrice);

  return {
    discountedPrice,
    hasOffer: true,
    originalPrice: basePrice,
  };
}
