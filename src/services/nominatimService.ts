/**
 * Open-Source Geocoding & Place Search Service
 * Powered 100% by OpenStreetMap (Nominatim & Photon)
 * Requires ZERO API keys, completely free and open-source.
 */

export interface OpenSourcePlace {
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  importance?: number;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countryCode?: string;
  };
  boundingBox?: [string, string, string, string]; // [minLat, maxLat, minLng, maxLng]
}

import { isPlusCode, resolvePlusCode } from './plusCodeService';

/**
 * Forward Geocoding with OpenStreetMap Nominatim and Google Plus Codes
 * Translates address, city, sector, landmark, or Plus Code to coordinates without any API key.
 */
export async function searchOpenStreetMap(
  query: string,
  countryCode?: string
): Promise<OpenSourcePlace[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  // 1. Direct Plus Code (Open Location Code) resolution (e.g. XXXX+XX City)
  if (isPlusCode(clean)) {
    const resolvedPlus = resolvePlusCode(clean);
    if (resolvedPlus) {
      return [{
        displayName: resolvedPlus.displayName,
        lat: resolvedPlus.lat,
        lng: resolvedPlus.lng,
        type: 'plus_code',
        importance: 1.0,
        address: {
          city: resolvedPlus.locality?.split(',')[0],
          country: resolvedPlus.locality?.split(',').pop()?.trim(),
        },
      }];
    }
  }

  try {
    const params = new URLSearchParams({
      q: clean,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '6',
    });

    if (countryCode) {
      params.append('countrycodes', countryCode.toLowerCase());
    }

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GeoPhoneIntelligence/2.0 (OpenSource Geospatial Map)',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item: any) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.category,
      importance: item.importance,
      address: {
        road: item.address?.road,
        suburb: item.address?.suburb || item.address?.neighbourhood,
        city: item.address?.city || item.address?.town || item.address?.village,
        district: item.address?.county || item.address?.state_district,
        state: item.address?.state,
        postcode: item.address?.postcode,
        country: item.address?.country,
        countryCode: item.address?.country_code,
      },
      boundingBox: item.boundingbox,
    }));
  } catch (err) {
    console.warn('[Nominatim] Search failed, trying Photon fallback:', err);
    return searchPhoton(clean);
  }
}

/**
 * Fast Autocomplete Place Search with Komoot Photon (OSM-powered)
 * Extremely fast response times for typing latency.
 */
export async function searchPhoton(query: string): Promise<OpenSourcePlace[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(clean)}&limit=5`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.features) return [];

    return data.features.map((f: any) => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry.coordinates;
      const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);

      return {
        displayName: parts.join(', ') || p.name || 'Unknown Location',
        lat,
        lng,
        type: p.osm_value || 'place',
        address: {
          road: p.street,
          city: p.city,
          district: p.district,
          state: p.state,
          country: p.country,
          postcode: p.postcode,
        },
      };
    });
  } catch {
    return [];
  }
}

/**
 * Reverse Geocoding with OpenStreetMap Nominatim
 * Resolves latitude and longitude coordinates into human-readable street addresses.
 */
export async function reverseGeocodeOpenStreetMap(
  lat: number,
  lng: number
): Promise<OpenSourcePlace | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=jsonv2&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GeoPhoneIntelligence/2.0 (OpenSource Geospatial Map)',
      },
    });

    if (!response.ok) return null;

    const item = await response.json();
    if (!item || !item.lat) return null;

    return {
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.category,
      address: {
        road: item.address?.road,
        suburb: item.address?.suburb || item.address?.neighbourhood,
        city: item.address?.city || item.address?.town || item.address?.village,
        district: item.address?.county || item.address?.state_district,
        state: item.address?.state,
        postcode: item.address?.postcode,
        country: item.address?.country,
        countryCode: item.address?.country_code,
      },
      boundingBox: item.boundingbox,
    };
  } catch (err) {
    console.warn('[Nominatim] Reverse geocode failed:', err);
    return null;
  }
}
