export interface OpenCageAnnotations {
  dms?: {
    lat: string;
    lng: string;
  };
  timezone?: {
    name: string;
    now_in_dst: number;
    offset_sec: number;
    offset_string: string;
    short_name: string;
  };
  sun?: {
    rise?: { apparent?: number; astronomical?: number; civil?: number };
    set?: { apparent?: number; astronomical?: number; civil?: number };
  };
  what3words?: {
    words: string;
  };
  plus_code?: string;
  currency?: {
    name: string;
    symbol: string;
    iso_code: string;
    subunit: string;
  };
  callingcode?: number;
  flag?: string;
  roadinfo?: {
    drive_on?: string;
    speed_in?: string;
  };
  geohash?: string;
  UN_ECE?: {
    locode?: string;
  };
}

export interface OpenCageResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  confidence: number;
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
  rateLimitReset?: number;
  source: 'opencage_api' | 'local_fallback';
  components?: Record<string, string>;
  annotations?: OpenCageAnnotations;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  statusCode?: number;
  raw?: unknown;
}

export interface OpenCageGeosearchSuggestion {
  formatted: string;
  lat: number;
  lng: number;
  confidence: number;
  components?: Record<string, string>;
}

// User-provided API Key (kept secure and masked in user interfaces)
export const USER_DEFAULT_OPENCAGE_KEY: string = import.meta.env.VITE_OPENCAGE_KEY ?? "";

/**
 * Forward Geocoding using OpenCage Geocoding API
 * Follows OpenCage AI Agent Skill specifications (OpenCageData/opencage-skills)
 */
export async function geocodeWithOpenCage(
  query: string,
  apiKey: string = USER_DEFAULT_OPENCAGE_KEY,
  fallbackLat: number = 30.3753,
  fallbackLng: number = 69.3451,
  options?: {
    countryCode?: string;
    language?: string;
    limit?: number;
    proximity?: { lat: number; lng: number };
  }
): Promise<OpenCageResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery || !apiKey) {
    return {
      lat: fallbackLat,
      lng: fallbackLng,
      formattedAddress: cleanQuery || 'Default Geographic Center',
      confidence: 1,
      source: 'local_fallback',
    };
  }

  try {
    const params = new URLSearchParams({
      q: cleanQuery,
      key: apiKey,
      limit: String(options?.limit || 1),
      no_annotations: '0',
    });

    if (options?.countryCode) {
      params.append('countrycode', options.countryCode.toLowerCase());
    }
    if (options?.language) {
      params.append('language', options.language);
    }
    if (options?.proximity) {
      params.append('proximity', `${options.proximity.lat},${options.proximity.lng}`);
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    const rateRemaining = Number(response.headers.get('x-ratelimit-remaining')) || undefined;
    const rateLimit = Number(response.headers.get('x-ratelimit-limit')) || undefined;
    const rateReset = Number(response.headers.get('x-ratelimit-reset')) || undefined;

    if (!response.ok) {
      console.warn(`[OpenCage API] Response status: ${response.status}`);
      return {
        lat: fallbackLat,
        lng: fallbackLng,
        formattedAddress: `${cleanQuery} (Fallback Geodata)`,
        confidence: 2,
        statusCode: response.status,
        rateLimitRemaining: rateRemaining,
        rateLimitLimit: rateLimit,
        source: 'local_fallback',
      };
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const first = data.results[0];
      const annotations: OpenCageAnnotations = {
        ...first.annotations,
        plus_code: first.annotations?.['OpenLocationCode']?.plus_code,
      };

      return {
        lat: first.geometry.lat,
        lng: first.geometry.lng,
        formattedAddress: first.formatted,
        confidence: first.confidence || 9,
        rateLimitRemaining: data.rate?.remaining ?? rateRemaining,
        rateLimitLimit: data.rate?.limit ?? rateLimit,
        rateLimitReset: data.rate?.reset ?? rateReset,
        source: 'opencage_api',
        components: first.components,
        annotations,
        bounds: first.bounds,
        statusCode: data.status?.code || 200,
        raw: first,
      };
    }

    return {
      lat: fallbackLat,
      lng: fallbackLng,
      formattedAddress: `${cleanQuery} (Regional Database)`,
      confidence: 5,
      statusCode: 200,
      source: 'local_fallback',
    };
  } catch (err) {
    console.warn('[OpenCage API] Fetch failed or offline, using fallback:', err);
    return {
      lat: fallbackLat,
      lng: fallbackLng,
      formattedAddress: `${cleanQuery} (Offline Fallback)`,
      confidence: 4,
      source: 'local_fallback',
    };
  }
}

/**
 * Reverse Geocoding using OpenCage Geocoding API
 * Follows OpenCage AI Agent Skill specifications (OpenCageData/opencage-skills: opencage-geocoding-api)
 * Query: latitude,longitude
 */
export async function reverseGeocodeWithOpenCage(
  lat: number,
  lng: number,
  apiKey: string = USER_DEFAULT_OPENCAGE_KEY,
  options?: { language?: string }
): Promise<OpenCageResult> {
  try {
    const params = new URLSearchParams({
      q: `${lat.toFixed(6)},${lng.toFixed(6)}`,
      key: apiKey,
      limit: '1',
      no_annotations: '0',
    });

    if (options?.language) {
      params.append('language', options.language);
    }

    const url = `https://api.opencagedata.com/geocode/v1/json?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    const rateRemaining = Number(response.headers.get('x-ratelimit-remaining')) || undefined;
    const rateLimit = Number(response.headers.get('x-ratelimit-limit')) || undefined;

    if (!response.ok) {
      return {
        lat,
        lng,
        formattedAddress: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        confidence: 1,
        statusCode: response.status,
        rateLimitRemaining: rateRemaining,
        rateLimitLimit: rateLimit,
        source: 'local_fallback',
      };
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const first = data.results[0];
      const annotations: OpenCageAnnotations = {
        ...first.annotations,
        plus_code: first.annotations?.['OpenLocationCode']?.plus_code,
      };

      return {
        lat: first.geometry.lat,
        lng: first.geometry.lng,
        formattedAddress: first.formatted,
        confidence: first.confidence || 8,
        rateLimitRemaining: data.rate?.remaining ?? rateRemaining,
        rateLimitLimit: data.rate?.limit ?? rateLimit,
        rateLimitReset: data.rate?.reset,
        source: 'opencage_api',
        components: first.components,
        annotations,
        bounds: first.bounds,
        statusCode: data.status?.code || 200,
        raw: first,
      };
    }

    return {
      lat,
      lng,
      formattedAddress: `Uninhabited / Sea (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      confidence: 3,
      source: 'local_fallback',
    };
  } catch (err) {
    console.warn('[OpenCage API] Reverse geocoding failed:', err);
    return {
      lat,
      lng,
      formattedAddress: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      confidence: 2,
      source: 'local_fallback',
    };
  }
}

/**
 * Places Autosuggest / Geosearch using OpenCage Geocoding API
 * Follows OpenCage AI Agent Skill specifications (OpenCageData/opencage-skills: opencage-geosearch)
 */
export async function searchPlacesWithOpenCage(
  query: string,
  apiKey: string = USER_DEFAULT_OPENCAGE_KEY,
  options?: { countryCode?: string; limit?: number }
): Promise<OpenCageGeosearchSuggestion[]> {
  const clean = query.trim();
  if (clean.length < 2 || !apiKey) return [];

  try {
    const params = new URLSearchParams({
      q: clean,
      key: apiKey,
      limit: String(options?.limit || 5),
      no_annotations: '1',
    });

    if (options?.countryCode) {
      params.append('countrycode', options.countryCode.toLowerCase());
    }

    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.results) return [];

    return data.results.map((item: any) => ({
      formatted: item.formatted,
      lat: item.geometry.lat,
      lng: item.geometry.lng,
      confidence: item.confidence,
      components: item.components,
    }));
  } catch {
    return [];
  }
}
