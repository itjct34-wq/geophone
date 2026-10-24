import { OpenLocationCode } from 'open-location-code';

export interface ResolvedPlusCode {
  originalInput: string;
  shortCode: string;
  fullCode: string;
  locality?: string;
  displayName: string;
  lat: number;
  lng: number;
  accuracyMeters: number;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

// Reference coordinates for prominent Pakistani & global cities to recover short codes
const CITY_REFERENCE_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
  peshawar: { lat: 34.0151, lng: 71.5249, label: 'Peshawar, Khyber Pakhtunkhwa, Pakistan' },
  islamabad: { lat: 33.6844, lng: 73.0479, label: 'Islamabad Capital Territory, Pakistan' },
  rawalpindi: { lat: 33.5973, lng: 73.0479, label: 'Rawalpindi, Punjab, Pakistan' },
  lahore: { lat: 31.5204, lng: 74.3587, label: 'Lahore, Punjab, Pakistan' },
  karachi: { lat: 24.8607, lng: 67.0011, label: 'Karachi, Sindh, Pakistan' },
  faisalabad: { lat: 31.4504, lng: 73.1350, label: 'Faisalabad, Punjab, Pakistan' },
  multan: { lat: 30.1575, lng: 71.5249, label: 'Multan, Punjab, Pakistan' },
  quetta: { lat: 30.1798, lng: 66.9750, label: 'Quetta, Balochistan, Pakistan' },
  abbottabad: { lat: 34.1688, lng: 73.2215, label: 'Abbottabad, KPK, Pakistan' },
  mardan: { lat: 34.1989, lng: 72.0404, label: 'Mardan, KPK, Pakistan' },
  swat: { lat: 35.2227, lng: 72.4258, label: 'Swat, KPK, Pakistan' },
  gujranwala: { lat: 32.1877, lng: 74.1945, label: 'Gujranwala, Punjab, Pakistan' },
  sialkot: { lat: 32.4945, lng: 74.5229, label: 'Sialkot, Punjab, Pakistan' },
  pakistan: { lat: 33.6844, lng: 73.0479, label: 'Pakistan' },
};

/**
 * Checks if a string contains an Open Location Code (Plus Code) pattern
 */
export function isPlusCode(text: string): boolean {
  if (!text) return false;
  const plusCodeRegex = /[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}/i;
  return plusCodeRegex.test(text);
}

/**
 * Resolves any Plus Code (e.g. "3JWF+PMR Peshawar", "3JWF+PMR", or "8J6H3JWF+PMR")
 * to exact geographic latitude, longitude and human-readable address.
 */
export function resolvePlusCode(input: string): ResolvedPlusCode | null {
  const clean = input.trim();
  if (!clean) return null;

  // Extract Plus Code pattern from input string
  const plusCodeMatch = clean.match(/([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})/i);
  if (!plusCodeMatch) return null;

  const rawCode = plusCodeMatch[1].toUpperCase();

  // Extract city/locality name from the remaining text (e.g. "Peshawar" from "3JWF+PMR Peshawar")
  let localityCandidate = clean.replace(plusCodeMatch[0], '').replace(/[,\.\-\/]/g, ' ').trim().toLowerCase();
  
  // Default locality if not specified
  if (!localityCandidate) {
    localityCandidate = 'pakistan'; // generic national reference
  }

  // Find reference coordinates for the locality
  let refCoords = CITY_REFERENCE_COORDINATES['pakistan'];
  let matchedCityLabel = 'Pakistan';

  for (const [key, coords] of Object.entries(CITY_REFERENCE_COORDINATES)) {
    if (localityCandidate.includes(key)) {
      refCoords = coords;
      matchedCityLabel = coords.label;
      break;
    }
  }

  try {
    let fullCode = rawCode;

    // If it's a short code (e.g. 3JWF+PMR), recover using reference coordinate
    if (OpenLocationCode.isShort(rawCode)) {
      fullCode = OpenLocationCode.recoverNearest(rawCode, refCoords.lat, refCoords.lng);
    }

    if (!OpenLocationCode.isFull(fullCode)) {
      return null;
    }

    const codeArea = OpenLocationCode.decode(fullCode);
    const lat = codeArea.latitudeCenter;
    const lng = codeArea.longitudeCenter;

    const displayName = `Plus Code ${rawCode} (${matchedCityLabel})`;

    return {
      originalInput: clean,
      shortCode: rawCode,
      fullCode,
      locality: matchedCityLabel,
      displayName,
      lat,
      lng,
      accuracyMeters: 14, // Plus code 10-char resolution is ~14x14m
      bounds: {
        south: codeArea.latitudeLo,
        west: codeArea.longitudeLo,
        north: codeArea.latitudeHi,
        east: codeArea.longitudeHi,
      },
    };
  } catch (err) {
    console.warn('[PlusCode] Failed to decode plus code:', input, err);
    return null;
  }
}
