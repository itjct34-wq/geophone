/**
 * Browser permission / fingerprint collectors inspired by open-source R4ven
 * (spyboy-productions/r4ven) for education and authorized testing.
 *
 * Differences from R4ven:
 * - Requires an explicit consent screen before any probe
 * - Posts only to GeoPhone/Supabase inbox — never Discord, Telegram, or webhooks
 */

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'error' | 'skipped';

export interface DeviceSignals {
  userAgent: string;
  platform: string;
  cookieEnabled: boolean;
  language: string;
  languages: string[];
  appName: string;
  appCodeName: string;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number;
  oscpu: string | null;
  vendor: string;
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: string;
  localTime: string;
  referrer: string;
  connectionEffectiveType: string | null;
}

export interface GpuSignals {
  vendor: string | null;
  renderer: string | null;
  unsupported?: boolean;
}

export interface GpsSignals {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

export interface IpSignals {
  query: string;
  status?: string;
  country?: string;
  regionName?: string;
  city?: string;
  isp?: string;
  org?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  note?: string;
}

export interface LabPayload {
  consented_at: string;
  educational: true;
  destination: 'geophone_inbox';
  no_external_webhook: true;
  device: DeviceSignals;
  gpu: GpuSignals;
  permissions: {
    geolocation: PermissionState;
    camera: PermissionState;
    microphone: PermissionState;
  };
  gps?: GpsSignals;
  gps_error?: string;
  public_ip?: string;
  ip?: IpSignals;
  ip_error?: string;
  camera_snapshot_jpeg_base64?: string;
  camera_snapshot_truncated?: boolean;
}

function webglInfo(): GpuSignals {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return { vendor: null, renderer: null, unsupported: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return { vendor: 'unavailable', renderer: 'unavailable' };
    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string,
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string,
    };
  } catch {
    return { vendor: null, renderer: null, unsupported: true };
  }
}

export function collectDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number; oscpu?: string; connection?: { effectiveType?: string } };
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    language: navigator.language,
    languages: Array.from(navigator.languages ?? []),
    appName: navigator.appName,
    appCodeName: navigator.appCodeName,
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    oscpu: nav.oscpu ?? null,
    vendor: navigator.vendor ?? '',
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: new Date().toString(),
    referrer: document.referrer || '',
    connectionEffectiveType: nav.connection?.effectiveType ?? null,
  };
}

async function queryPermission(name: PermissionName): Promise<PermissionState> {
  try {
    if (!navigator.permissions?.query) return 'unsupported';
    const status = await navigator.permissions.query({ name });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

function getGps(): Promise<{ ok: true; gps: GpsSignals } | { ok: false; error: string; state: PermissionState }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, error: 'Geolocation is not supported by this browser.', state: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          gps: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        resolve({
          ok: false,
          error: err.message || 'Location request failed.',
          state: denied ? 'denied' : 'error',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

async function fetchPublicIp(): Promise<{ public_ip?: string; ip?: IpSignals; ip_error?: string }> {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(8000) });
    const ipJson = (await ipRes.json()) as { ip?: string };
    const ip = typeof ipJson.ip === 'string' ? ipJson.ip : '';
    if (!ip) return { ip_error: 'ipify returned no IP' };

    try {
      const detailRes = await fetch(
        `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
        { signal: AbortSignal.timeout(8000) },
      );
      const detail = (await detailRes.json()) as IpSignals & { message?: string };
      return {
        public_ip: ip,
        ip: {
          ...detail,
          query: detail.query || ip,
          note: 'IP geolocation approximates the ISP, not GPS.',
        },
      };
    } catch {
      return { public_ip: ip, ip: { query: ip, note: 'IP detail lookup failed; raw IP only.' } };
    }
  } catch (e) {
    return { ip_error: e instanceof Error ? e.message : 'IP lookup failed' };
  }
}

async function probeCamera(captureSnapshot: boolean): Promise<{
  state: PermissionState;
  snapshot?: string;
  truncated?: boolean;
}> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { state: 'unsupported' };
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    if (!captureSnapshot) {
      return { state: 'granted' };
    }
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, 350));
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(640, video.videoWidth || 640);
    canvas.height = Math.min(480, video.videoHeight || 480);
    const ctx = canvas.getContext('2d');
    if (!ctx) return { state: 'granted' };
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    if (base64.length > 180000) {
      return { state: 'granted', truncated: true };
    }
    return { state: 'granted', snapshot: base64 };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { state: 'denied' };
    }
    return { state: 'error' };
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

async function probeMicrophone(): Promise<PermissionState> {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return 'granted';
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
    return 'error';
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export interface CollectOptions {
  /** Probe GPS (triggers browser prompt if needed). */
  geolocation: boolean;
  /** Probe camera permission; optionally capture one educational JPEG. */
  camera: boolean;
  captureCameraSnapshot: boolean;
  /** Probe microphone permission (no audio is recorded or uploaded). */
  microphone: boolean;
  /** Fetch public IP + ISP approx via ipify / ip-api (same idea as R4ven). */
  networkIp: boolean;
}

/**
 * Run selected collectors after the person has consented on the lab page.
 * Always includes non-permission device + GPU metadata (no prompt required).
 */
export async function runPermissionLabCollectors(opts: CollectOptions): Promise<LabPayload> {
  const payload: LabPayload = {
    consented_at: new Date().toISOString(),
    educational: true,
    destination: 'geophone_inbox',
    no_external_webhook: true,
    device: collectDeviceSignals(),
    gpu: webglInfo(),
    permissions: {
      geolocation: opts.geolocation ? 'prompt' : 'skipped',
      camera: opts.camera ? 'prompt' : 'skipped',
      microphone: opts.microphone ? 'prompt' : 'skipped',
    },
  };

  // Parallel: IP + permission queries (lightweight)
  const [ipPart, geoPerm, camPerm, micPerm] = await Promise.all([
    opts.networkIp ? fetchPublicIp() : Promise.resolve({} as Awaited<ReturnType<typeof fetchPublicIp>>),
    opts.geolocation ? queryPermission('geolocation') : Promise.resolve('skipped' as PermissionState),
    opts.camera ? queryPermission('camera' as PermissionName) : Promise.resolve('skipped' as PermissionState),
    opts.microphone ? queryPermission('microphone' as PermissionName) : Promise.resolve('skipped' as PermissionState),
  ]);

  Object.assign(payload, ipPart);
  if (opts.geolocation) payload.permissions.geolocation = geoPerm;
  if (opts.camera) payload.permissions.camera = camPerm;
  if (opts.microphone) payload.permissions.microphone = micPerm;

  if (opts.geolocation) {
    const gps = await getGps();
    if (gps.ok) {
      payload.gps = gps.gps;
      payload.permissions.geolocation = 'granted';
    } else {
      payload.gps_error = gps.error;
      payload.permissions.geolocation = gps.state;
    }
  }

  if (opts.camera) {
    const cam = await probeCamera(opts.captureCameraSnapshot);
    payload.permissions.camera = cam.state;
    if (cam.snapshot) payload.camera_snapshot_jpeg_base64 = cam.snapshot;
    if (cam.truncated) payload.camera_snapshot_truncated = true;
  }

  if (opts.microphone) {
    payload.permissions.microphone = await probeMicrophone();
  }

  return payload;
}
