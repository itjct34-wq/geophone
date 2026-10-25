import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Crosshair,
  Radio,
  Share2,
  ShieldAlert,
  Smartphone,
  Copy,
  Check,
  MapPin,
  TowerControl,
  Wifi,
  Navigation,
  ExternalLink,
  Layers,
  LocateFixed,
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  Terminal,
  Activity,
  Signal,
  Database,
  Code2,
  RefreshCw,
  Cpu,
  Map,
  Globe,
  Mountain,
  Moon,
  Square
} from 'lucide-react';
import { PAKISTAN_CELLS_DATABASE, CellTowerData } from '../data/cellsData';
import {
  RAW_USER_CELLS_STRING,
  parseRawCellsJson,
  ResolvedUserCell,
} from '../data/userCellsImporter';
import { MapTileLayer } from '../types/phone';
import {
  applyEstimates,
  defaultRangeMeters,
  estimatePosition,
  lookupCell,
  type PositionEstimate,
} from '../services/triangulation';

interface LiveHandsetTrackerViewProps {
  currentNumber: string;
}

export const LiveHandsetTrackerView: React.FC<LiveHandsetTrackerViewProps> = ({ currentNumber }) => {
  const [activeTab, setActiveTab] = useState<'user_dump' | 'cells_table' | 'triangulation' | 'gps_link' | 'python_cells'>('user_dump');
  const [mapLayer, setMapLayer] = useState<MapTileLayer>('standard');

  // User-provided dump dataset state
  const [userCells, setUserCells] = useState<ResolvedUserCell[]>(() =>
    parseRawCellsJson(RAW_USER_CELLS_STRING)
  );
  const [selectedUserCell, setSelectedUserCell] = useState<ResolvedUserCell | null>(() => {
    const list = parseRawCellsJson(RAW_USER_CELLS_STRING);
    return list.length > 0 ? list[0] : null;
  });

  // Filter state for user dump
  const [userSearch, setUserSearch] = useState('');
  const [userOpFilter, setUserOpFilter] = useState('All');
  const [userTechFilter, setUserTechFilter] = useState('All');

  // Standard cells database state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedTower, setSelectedTower] = useState<CellTowerData>(PAKISTAN_CELLS_DATABASE[0]);

  // Real GPS State
  const [deviceGps, setDeviceGps] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    timestamp: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isWatchingGps, setIsWatchingGps] = useState(false);
  const [gpsTrail, setGpsTrail] = useState<[number, number][]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);

  // Triangulation: cells chosen by the user, and real-location lookups
  const [triangulationIds, setTriangulationIds] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Filtered User Cells
  const filteredUserCells = React.useMemo(() => {
    return userCells.filter((c) => {
      const matchOp = userOpFilter === 'All' || c.operatorShort === userOpFilter;
      const matchTech = userTechFilter === 'All' || c.technology === userTechFilter;
      const matchSearch =
        userSearch === '' ||
        c.cid.toString().includes(userSearch) ||
        c.lac.toString().includes(userSearch) ||
        c.operatorName.toLowerCase().includes(userSearch.toLowerCase()) ||
        c.city.toLowerCase().includes(userSearch.toLowerCase());
      return matchOp && matchTech && matchSearch;
    });
  }, [userCells, userOpFilter, userTechFilter, userSearch]);

  // Breakdown metrics of user dump
  const userStats = React.useMemo(() => {
    const zong = userCells.filter((c) => c.operatorShort === 'Zong').length;
    const jazz = userCells.filter((c) => c.operatorShort === 'Jazz').length;
    const ufone = userCells.filter((c) => c.operatorShort === 'Ufone').length;
    const telenor = userCells.filter((c) => c.operatorShort === 'Telenor').length;
    const warid = userCells.filter((c) => c.operatorShort === 'Warid').length;
    const lte = userCells.filter((c) => c.technology === 'LTE').length;
    const gsm = userCells.filter((c) => c.technology === 'GSM').length;
    return { zong, jazz, ufone, telenor, warid, lte, gsm, total: userCells.length };
  }, [userCells]);

  // Tracking link
  const trackingLinkUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?track_target=${encodeURIComponent(currentNumber)}&mode=live_gps`
    : 'https://app-url/?mode=live_gps';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingLinkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportUserCellsCsv = () => {
    const headers = [
      'CID',
      'LAC_Area',
      'MCC',
      'MNC',
      'Operator',
      'Technology',
      'Band',
      'Code',
      'Frequency',
      'City',
      'Region',
      'Latitude',
      'Longitude',
    ];

    const rows = filteredUserCells.map((c) => [
      c.cid,
      c.lac,
      c.mcc,
      c.mnc,
      `"${c.operatorName}"`,
      `"${c.technology}"`,
      `"${c.band}"`,
      c.code,
      c.frequency,
      `"${c.city}"`,
      `"${c.region}"`,
      c.lat.toFixed(6),
      c.lng.toFixed(6),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_cellular_dump_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Continuous device GPS (watchPosition) with a movement trail
  const stopLiveGps = () => {
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setIsWatchingGps(false);
  };

  const startLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your current browser.');
      return;
    }
    if (gpsWatchIdRef.current !== null) return;

    setGpsError(null);
    setGpsTrail([]);
    setIsWatchingGps(true);

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setDeviceGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          speed: pos.coords.speed,
          timestamp: new Date().toLocaleTimeString(),
        });
        setGpsTrail((prev) => [...prev.slice(-199), [pos.coords.latitude, pos.coords.longitude]]);
      },
      (err) => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Allow location access in your browser and try again.'
            : `Could not get a GPS fix: ${err.message}`,
        );
        stopLiveGps();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  useEffect(() => stopLiveGps, []);

  // Triangulation helpers
  const toggleTriangulationCell = (id: string) => {
    setTriangulationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const triangulationCells = React.useMemo(
    () => userCells.filter((c) => triangulationIds.includes(c.id)),
    [userCells, triangulationIds],
  );

  // Automatic: every tower with a real, accurately known position (within 2 km).
  // If the user ticks cells, those are used instead.
  const isAutoTriangulation = triangulationIds.length === 0;
  const triangulationBasis = React.useMemo(() => {
    if (!isAutoTriangulation) {
      const real = triangulationCells.filter((c) => !c.isApproximate);
      return real.length >= 3 ? real : triangulationCells;
    }
    return userCells.filter((c) => !c.isApproximate && (c.rangeM ?? 0) <= 2000);
  }, [isAutoTriangulation, triangulationCells, userCells]);

  const triangulationEstimate: PositionEstimate | null = React.useMemo(() => {
    if (triangulationBasis.length < 3) return null;
    return estimatePosition(
      triangulationBasis.map((c) => ({
        lat: c.lat,
        lng: c.lng,
        rangeM: defaultRangeMeters(c.technology),
      })),
    );
  }, [triangulationBasis]);

  // Replace area guesses with real tower positions (OpenCelliD, BeaconDB, Unwired Labs)
  const [resolveProgress, setResolveProgress] = useState<{ done: number; total: number } | null>(null);

  // Resolved positions are cached for a day so towers are not looked up again on every visit
  const CELL_CACHE_KEY = 'geophone.cellcache.v1';
  const CELL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  type CachedCell = { ts: number; hit: { lat: number; lng: number; rangeM: number; source: string } | null };

  const readCellCache = (): Record<string, CachedCell> => {
    try {
      return JSON.parse(localStorage.getItem(CELL_CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const writeCellCache = (cache: Record<string, CachedCell>) => {
    try {
      localStorage.setItem(CELL_CACHE_KEY, JSON.stringify(cache));
    } catch {
      /* storage unavailable: lookups simply are not cached */
    }
  };

  const cellKey = (c: ResolvedUserCell) => `${c.mcc}-${c.mnc}-${c.lac}-${c.cid}-${c.technology}`;

  const runResolve = async (targets: ResolvedUserCell[], silent: boolean, deep = false) => {
    const cache = readCellCache();
    const now = Date.now();
    const resolved: Record<string, { lat: number; lng: number; rangeM: number; source: string }> = {};
    const bySource: Record<string, number> = {};
    const toFetch: ResolvedUserCell[] = [];

    for (const c of targets) {
      const cached = cache[cellKey(c)];
      // A deep lookup retries cells earlier lookups could not find
      if (cached && now - cached.ts < CELL_CACHE_TTL_MS && !(deep && !cached.hit)) {
        if (cached.hit) {
          resolved[c.id] = cached.hit;
          bySource[cached.hit.source] = (bySource[cached.hit.source] ?? 0) + 1;
        }
      } else {
        toFetch.push(c);
      }
    }

    setIsResolving(true);
    if (!silent) setResolveMessage(null);
    setResolveProgress({ done: 0, total: toFetch.length });

    let failure: string | null = null;
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < toFetch.length && !failure) {
        const c = toFetch[next++];
        try {
          const hit = await lookupCell(c.mcc, c.mnc, c.lac, c.cid, c.technology, deep);
          cache[cellKey(c)] = { ts: Date.now(), hit };
          if (hit) {
            resolved[c.id] = hit;
            bySource[hit.source] = (bySource[hit.source] ?? 0) + 1;
          }
        } catch (err) {
          failure = err instanceof Error ? err.message : 'Tower lookup failed.';
        }
        done += 1;
        setResolveProgress({ done, total: toFetch.length });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    writeCellCache(cache);

    setUserCells((prev) =>
      applyEstimates(
        prev.map((c) => {
          const r = resolved[c.id];
          return r ? { ...c, lat: r.lat, lng: r.lng, rangeM: r.rangeM, source: r.source, isApproximate: false } : c;
        }),
      ),
    );

    const found = Object.keys(resolved).length;
    const breakdown = Object.entries(bySource)
      .map(([s, n]) => `${s} ${n}`)
      .join(', ');
    setResolveMessage(
      failure
        ? `Stopped: ${failure} (${found} resolved before the error).`
        : found === 0
        ? `No new towers found. ${targets.length} are not in any database, so they are shown at an estimated position near the towers that were found.`
        : `Found ${found} of ${targets.length} towers in databases${breakdown ? ` (${breakdown})` : ''}.${
            found < targets.length
              ? ` The other ${targets.length - found} are not in any database and are estimated near the found towers.`
              : ''
          }`,
    );
    setResolveProgress(null);
    setIsResolving(false);
  };

  const handleResolveRealTowers = () => {
    const targets = (triangulationCells.length > 0 ? triangulationCells : userCells).filter((c) => c.isApproximate);
    if (targets.length === 0) {
      setResolveMessage('All selected towers already have real positions.');
      return;
    }
    // Unwired Labs allows only a few lookups a day, so it is used for small selections only
    return runResolve(targets, false, triangulationCells.length > 0 && triangulationCells.length <= 5);
  };

  // Automatically resolve every tower once when this view opens
  const autoResolvedRef = useRef(false);
  useEffect(() => {
    if (autoResolvedRef.current) return;
    autoResolvedRef.current = true;
    runResolve(userCells, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Tile layer configuration helper
  const getTileConfig = (layer: MapTileLayer): { url: string; attribution: string; maxZoom: number } => {
    switch (layer) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 18,
        };
      case 'terrain':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap',
          maxZoom: 17,
        };
      case 'dark':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; CARTO &copy; OpenStreetMap',
          maxZoom: 19,
        };
      case 'standard':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        };
    }
  };

  // Python Script for user cells
  const pythonUserDumpScript = `#!/usr/bin/env python3
"""
Cellular Survey Decoder & Folium Map Visualizer
Loads MCC 410 (Pakistan) cellular survey dump and maps base stations
Requirements: pip install folium
"""

import folium

# Sample of your cellular survey records
cells_data = [
    {"cid": 3862, "area": 473, "mcc": 410, "mnc": 6, "operator": "Telenor", "lat": 33.5973, "lng": 73.0479},
    {"cid": 7823, "area": 7347, "mcc": 410, "mnc": 4, "operator": "Zong 4G", "lat": 33.6025, "lng": 73.0510},
    {"cid": 11276, "area": 10460, "mcc": 410, "mnc": 1, "operator": "Jazz", "lat": 33.6844, "lng": 73.0479},
    {"cid": 12192, "area": 52259, "mcc": 410, "mnc": 3, "operator": "Ufone", "lat": 34.0151, "lng": 71.5249},
    {"cid": 777986, "area": 60022, "mcc": 410, "mnc": 4, "operator": "Zong 4G LTE", "lat": 33.6931, "lng": 73.0533},
]

# Center map on Islamabad / Rawalpindi
cluster_map = folium.Map(location=[33.6844, 73.0479], zoom_start=11, tiles="OpenStreetMap")

for cell in cells_data:
    popup_text = f"<b>{cell['operator']}</b><br>CID: {cell['cid']}<br>LAC: {cell['area']}"
    folium.CircleMarker(
        location=[cell["lat"], cell["lng"]],
        radius=7,
        color="#06b6d4",
        fill=True,
        fill_color="#38bdf8",
        fill_opacity=0.7,
        popup=popup_text
    ).add_to(cluster_map)

cluster_map.save("cells_survey_map.html")
print("[✓] Generated cells_survey_map.html with your cellular dump!")
`;

  // Render Map markers and tile layers dynamically
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [33.6844, 73.0479],
        zoom: 11,
        zoomControl: true,
      });

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const tileConfig = getTileConfig(mapLayer);

    // Update Tile Layer if changed
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = newTileLayer;

    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (activeTab === 'user_dump') {
      // Plot all filtered user cells
      const bounds: [number, number][] = [];

      filteredUserCells.forEach((c) => {
        const isSelected = selectedUserCell?.id === c.id;

        // Carrier color coding
        let pinColor = '#06b6d4'; // Zong
        if (c.operatorShort === 'Jazz') pinColor = '#ef4444';
        else if (c.operatorShort === 'Ufone') pinColor = '#f59e0b';
        else if (c.operatorShort === 'Telenor') pinColor = '#38bdf8';
        else if (c.operatorShort === 'Warid') pinColor = '#a855f7';

        const markerHtml = `
          <div style="position: relative; width: ${isSelected ? '26px' : '18px'}; height: ${isSelected ? '26px' : '18px'}; display: flex; align-items: center; justify-content: center;">
            <div style="width: ${isSelected ? '22px' : '14px'}; height: ${isSelected ? '22px' : '14px'}; background: ${pinColor}; border: ${isSelected ? '3px' : '2px'} solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px ${pinColor};"></div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'user-cell-pin',
          html: markerHtml,
          iconSize: [isSelected ? 26 : 18, isSelected ? 26 : 18],
          iconAnchor: [isSelected ? 13 : 9, isSelected ? 13 : 9],
        });

        const m = L.marker([c.lat, c.lng], { icon }).addTo(group);
        m.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 200px;">
            <div style="font-weight: bold; color: ${pinColor}; font-size: 13px;">${c.operatorName}</div>
            <div style="color: #475569; margin: 3px 0;">${c.city} (${c.region})</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; border-top: 1px solid #e2e8f0; padding-top: 5px; margin-top: 5px;">
              <div><b>Cell ID (CID):</b> ${c.cid}</div>
              <div><b>LAC / TAC:</b> ${c.lac}</div>
              <div><b>Tech:</b> ${c.technology}</div>
              <div><b>Band:</b> ${c.band}</div>
              <div><b>Frequency:</b> ${c.frequency}</div>
              <div><b>Code:</b> ${c.code}</div>
            </div>
          </div>
        `);

        if (isSelected) {
          m.openPopup();
        }

        bounds.push([c.lat, c.lng]);
      });

      if (selectedUserCell) {
        map.setView([selectedUserCell.lat, selectedUserCell.lng], 13);
      } else if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
      }

    } else if (activeTab === 'cells_table' || activeTab === 'python_cells') {
      const tower = selectedTower;
      const towerIcon = L.divIcon({
        className: 'tower-pin',
        html: `
          <div style="width: 28px; height: 28px; background: #06b6d4; border: 2px solid #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(6,182,212,0.8);">
            <span style="color: #020617; font-size: 11px; font-weight: bold;">BTS</span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([tower.lat, tower.lng], { icon: towerIcon }).addTo(group).bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <b>${tower.cellName}</b><br/>
          CID: ${tower.cid} | LAC: ${tower.lac}
        </div>
      `).openPopup();

      L.circle([tower.lat, tower.lng], {
        radius: tower.rangeMeters,
        color: '#06b6d4',
        fillColor: '#0891b2',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(group);

      map.setView([tower.lat, tower.lng], 14);

    } else if (activeTab === 'triangulation') {
      const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#38bdf8'];
      const pts: [number, number][] = [];

      triangulationBasis.forEach((c, idx) => {
        const color = colors[idx % colors.length];
        const range = defaultRangeMeters(c.technology);
        L.circle([c.lat, c.lng], {
          radius: range,
          color,
          fillColor: color,
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(group);
        L.circleMarker([c.lat, c.lng], { radius: 6, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1 })
          .addTo(group)
          .bindPopup(`<b>${c.operatorName}</b><br/>CID ${c.cid} · LAC ${c.lac}<br/>${c.isApproximate ? 'Approximate position' : 'Resolved tower position'}`);
        pts.push([c.lat, c.lng]);
      });

      if (triangulationEstimate) {
        L.circle([triangulationEstimate.lat, triangulationEstimate.lng], {
          radius: triangulationEstimate.radiusM,
          color: '#a855f7',
          fillColor: '#a855f7',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(group);
        L.marker([triangulationEstimate.lat, triangulationEstimate.lng], {
          icon: L.divIcon({
            className: 'handset-triangulated',
            html: '<div style="width:16px;height:16px;background:#a855f7;border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 12px #a855f7;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(group)
          .bindPopup(`<b>Estimated position</b><br/>±${triangulationEstimate.radiusM} m`);
        pts.push([triangulationEstimate.lat, triangulationEstimate.lng]);
      }

      if (pts.length > 0) {
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 14 });
      }

    } else if (activeTab === 'gps_link') {
      if (deviceGps) {
        const here: [number, number] = [deviceGps.lat, deviceGps.lng];
        if (gpsTrail.length > 1) {
          L.polyline(gpsTrail, { color: '#10b981', weight: 3, opacity: 0.7 }).addTo(group);
        }
        L.circle(here, {
          radius: deviceGps.accuracy,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(group);
        L.marker(here, {
          icon: L.divIcon({
            className: 'gps-live-pin',
            html: '<div style="width:18px;height:18px;background:#10b981;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 12px #10b981;"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        })
          .addTo(group)
          .bindPopup(`<b>Live GPS</b><br/>${deviceGps.lat.toFixed(6)}, ${deviceGps.lng.toFixed(6)}<br/>±${deviceGps.accuracy} m`);
        map.setView(here, Math.max(map.getZoom(), 16));
      }
    }
    setTimeout(() => map.invalidateSize(), 150);
  }, [activeTab, filteredUserCells, selectedUserCell, selectedTower, deviceGps, gpsTrail, triangulationBasis, triangulationEstimate, mapLayer]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-slate-100">
                Cellular Survey Dump & BTS Cells Intelligence
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Loaded your cellular scan containing <span className="text-cyan-300 font-mono font-bold">{userStats.total} Base Stations</span> across Pakistan (Zong, Jazz, Ufone, Telenor, Warid).
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('user_dump')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'user_dump'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Your Imported Cells ({userStats.total})
            </button>
            <button
              onClick={() => setActiveTab('triangulation')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'triangulation'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Triangulation
            </button>
            <button
              onClick={() => setActiveTab('gps_link')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'gps_link'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Device GPS
            </button>
            <button
              onClick={() => setActiveTab('python_cells')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'python_cells'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python Script
            </button>
          </div>
        </div>

        {/* Breakdown Badges for User Cells */}
        {activeTab === 'user_dump' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <button
                onClick={() => setUserOpFilter(userOpFilter === 'Zong' ? 'All' : 'Zong')}
                className={`p-2.5 bg-slate-950 border rounded-lg flex flex-col text-left transition-all ${
                  userOpFilter === 'Zong'
                    ? 'border-emerald-400 ring-1 ring-emerald-400/50 bg-emerald-950/20'
                    : 'border-emerald-900/40 hover:border-emerald-700'
                }`}
              >
                <span className="text-[11px] text-slate-400">Zong 4G (MNC 4)</span>
                <span className="text-base font-bold font-mono text-emerald-400">{userStats.zong} Cells</span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5">{userOpFilter === 'Zong' ? '✓ Filter Active' : 'Click to Filter'}</span>
              </button>
              <button
                onClick={() => setUserOpFilter(userOpFilter === 'Jazz' ? 'All' : 'Jazz')}
                className={`p-2.5 bg-slate-950 border rounded-lg flex flex-col text-left transition-all ${
                  userOpFilter === 'Jazz'
                    ? 'border-red-400 ring-1 ring-red-400/50 bg-red-950/20'
                    : 'border-red-900/40 hover:border-red-700'
                }`}
              >
                <span className="text-[11px] text-slate-400">Jazz (MNC 1)</span>
                <span className="text-base font-bold font-mono text-red-400">{userStats.jazz} Cells</span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5">{userOpFilter === 'Jazz' ? '✓ Filter Active' : 'Click to Filter'}</span>
              </button>
              <button
                onClick={() => setUserOpFilter(userOpFilter === 'Ufone' ? 'All' : 'Ufone')}
                className={`p-2.5 bg-slate-950 border rounded-lg flex flex-col text-left transition-all ${
                  userOpFilter === 'Ufone'
                    ? 'border-amber-400 ring-1 ring-amber-400/50 bg-amber-950/20'
                    : 'border-amber-900/40 hover:border-amber-700'
                }`}
              >
                <span className="text-[11px] text-slate-400">Ufone (MNC 3)</span>
                <span className="text-base font-bold font-mono text-amber-400">{userStats.ufone} Cells</span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5">{userOpFilter === 'Ufone' ? '✓ Filter Active' : 'Click to Filter'}</span>
              </button>
              <button
                onClick={() => setUserOpFilter(userOpFilter === 'Telenor' ? 'All' : 'Telenor')}
                className={`p-2.5 bg-slate-950 border rounded-lg flex flex-col text-left transition-all ${
                  userOpFilter === 'Telenor'
                    ? 'border-sky-400 ring-1 ring-sky-400/50 bg-sky-950/20'
                    : 'border-sky-900/40 hover:border-sky-700'
                }`}
              >
                <span className="text-[11px] text-slate-400">Telenor (MNC 6)</span>
                <span className="text-base font-bold font-mono text-sky-400">{userStats.telenor} Cells</span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5">{userOpFilter === 'Telenor' ? '✓ Filter Active' : 'Click to Filter'}</span>
              </button>
              <button
                onClick={() => setUserOpFilter(userOpFilter === 'Warid' ? 'All' : 'Warid')}
                className={`p-2.5 bg-slate-950 border rounded-lg flex flex-col text-left transition-all ${
                  userOpFilter === 'Warid'
                    ? 'border-purple-400 ring-1 ring-purple-400/50 bg-purple-950/20'
                    : 'border-purple-900/40 hover:border-purple-700'
                }`}
              >
                <span className="text-[11px] text-slate-400">Warid (MNC 11)</span>
                <span className="text-base font-bold font-mono text-purple-400">{userStats.warid} Cells</span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5">{userOpFilter === 'Warid' ? '✓ Filter Active' : 'Click to Filter'}</span>
              </button>
              <button
                onClick={() => setUserTechFilter(userTechFilter === 'LTE' ? 'All' : 'LTE')}
                className={`p-2.5 bg-slate-950 border rounded-lg flex flex-col text-left transition-all ${
                  userTechFilter === 'LTE'
                    ? 'border-cyan-400 ring-1 ring-cyan-400/50 bg-cyan-950/20'
                    : 'border-cyan-900/40 hover:border-cyan-700'
                }`}
              >
                <span className="text-[11px] text-slate-400">4G LTE Nodes</span>
                <span className="text-base font-bold font-mono text-cyan-400">{userStats.lte} Cells</span>
                <span className="text-[10px] text-slate-500 font-sans mt-0.5">{userTechFilter === 'LTE' ? '✓ LTE Only' : 'Click to Filter'}</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter by CID (e.g. 7823, 802818), LAC Area (10460, 7347, 52250, 60023)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={userOpFilter}
                  onChange={(e) => setUserOpFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="All">All Carriers</option>
                  <option value="Zong">Zong 4G (MNC 4)</option>
                  <option value="Jazz">Jazz (MNC 1)</option>
                  <option value="Ufone">Ufone (MNC 3)</option>
                  <option value="Telenor">Telenor (MNC 6)</option>
                  <option value="Warid">Warid (MNC 11)</option>
                </select>

                <select
                  value={userTechFilter}
                  onChange={(e) => setUserTechFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="All">All Tech (LTE & GSM)</option>
                  <option value="LTE">4G LTE eNodeB</option>
                  <option value="GSM">2G / 3G GSM</option>
                </select>

                <button
                  onClick={handleExportUserCellsCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export ({filteredUserCells.length}) to CSV</span>
                </button>
              </div>
            </div>

            {/* High Density Table for User Dump */}
            <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-inner max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-8" title="Select 3+ cells for triangulation"></th>
                    <th className="px-3 py-2">Cell ID (CID)</th>
                    <th className="px-3 py-2">Carrier Network</th>
                    <th className="px-3 py-2">MCC</th>
                    <th className="px-3 py-2">MNC</th>
                    <th className="px-3 py-2">LAC / TAC (Area)</th>
                    <th className="px-3 py-2">Tech</th>
                    <th className="px-3 py-2">Band / Frequency</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Cluster Region</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono">
                  {filteredUserCells.map((cell) => {
                    const isSelected = selectedUserCell?.id === cell.id;
                    return (
                      <tr
                        key={cell.id}
                        onClick={() => setSelectedUserCell(cell)}
                        className={`transition-colors cursor-pointer hover:bg-slate-800/50 ${
                          isSelected ? 'bg-cyan-950/40 text-cyan-200' : ''
                        }`}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Use cell ${cell.cid} for triangulation`}
                            checked={triangulationIds.includes(cell.id)}
                            onChange={() => toggleTriangulationCell(cell.id)}
                            className="accent-amber-400"
                          />
                        </td>
                        <td className="px-3 py-2 text-emerald-400 font-bold whitespace-nowrap">
                          {cell.cid}
                          {!cell.isApproximate && <span className="ml-1 text-[9px] text-emerald-300 font-sans">real</span>}
                        </td>
                        <td className="px-3 py-2 font-sans whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            cell.operatorShort === 'Zong' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            cell.operatorShort === 'Jazz' ? 'bg-red-950 text-red-300 border border-red-800' :
                            cell.operatorShort === 'Ufone' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            cell.operatorShort === 'Telenor' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                            'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}>
                            {cell.operatorName}
                          </span>
                        </td>
                        <td className="px-3 py-2">{cell.mcc}</td>
                        <td className="px-3 py-2">{cell.mnc}</td>
                        <td className="px-3 py-2 text-cyan-400 font-semibold">{cell.lac}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${cell.technology === 'LTE' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-800 text-slate-300'}`}>
                            {cell.technology}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-400">{cell.band} ({cell.frequency})</td>
                        <td className="px-3 py-2 text-slate-300">{cell.code}</td>
                        <td className="px-3 py-2 font-sans text-slate-300 max-w-[180px] truncate">{cell.city}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserCell(cell);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-sans ${
                              isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            Locate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Cell Highlights Bar */}
            {selectedUserCell && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Signal className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">Inspecting Cell ID:</span>
                  <span className="text-cyan-300 font-mono font-bold">{selectedUserCell.cid}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">{selectedUserCell.operatorName}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
                  <span>LAC / TAC: {selectedUserCell.lac}</span>
                  <span aria-hidden="true">·</span>
                  <span>Cluster: {selectedUserCell.city}</span>
                  <span aria-hidden="true">·</span>
                  <span>Coordinates: {selectedUserCell.lat.toFixed(6)}, {selectedUserCell.lng.toFixed(6)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 3-TOWER TRIANGULATION */}
        {activeTab === 'triangulation' && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
            <div className="space-y-1">
              <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <Crosshair className="w-4 h-4" />
                <span>Multi-Cell Position Estimate</span>
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tick 3 or more cells in the <strong className="text-slate-200">Your Imported Cells</strong> table (the ones a handset reported as serving and neighbour cells). The estimate is a range-weighted centroid of those towers; the circle is its uncertainty. Accuracy depends on how real the tower positions are: run <strong className="text-slate-200">Resolve towers</strong> first.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleResolveRealTowers}
                disabled={isResolving}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResolving ? 'animate-spin' : ''}`} />
                <span>{resolveProgress ? `Resolving ${resolveProgress.done}/${resolveProgress.total}...` : isResolving ? 'Resolving...' : triangulationIds.length > 0 ? 'Resolve selected towers' : 'Resolve all towers'}</span>
              </button>
              <button
                onClick={() => setTriangulationIds([])}
                disabled={triangulationIds.length === 0}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg transition-colors"
              >
                Clear selection
              </button>
              <span className="text-slate-400">{triangulationIds.length} cell(s) selected</span>
              <span className="text-[11px] text-slate-500">Select 5 or fewer to also search Unwired Labs (limited daily quota).</span>
            </div>

            {resolveMessage && (
              <p role="status" className="text-[11px] text-slate-300">{resolveMessage}</p>
            )}

            {triangulationEstimate ? (
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-lg text-purple-200 font-mono text-xs">
                <span className="block mb-1 font-sans text-[11px] text-purple-300">
                  {isAutoTriangulation
                    ? `Automatic: using ${triangulationBasis.length} towers with real positions`
                    : `Using your ${triangulationBasis.length} selected towers`}
                </span>
                Estimated position: {triangulationEstimate.lat.toFixed(5)}, {triangulationEstimate.lng.toFixed(5)} · ±{triangulationEstimate.radiusM} m
                {triangulationBasis.some((c) => c.isApproximate) && (
                  <span className="block mt-1 font-sans text-[11px] text-amber-300">
                    {triangulationBasis.filter((c) => c.isApproximate).length} of {triangulationBasis.length} cells still use approximate area positions, so this result is only indicative. Select 3 or more resolved towers (marked 'real') for a trustworthy estimate.
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {isAutoTriangulation
                  ? `Waiting for 3 towers with real positions (${triangulationBasis.length} so far). The estimate appears here automatically.`
                  : 'Select at least 3 cells to compute an estimate.'}
              </p>
            )}
          </div>
        )}

        {/* Tab 3: LIVE GPS LINK */}
        {activeTab === 'gps_link' && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Device GPS (W3C Geolocation API)</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  When a smartphone user opens a tracking link and taps "Allow Location", the phone's native GPS chip streams exact latitude & longitude accurate to within 3 to 10 meters.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={isWatchingGps ? stopLiveGps : startLiveGps}
                  className={`px-3.5 py-2 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm ${
                    isWatchingGps
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isWatchingGps ? <Square className="w-3.5 h-3.5" /> : <LocateFixed className="w-3.5 h-3.5" />}
                  <span>{isWatchingGps ? 'Stop live tracking' : 'Start live tracking'}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied Link' : 'Copy GPS Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-300">
              <span className="text-slate-500">Tracking Link:</span>
              <span className="text-cyan-300 flex-1 truncate">{trackingLinkUrl}</span>
            </div>

            {gpsError && (
              <p role="alert" className="text-[11px] text-rose-400">{gpsError}</p>
            )}

            {!deviceGps && !gpsError && (
              <p className="text-[11px] text-slate-500">
                Start live tracking to follow this device. The position, accuracy circle and movement trail update continuously.
              </p>
            )}

            {deviceGps && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold">Live Handset GPS Fix Received:</span>
                </div>
                <div className="font-mono tabular-nums text-xs">
                  Lat: {deviceGps.lat.toFixed(6)} · Lng: {deviceGps.lng.toFixed(6)} · Accuracy: ±{deviceGps.accuracy}m · {deviceGps.timestamp}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: PYTHON SCRIPT */}
        {activeTab === 'python_cells' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Python script to map your cellular survey dump on Folium Leaflet:
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pythonUserDumpScript);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied Script' : 'Copy Python Code'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 max-h-[240px] overflow-y-auto">
              <pre>{pythonUserDumpScript}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Map Visualizer Container with Layer Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-200">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>
              {activeTab === 'user_dump'
                ? `Cellular Survey Cluster Map (${filteredUserCells.length} Base Stations Rendered)`
                : activeTab === 'triangulation'
                ? 'Multi-Tower Triangulation Intersection'
                : 'Folium & Leaflet GIS Engine'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {deviceGps && (
              <button
                onClick={() => mapInstanceRef.current?.setView([deviceGps.lat, deviceGps.lng], 16, { animate: true })}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 rounded-lg font-semibold transition-colors whitespace-nowrap shadow-sm text-xs"
                title="Center the map on your live GPS position"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Center on my GPS</span>
              </button>
            )}

            {/* Layer Switcher: Standard, Satellite, Terrain, Dark */}
            <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setMapLayer('standard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mapLayer === 'standard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Standard</span>
            </button>
            <button
              onClick={() => setMapLayer('satellite')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mapLayer === 'satellite'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setMapLayer('terrain')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mapLayer === 'terrain'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Terrain</span>
            </button>
            <button
              onClick={() => setMapLayer('dark')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mapLayer === 'dark'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

        <div className="relative w-full h-[480px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
