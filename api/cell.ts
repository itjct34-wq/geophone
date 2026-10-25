// Vercel serverless function: resolves a cell tower to coordinates.
// Sources are tried in order and the first hit wins:
//   1. OpenCelliD   (needs OPENCELLID_KEY)
//   2. BeaconDB     (open, no key)
//   3. Unwired Labs (optional, needs UNWIREDLABS_TOKEN)
// Keys stay server-side.

interface Hit {
  lat: number;
  lng: number;
  range?: number;
  source: string;
}

type Radio = 'GSM' | 'UMTS' | 'LTE';

interface CellQuery {
  mcc: string;
  mnc: string;
  lac: string;
  cid: string;
  radio: Radio;
}

const TIMEOUT_MS = 8000;

async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

async function fromOpenCellId(q: CellQuery): Promise<Hit | null> {
  const key = process.env.OPENCELLID_KEY;
  if (!key) return null;
  const url =
    `https://opencellid.org/cell/get?key=${encodeURIComponent(key)}` +
    `&mcc=${q.mcc}&mnc=${q.mnc}&lac=${q.lac}&cellid=${q.cid}&radio=${q.radio}&format=json`;
  const data = await fetchJson(url);
  if (!data || data.error || typeof data.lat !== 'number') return null;
  return { lat: data.lat, lng: data.lon, range: data.range, source: 'OpenCelliD' };
}

async function fromBeaconDb(q: CellQuery): Promise<Hit | null> {
  const data = await fetchJson('https://api.beacondb.net/v1/geolocate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      considerIp: false,
      cellTowers: [
        {
          radioType: q.radio.toLowerCase(),
          mobileCountryCode: Number(q.mcc),
          mobileNetworkCode: Number(q.mnc),
          locationAreaCode: Number(q.lac),
          cellId: Number(q.cid),
        },
      ],
    }),
  });
  const loc = data?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
  return { lat: loc.lat, lng: loc.lng, range: data.accuracy, source: 'BeaconDB' };
}

async function fromUnwiredLabs(q: CellQuery): Promise<Hit | null> {
  const token = process.env.UNWIREDLABS_TOKEN;
  if (!token) return null;
  const data = await fetchJson('https://us1.unwiredlabs.com/v2/process.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      radio: q.radio.toLowerCase(),
      mcc: Number(q.mcc),
      mnc: Number(q.mnc),
      cells: [{ lac: Number(q.lac), cid: Number(q.cid) }],
      address: 0,
    }),
  });
  if (!data || data.status !== 'ok' || typeof data.lat !== 'number') return null;
  return { lat: data.lat, lng: data.lon, range: data.accuracy, source: 'Unwired Labs' };
}

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const q = (name: string) => String(req.query[name] ?? '');
  const mcc = q('mcc');
  const mnc = q('mnc');
  const lac = q('lac');
  const cid = q('cid');
  if (![mcc, mnc, lac, cid].every((v) => /^\d+$/.test(v))) {
    res.status(400).json({ error: 'mcc, mnc, lac and cid must be numeric.' });
    return;
  }
  const radio: Radio = (['GSM', 'UMTS', 'LTE'] as const).find((r) => r === q('radio')) ?? 'GSM';
  const query: CellQuery = { mcc, mnc, lac, cid, radio };

  for (const lookup of [fromOpenCellId, fromBeaconDb, fromUnwiredLabs]) {
    const hit = await lookup(query);
    if (hit) {
      res.status(200).json(hit);
      return;
    }
  }
  res.status(404).json({ error: 'Cell not found in any source.' });
}
