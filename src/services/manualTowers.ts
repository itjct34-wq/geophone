import type { ResolvedUserCell } from '../data/userCellsImporter';

const STORAGE_KEY = 'geophone.manualtowers.v1';

export interface ManualPosition {
  lat: number;
  lng: number;
}

export const manualKey = (c: Pick<ResolvedUserCell, 'mcc' | 'mnc' | 'lac' | 'cid' | 'technology'>) =>
  `${c.mcc}-${c.mnc}-${c.lac}-${c.cid}-${c.technology}`;

export function readManualTowers(): Record<string, ManualPosition> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeManualTowers(positions: Record<string, ManualPosition>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    /* storage unavailable: positions last only until the page is closed */
  }
}

/** Typed positions beat database results and estimates. They are treated as accurate to about 100 m. */
export function applyManualTowers(cells: ResolvedUserCell[]): ResolvedUserCell[] {
  const manual = readManualTowers();
  if (Object.keys(manual).length === 0) return cells;
  return cells.map((c) => {
    const m = manual[manualKey(c)];
    return m
      ? {
          ...c,
          lat: m.lat,
          lng: m.lng,
          rangeM: 100,
          source: 'manual',
          city: 'Entered by you',
          region: 'Position typed in manually',
          isApproximate: false,
        }
      : c;
  });
}

export interface ParsedPositions {
  positions: Record<string, ManualPosition>;
  /** Cells that received a position. */
  matched: number;
  errors: string[];
}

const validLat = (n: number) => Number.isFinite(n) && n >= -90 && n <= 90;
const validLng = (n: number) => Number.isFinite(n) && n >= -180 && n <= 180;

/**
 * One position per line. Accepted forms:
 *   CID, latitude, longitude     (applies to every cell with that CID)
 *   latitude, longitude          (applies to the single ticked cell)
 * Separators can be commas, spaces, tabs or semicolons.
 */
export function parseManualPositions(
  text: string,
  cells: ResolvedUserCell[],
  selected: ResolvedUserCell[],
): ParsedPositions {
  const positions: Record<string, ManualPosition> = {};
  const errors: string[] = [];
  let matched = 0;

  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const nums = line.split(/[\s,;]+/).filter(Boolean).map(Number);
      const where = `Line ${i + 1}`;

      if (nums.length === 2) {
        const [lat, lng] = nums;
        if (!validLat(lat) || !validLng(lng)) return errors.push(`${where}: "${line}" is not a valid latitude, longitude.`);
        if (selected.length !== 1) return errors.push(`${where}: tick exactly one cell, or start the line with its CID.`);
        positions[manualKey(selected[0])] = { lat, lng };
        matched += 1;
        return;
      }

      if (nums.length === 3) {
        const [cid, lat, lng] = nums;
        if (!validLat(lat) || !validLng(lng)) return errors.push(`${where}: latitude must be −90 to 90 and longitude −180 to 180.`);
        const hits = cells.filter((c) => c.cid === cid);
        if (hits.length === 0) return errors.push(`${where}: no cell with CID ${cid} in your list.`);
        hits.forEach((c) => (positions[manualKey(c)] = { lat, lng }));
        matched += hits.length;
        return;
      }

      errors.push(`${where}: expected "CID, latitude, longitude" or "latitude, longitude".`);
    });

  return { positions, matched, errors };
}
