export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface MatrixResult {
  distances: number[][]; // meters
  durations: number[][]; // seconds
  sources: Coordinate[];
  destinations: Coordinate[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MAX_COORDS = 25; // Mapbox limit

export class MapboxMatrixService {
  private cache = new Map<string, MatrixResult>();

  async getMatrix(coordinates: Coordinate[]): Promise<MatrixResult> {
    if (!MAPBOX_TOKEN) {
      throw new Error('Mapbox access token not configured');
    }

    if (coordinates.length > MAX_COORDS) {
      throw new Error(`Maximum ${MAX_COORDS} coordinates allowed`);
    }

    coordinates.forEach((coord, index) => {
      if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
        throw new Error(`Invalid coordinate at index ${index}`);
      }
      if (coord.latitude === 0 && coord.longitude === 0) {
        throw new Error(`Invalid coordinate (0,0) at index ${index}. Please select a valid location.`);
      }
      if (Math.abs(coord.latitude) > 90 || Math.abs(coord.longitude) > 180) {
        throw new Error(`Coordinate out of range at index ${index}`);
      }
    });

    const cacheKey = this.getCacheKey(coordinates);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const coordsString = coordinates.map(c => `${c.longitude},${c.latitude}`).join(';');
    const url = new URL(`https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordsString}`);
    url.searchParams.set('access_token', MAPBOX_TOKEN);
    url.searchParams.set('annotations', 'distance,duration');

    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    } catch (error) {
      throw new Error('فشل حساب المسافات. يرجى المحاولة مرة أخرى.');
    }

    if (response.status === 429) {
      throw new Error('تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة بعد قليل.');
    }
    if (!response.ok) {
      throw new Error('فشل حساب المسافات. يرجى المحاولة مرة أخرى.');
    }

    const data = await response.json();
    if (!data.distances || !data.durations) {
      throw new Error('Invalid response from Mapbox');
    }

    const result: MatrixResult = {
      distances: data.distances,
      durations: data.durations,
      sources: coordinates,
      destinations: coordinates,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  private getCacheKey(coords: Coordinate[]): string {
    return coords.map(c => `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`).join('|');
  }

  clearCache() {
    this.cache.clear();
  }
}

export const mapboxMatrix = new MapboxMatrixService();
