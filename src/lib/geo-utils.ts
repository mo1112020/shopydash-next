export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Checks if a point is inside a polygon using the Ray Casting algorithm.
 * @param point The point to check {lat, lng}
 * @param polygon Array of points defining the polygon [{lat, lng}, ...]
 * @returns true if the point is inside the polygon
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (!polygon || polygon.length < 3) return false;

  const x = point.lat;
  const y = point.lng;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates the center (centroid) of a polygon.
 */
export function getPolygonCenter(polygon: GeoPoint[]): GeoPoint {
  if (!polygon || polygon.length === 0) return { lat: 31.0603, lng: 30.3254 }; // Default fallback

  let lat = 0;
  let lng = 0;
  
  polygon.forEach(p => {
    lat += p.lat;
    lng += p.lng;
  });

  return {
    lat: lat / polygon.length,
    lng: lng / polygon.length
  };
}
