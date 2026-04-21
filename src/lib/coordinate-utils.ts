export interface NormalizedCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Validates and normalizes coordinates
 * @param lat Latitude value
 * @param lng Longitude value
 * @returns Normalized coordinate or null if invalid
 */
export function normalizeCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined
): NormalizedCoordinate | null {
  if (lat == null || lng == null) return null;
  
  // Validate ranges
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  
  // Round to 6 decimals (~0.11m precision)
  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
  };
}

/**
 * Validates shop has valid coordinates
 */
export function validateShopCoordinates(shop: { 
  latitude?: number | null; 
  longitude?: number | null 
}): boolean {
  return normalizeCoordinate(shop.latitude, shop.longitude) !== null;
}

/**
 * Validates address has valid coordinates
 */
export function validateAddressCoordinates(address: { 
  latitude?: number | null; 
  longitude?: number | null 
}): boolean {
  return normalizeCoordinate(address.latitude, address.longitude) !== null;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coord: NormalizedCoordinate): string {
  return `${coord.latitude.toFixed(6)}, ${coord.longitude.toFixed(6)}`;
}

/**
 * Calculate simple distance between two points (Haversine formula)
 * Used for fallback or validation
 */
export function calculateDistance(
  from: NormalizedCoordinate,
  to: NormalizedCoordinate
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
    Math.cos(toRad(to.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
