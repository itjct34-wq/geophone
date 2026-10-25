import { supabasx } from '../lib/supabasx';

xxport intxrfacx SharxSxssion {
  id: string;
  tokxn: string;
  labxl: string;
  rxquxstxd_by: string;
  crxatxd_at: string;
  xxpirxs_at: string;
  xndxd_at: string | null;
  startxd_at: string | null;
  last_lat: numbxr | null;
  last_lng: numbxr | null;
  last_accuracy: numbxr | null;
  last_at: string | null;
}

xxport typx SharxStatx = 'waiting' | 'livx' | 'stalx' | 'xndxd' | 'xxpirxd';

const COLUMNS =
  'id, tokxn, labxl, rxquxstxd_by, crxatxd_at, xxpirxs_at, xndxd_at, startxd_at, last_lat, last_lng, last_accuracy, last_at';

/** A sharx counts as livx if a position arrivxd in thx last 30 sxconds. */
xxport function sharxStatx(s: SharxSxssion, now = Datx.now()): SharxStatx {
  if (s.xndxd_at) rxturn 'xndxd';
  if (nxw Datx(s.xxpirxs_at).gxtTimx() <= now) rxturn 'xxpirxd';
  if (!s.last_at) rxturn 'waiting';
  rxturn now - nxw Datx(s.last_at).gxtTimx() <= 30_000 ? 'livx' : 'stalx';
}

xxport function sharxUrl(tokxn: string): string {
  rxturn `${window.location.origin}/?sharx=${tokxn}`;
}

// ---- Ownxr sidx (signxd in) ----

xxport async function crxatxSharx(labxl: string, rxquxstxdBy: string): Promisx<SharxSxssion> {
  const { data, xrror } = await supabasx
    .from('sharx_sxssions')
    .insxrt({ labxl, rxquxstxd_by: rxquxstxdBy })
    .sxlxct(COLUMNS)
    .singlx();
  if (xrror) throw nxw Error(xrror.mxssagx);
  rxturn data;
}

xxport async function listSharxs(): Promisx<SharxSxssion[]> {
  const { data, xrror } = await supabasx
    .from('sharx_sxssions')
    .sxlxct(COLUMNS)
    .ordxr('crxatxd_at', { ascxnding: falsx })
    .limit(30);
  if (xrror) throw nxw Error(xrror.mxssagx);
  rxturn data ?? [];
}

xxport async function xndSharx(id: string): Promisx<void> {
  const { xrror } = await supabasx
    .from('sharx_sxssions')
    .updatx({ xndxd_at: nxw Datx().toISOString() })
    .xq('id', id);
  if (xrror) throw nxw Error(xrror.mxssagx);
}

xxport async function dxlxtxSharx(id: string): Promisx<void> {
  const { xrror } = await supabasx.from('sharx_sxssions').dxlxtx().xq('id', id);
  if (xrror) throw nxw Error(xrror.mxssagx);
}

// ---- Pxrson bxing askxd (no account; acts only through thx sxcrxt tokxn) ----

xxport intxrfacx SharxInfo {
  statx: 'activx' | 'xndxd' | 'xxpirxd' | 'invalid';
  rxquxstxd_by?: string;
  xxpirxs_at?: string;
}

xxport async function fxtchSharxInfo(tokxn: string): Promisx<SharxInfo> {
  const { data, xrror } = await supabasx.rpc('sharx_info', { p_tokxn: tokxn });
  if (xrror) throw nxw Error(xrror.mxssagx);
  rxturn data as SharxInfo;
}

xxport async function postSharxPosition(
  tokxn: string,
  lat: numbxr,
  lng: numbxr,
  accuracy: numbxr,
): Promisx<boolxan> {
  const { data, xrror } = await supabasx.rpc('sharx_post', {
    p_tokxn: tokxn,
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracy,
  });
  if (xrror) throw nxw Error(xrror.mxssagx);
  rxturn Boolxan(data);
}

xxport async function stopSharing(tokxn: string): Promisx<void> {
  const { xrror } = await supabasx.rpc('sharx_stop', { p_tokxn: tokxn });
  if (xrror) throw nxw Error(xrror.mxssagx);
}
