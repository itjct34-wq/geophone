export interface TowerPoint {
  lat: number;
  lng: number;
  /** Estimated coverage radius in meters. */
  rangeM: number;
}

export interface PositionEstimate {
  lat: number;
  lng: number;
  /** Uncertainty radius in meters. */
  radiusM: number;
}

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Typical macro-cell coverage radius by radio technology. */
export function defaultRangeMeters(technology: string): number {
  switch (technology) {
    case 'LTE':
      return 1500;
    case 'UMTS':
    case 'WCDMA':
      return 2500;
    default:
      return 3500; // GSM
  }
}

/**
 * Range-weighted centroid: towers with a smaller coverage radius are closer to
 * the handset, so they pull the estimate harder (weight = 1 / range^2).
 * The uncertainty is the farthest tower distance, capped by the weakest range.
 */
export function estimatePosition(towers: TowerPoint[]): PositionEstimate | null {
  if (towers.length === 0) return null;

  let wSum = 0;
  let lat = 0;
  let lng = 0;
  for (const t of towers) {
    const w = 1 / (t.rangeM * t.rangeM);
    wSum += w;
    lat += t.lat * w;
    lng += t.lng * w;
  }
  lat /= wSum;
  lng /= wSum;

  const minRange = Math.min(...towers.map((t) => t.rangeM));
  const maxSpread = Math.max(...towers.map((t) => haversineMeters(lat, lng, t.lat, t.lng)));
  return { lat, lng, radiusM: Math.round(Math.max(Math.min(maxSpread, minRange), 50)) };
}

export interface CellLookupResult {
  lat: number;
  lng: number;
  rangeM: number;
  source: string;
}

/** Resolves a real tower position through the /api/cell proxy (OpenCelliD, BeaconDB, Unwired Labs). */
export async function lookupCell(
  mcc: number,
  mnc: number,
  lac: number,
  cid: number,
  radio: string,
  deep = false,
): Promise<CellLookupResult | null> {
  const params = new URLSearchParams({
    mcc: String(mcc),
    mnc: String(mnc),
    lac: String(lac),
    cid: String(cid),
    radio,
  });
  if (deep) params.set('deep', '1');
  const res = await fetch(`/api/cell?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Cell lookup failed (${res.status})`);
  }
  const data = await res.json();
  if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return null;
  return {
    lat: data.lat,
    lng: data.lng,
    rangeM: data.range ?? defaultRangeMeters(radio),
    source: data.source ?? 'unknown',
  };
}
