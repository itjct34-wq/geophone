// Vercel serverless function: proxies OpenCelliD so the API key stays server-side.
// Set OPENCELLID_KEY in the Vercel project environment variables.
export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const key = process.env.OPENCELLID_KEY;
  if (!key) {
    res.status(500).json({ error: 'OPENCELLID_KEY is not configured on the server.' });
    return;
  }

  const q = (name: string) => String(req.query[name] ?? '');
  const mcc = q('mcc');
  const mnc = q('mnc');
  const lac = q('lac');
  const cid = q('cid');
  if (![mcc, mnc, lac, cid].every((v) => /^\d+$/.test(v))) {
    res.status(400).json({ error: 'mcc, mnc, lac and cid must be numeric.' });
    return;
  }

  const radio = ['GSM', 'UMTS', 'LTE'].includes(q('radio')) ? q('radio') : 'GSM';
  const url =
    `https://opencellid.org/cell/get?key=${encodeURIComponent(key)}` +
    `&mcc=${mcc}&mnc=${mnc}&lac=${lac}&cellid=${cid}&radio=${radio}&format=json`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json().catch(() => null);
    if (typeof data?.error === 'string' && /api key/i.test(data.error)) {
      res.status(500).json({ error: 'OPENCELLID_KEY was rejected by OpenCelliD.' });
      return;
    }
    if (!upstream.ok || !data || data.error || typeof data.lat !== 'number') {
      res.status(404).json({ error: data?.error || 'Cell not found' });
      return;
    }
    res.status(200).json({ lat: data.lat, lng: data.lon, range: data.range });
  } catch {
    res.status(502).json({ error: 'OpenCelliD request failed.' });
  }
}
