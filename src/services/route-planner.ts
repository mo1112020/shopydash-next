import type { MatrixResult } from './mapbox-matrix';

export interface RouteLeg {
  from_index: number;
  to_index: number;
  from_type: 'customer' | 'shop';
  to_type: 'customer' | 'shop';
  distance_km: number;
  duration_minutes: number;
}

export interface RoutePlan {
  pickup_sequence: number[]; // shop indices (excluding customer at 0)
  route_points: number[]; // all indices in visit order
  legs: RouteLeg[];
  total_km: number;
  total_minutes: number;
}

/**
 * Nearest Neighbor TSP for shop pickup route
 * Assumes points[0] = customer, points[1..n] = shops
 * 
 * @param matrix Distance/duration matrix from Mapbox
 * @returns Optimized route plan
 */
export function planRoute(matrix: MatrixResult): RoutePlan {
  const n = matrix.distances.length;
  
  if (n < 2) {
    throw new Error('At least customer + 1 shop required');
  }

  const customerIndex = 0;
  const shopIndices = Array.from({ length: n - 1 }, (_, i) => i + 1);
  
  // Nearest neighbor starting from customer
  const visited = new Set<number>([customerIndex]);
  const routePoints: number[] = [customerIndex];
  let current = customerIndex;

  while (visited.size < n) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (const shop of shopIndices) {
      if (!visited.has(shop)) {
        const dist = matrix.distances[current][shop];
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = shop;
        }
      }
    }

    if (nearest === -1) break;
    
    visited.add(nearest);
    routePoints.push(nearest);
    current = nearest;
  }

  // Return to customer for delivery
  routePoints.push(customerIndex);

  // Build legs
  const legs: RouteLeg[] = [];
  let totalKm = 0;
  let totalMinutes = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const from = routePoints[i];
    const to = routePoints[i + 1];
    const distKm = matrix.distances[from][to] / 1000;
    const durationMin = Math.ceil(matrix.durations[from][to] / 60);

    legs.push({
      from_index: from,
      to_index: to,
      from_type: from === 0 ? 'customer' : 'shop',
      to_type: to === 0 ? 'customer' : 'shop',
      distance_km: Number(distKm.toFixed(2)),
      duration_minutes: durationMin,
    });

    totalKm += distKm;
    totalMinutes += durationMin;
  }

  return {
    pickup_sequence: routePoints.slice(1, -1), // shop indices only
    route_points: routePoints,
    legs,
    total_km: Number(totalKm.toFixed(2)),
    total_minutes: totalMinutes,
  };
}

/**
 * Find optimal pickup order for shops (TSP)
 * This is the same as planRoute but returns only shop IDs in order
 */
export function calculatePickupOrder(
  matrix: MatrixResult,
  shopIds: string[]
): string[] {
  const route = planRoute(matrix);
  
  // Map indices to shop IDs
  // pickup_sequence contains shop indices (1-based, excluding customer at 0)
  return route.pickup_sequence.map(idx => shopIds[idx - 1]);
}
