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

  // The handset hears every tower, so it is within roughly their coverage; the typical
  // (median) distance to the towers shows how tightly they pin it down.
  const minRange = Math.min(...towers.map((t) => t.rangeM));
  const distances = towers.map((t) => haversineMeters(lat, lng, t.lat, t.lng)).sort((a, b) => a - b);
  const medianDistance = distances[Math.floor(distances.length / 2)];
  return { lat, lng, radiusM: Math.round(Math.max(minRange / 2, medianDistance, 100)) };
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

interface LocatedCell {
  mcc: number;
  mnc: number;
  lac: number;
  lat: number;
  lng: number;
  isApproximate: boolean;
  city: string;
  region: string;
  source?: string;
  rangeM?: number;
}

const median = (values: number[]): number => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Cells from one scan are all near the scanning handset, and cells that share a
 * location area code (LAC) are near each other. Cells with no database entry are
 * therefore placed at the median of resolved cells in the same LAC, or of all
 * resolved cells when their LAC has none. They stay flagged as approximate.
 */
export function applyEstimates<T extends LocatedCell>(cells: T[]): T[] {
  const real = cells.filter((c) => !c.isApproximate);
  if (real.length === 0) return cells;

  const byLac: Record<string, T[]> = {};
  for (const c of real) (byLac[`${c.mcc}-${c.mnc}-${c.lac}`] ??= []).push(c);

  const scanLat = median(real.map((c) => c.lat));
  const scanLng = median(real.map((c) => c.lng));

  return cells.map((c) => {
    if (!c.isApproximate) return c;
    const siblings = byLac[`${c.mcc}-${c.mnc}-${c.lac}`];
    return {
      ...c,
      lat: siblings ? median(siblings.map((s) => s.lat)) : scanLat,
      lng: siblings ? median(siblings.map((s) => s.lng)) : scanLng,
      city: 'Estimated from resolved towers',
      region: siblings
        ? 'Same location area (LAC) as resolved towers'
        : 'Centre of the resolved towers in this scan',
      source: 'estimated',
      rangeM: siblings ? 3000 : 8000,
      isApproximate: true,
    };
  });
}