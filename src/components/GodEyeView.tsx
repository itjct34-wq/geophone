import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Eye, LocateFixed, Mountain, RotateCw, Tag, Globe2 } from 'lucide-react';

interface GodEyeViewProps {
  /** Position of the current lookup, or null when no number has been entered. */
  target: { lat: number; lng: number; label: string } | null;
}

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export const GodEyeView: React.FC<GodEyeViewProps> = ({ target }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const spinRef = useRef<number | null>(null);
  const [terrainOn, setTerrainOn] = useState(true);
  const [labelsOn, setLabelsOn] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [myPosError, setMyPosError] = useState('');

  // Create the globe once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        projection: { type: 'globe' },
        sources: {
          imagery: {
            type: 'raster',
            tiles: [ESRI_IMAGERY],
            tileSize: 256,
            maxzoom: 18,
            attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
          },
          labels: {
            type: 'raster',
            tiles: [ESRI_LABELS],
            tileSize: 256,
            maxzoom: 18,
            attribution: 'Labels &copy; Esri',
          },
          dem: {
            type: 'raster-dem',
            tiles: [TERRAIN_TILES],
            tileSize: 256,
            maxzoom: 14,
            encoding: 'terrarium',
            attribution: 'Terrain: Mapzen / AWS Open Data',
          },
        },
        layers: [
          { id: 'imagery', type: 'raster', source: 'imagery' },
          { id: 'labels', type: 'raster', source: 'labels' },
        ],
        terrain: { source: 'dem', exaggeration: 1.5 },
      },
      center: [20, 20],
      zoom: 1.6,
      pitch: 0,
      maxPitch: 80,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    mapRef.current = map;

    return () => {
      if (spinRef.current !== null) cancelAnimationFrame(spinRef.current);
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to the current lookup position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !target) return;
    markerRef.current?.remove();
    markerRef.current = new maplibregl.Marker({ color: '#22d3ee' })
      .setLngLat([target.lng, target.lat])
      .setPopup(new maplibregl.Popup({ offset: 24 }).setText(target.label))
      .addTo(map);
    map.flyTo({ center: [target.lng, target.lat], zoom: 13, pitch: 60, bearing: -20, duration: 4500, essential: true });
  }, [target]);

  // Toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => map.setTerrain(terrainOn ? { source: 'dem', exaggeration: 1.5 } : null);
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [terrainOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => map.setLayoutProperty('labels', 'visibility', labelsOn ? 'visible' : 'none');
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [labelsOn]);

  // Slow orbit around the current centre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !spinning) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      map.setBearing(map.getBearing() + dt * 0.006);
      spinRef.current = requestAnimationFrame(step);
    };
    spinRef.current = requestAnimationFrame(step);
    const stop = () => setSpinning(false);
    map.on('mousedown', stop);
    map.on('touchstart', stop);
    return () => {
      if (spinRef.current !== null) cancelAnimationFrame(spinRef.current);
      map.off('mousedown', stop);
      map.off('touchstart', stop);
    };
  }, [spinning]);

  const flyToMe = () => {
    setMyPosError('');
    if (!navigator.geolocation) {
      setMyPosError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
          pitch: 65,
          duration: 4000,
          essential: true,
        }),
      (err) =>
        setMyPosError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : 'Could not get your position.',
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const toggleClass = (on: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
      on
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
    }`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">God Eye View</h2>
          <span className="hidden sm:inline text-xs text-slate-500">
            Drag to rotate the globe · right-drag or Ctrl-drag to tilt · scroll to zoom
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setTerrainOn((v) => !v)} className={toggleClass(terrainOn)} aria-pressed={terrainOn}>
            <Mountain className="w-3.5 h-3.5" />
            <span>3D terrain</span>
          </button>
          <button onClick={() => setLabelsOn((v) => !v)} className={toggleClass(labelsOn)} aria-pressed={labelsOn}>
            <Tag className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>
          <button onClick={() => setSpinning((v) => !v)} className={toggleClass(spinning)} aria-pressed={spinning}>
            <RotateCw className="w-3.5 h-3.5" />
            <span>Orbit</span>
          </button>
          <button
            onClick={() => mapRef.current?.flyTo({ center: [20, 20], zoom: 1.6, pitch: 0, bearing: 0, duration: 3000 })}
            className={toggleClass(false)}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Whole Earth</span>
          </button>
          <button onClick={flyToMe} className={toggleClass(false)}>
            <LocateFixed className="w-3.5 h-3.5" />
            <span>My location</span>
          </button>
        </div>
      </div>

      {myPosError && (
        <p role="alert" className="text-xs text-rose-400">
          {myPosError}
        </p>
      )}

      {!target && (
        <p className="text-xs text-slate-400">
          Look up a number first and the globe will fly to its area, or use My location.
        </p>
      )}

      <div className="relative w-full h-[560px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
