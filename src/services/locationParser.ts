import { isPlusCode, resolvePlusCode } from './plusCodeService';

export interface ParsedLocation {
  lat: number;
  lng: number;
  /** What the position was read from, shown back to the user. */
  from: string;
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';
const PAIR = `${NUM}\\s*,\\s*${NUM}`;

const validPair = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Reads a position from what people actually paste: a WhatsApp location message,
 * a Google Maps or Apple Maps link, plain "lat, lng", or a Plus Code.
 * Returns an error message instead when it cannot.
 */
export function parseSharedLocation(raw: string): ParsedLocation | { error: string } {
  const text = raw.trim();
  if (!text) return { error: 'Paste a location first.' };

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    /* keep the raw text */
  }

  // Short links hide the coordinates behind a redirect that a web page cannot follow
  if (/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(decoded) && !new RegExp(PAIR).test(decoded)) {
    return {
      error:
        'That is a short link and its coordinates are hidden. Open it, then copy the long link or the numbers from the address bar. In WhatsApp, a shared location message usually contains the full link.',
    };
  }

  const patterns: [RegExp, string][] = [
    [new RegExp(`!3d${NUM}!4d${NUM}`), 'Google Maps link'],
    [new RegExp(`@${PAIR}`), 'Google Maps link'],
    [new RegExp(`[?&](?:q|ll|query|destination|center|sll)=${PAIR}`), 'map link'],
    [new RegExp(`^${PAIR}$`), 'coordinates'],
  ];
  for (const [rx, from] of patterns) {
    const m = decoded.match(rx);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (validPair(lat, lng)) return { lat, lng, from };
    }
  }

  // Any "lat, lng" pair inside a longer message, e.g. "My location: 34.01, 71.52"
  const loose = decoded.match(new RegExp(`${NUM}\\s*,\\s*${NUM}`));
  if (loose) {
    const lat = parseFloat(loose[1]);
    const lng = parseFloat(loose[2]);
    if (validPair(lat, lng) && /\d\.\d/.test(loose[0])) return { lat, lng, from: 'coordinates in the message' };
  }

  if (isPlusCode(decoded)) {
    const plus = resolvePlusCode(decoded);
    if (plus) return { lat: plus.lat, lng: plus.lng, from: `Plus Code ${plus.shortCode}` };
  }

  return {
    error:
      'No position found. Paste a WhatsApp or Google Maps location link, coordinates like 34.0151, 71.5249, or a Plus Code.',
  };
}
