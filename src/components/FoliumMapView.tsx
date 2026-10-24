import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Download,
  LocateFixed,
  Globe,
  Map,
  Mountain,
  Moon,
  Search,
  MapPin,
  X,
  RefreshCw,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { PhoneLookupResult, MapTileLayer } from '../types/phone';
import { generateFoliumHtml } from '../services/pythonScriptGenerator';
import {
  searchOpenStreetMap,
  reverseGeocodeOpenStreetMap,
  OpenSourcePlace
} from '../services/nominatimService';

interface FoliumMapViewProps {
  result: PhoneLookupResult;
  onExportHtml: () => void;
  onLocationSelected?: (place: { lat: number; lng: number; displayName: string }) => void;
}

export const FoliumMapView: React.FC<FoliumMapViewProps> = ({
  result,
  onExportHtml,
  onLocationSelected,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapTileLayer>('standard');
  const [zoomLevel, setZoomLevel] = useState<number>(9);

  // Open-Source Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OpenSourcePlace[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inspectedPlace, setInspectedPlace] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  // Convert decimal degrees to DMS string
  const toDms = (deg: number, isLat: boolean): string => {
    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const direction = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  // Open-Source Tile layers: OpenStreetMap, Esri Imagery, OpenTopoMap, CartoDB Dark Matter
  const getTileConfig = (layer: MapTileLayer): { url: string; attribution: string; maxZoom: number } => {
    switch (layer) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, Maxar, Earthstar Geographics (Open Access)',
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
          attribution: '&copy; OpenStreetMap contributors (Open Database)',
          maxZoom: 19,
        };
    }
  };

  // Handle Open-Source Search input
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setIsSearchOpen(true);
    try {
      const places = await searchOpenStreetMap(searchQuery, 'pk');
      setSearchResults(places);
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from open-source search results
  const handleSelectPlace = (place: OpenSourcePlace) => {
    setSearchResults([]);
    setIsSearchOpen(false);
    setSearchQuery(place.displayName.split(',')[0]);
    setInspectedPlace({
      lat: place.lat,
      lng: place.lng,
      name: place.displayName,
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([place.lat, place.lng], 14, { animate: true });

      // Place inspection marker
      if (clickMarkerRef.current) {
        mapInstanceRef.current.removeLayer(clickMarkerRef.current);
      }

      const searchPin = L.divIcon({
        className: 'custom-search-pin',
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 26px; height: 26px; background-color: #10b981; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(16,185,129,0.5); border: 2px solid #ffffff;"></div>
            <div style="position: absolute; width: 9px; height: 9px; background-color: #020617; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const m = L.marker([place.lat, place.lng], { icon: searchPin }).addTo(mapInstanceRef.current);
      m.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; max-width: 220px;">
          <div style="font-weight: 700; color: #10b981; margin-bottom: 4px;">OpenStreetMap Match</div>
          <div style="color: #0f172a; font-size: 12px; margin-bottom: 6px;">${place.displayName}</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}</div>
        </div>
      `).openPopup();
      clickMarkerRef.current = m;
    }

    if (onLocationSelected) {
      onLocationSelected({
        lat: place.lat,
        lng: place.lng,
        displayName: place.displayName,
      });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [result.coordinates.lat, result.coordinates.lng],
        zoom: 9,
        zoomControl: false,
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      map.on('zoomend', () => {
        setZoomLevel(map.getZoom());
      });

      // Click to reverse-geocode anywhere on the map
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        if (clickMarkerRef.current) {
          map.removeLayer(clickMarkerRef.current);
        }

        const clickPin = L.divIcon({
          className: 'custom-click-pin',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 24px; height: 24px; background-color: #8b5cf6; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(139,92,246,0.5); border: 2px solid #ffffff;"></div>
              <div style="position: absolute; width: 8px; height: 8px; background-color: #020617; border-radius: 50%;"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const tempMarker = L.marker([lat, lng], { icon: clickPin }).addTo(map);
        tempMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
            <div style="color: #8b5cf6; font-weight: 700;">Querying OpenStreetMap...</div>
            <div style="font-family: monospace; font-size: 11px; color: #64748b;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>
        `).openPopup();
        clickMarkerRef.current = tempMarker;

        // Fetch OpenStreetMap Nominatim reverse geocode
        const place = await reverseGeocodeOpenStreetMap(lat, lng);
        const name = place ? place.displayName : `Point at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        setInspectedPlace({ lat, lng, name });

        tempMarker.setPopupContent(`
          <div style="font-family: inherit; font-size: 13px; max-width: 240px;">
            <div style="font-weight: 700; color: #8b5cf6; margin-bottom: 4px;">OpenStreetMap Reverse Geocode</div>
            <div style="color: #0f172a; font-size: 12px; line-height: 1.4; margin-bottom: 6px;">${name}</div>
            <div style="font-size: 11px; color: #64748b; font-family: monospace; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `);
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const tileConfig = getTileConfig(activeLayer);

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = newTileLayer;

    // Pin icon for Folium phone target
    const customIcon = L.divIcon({
      className: 'custom-folium-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; background-color: #06b6d4; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(6,182,212,0.5); border: 2px solid #ffffff;"></div>
          <div style="position: absolute; width: 10px; height: 10px; background-color: #020617; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    // Update or add Marker
    if (markerRef.current) {
      markerRef.current.setLatLng([result.coordinates.lat, result.coordinates.lng]);
    } else {
      markerRef.current = L.marker([result.coordinates.lat, result.coordinates.lng], { icon: customIcon }).addTo(map);
    }

    const popupContent = `
      <div style="font-family: inherit; font-size: 13px; min-width: 200px;">
        <div style="font-weight: 700; font-size: 14px; color: #38bdf8; margin-bottom: 4px;">
          ${result.international || result.rawInput}
        </div>
        <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">
          ${result.carrier}
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #334155; padding-top: 6px;">
          <div><b>Region:</b> ${result.regionOrCity}</div>
          <div><b>Country:</b> ${result.countryName}</div>
          <div><b>Coordinates:</b> ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lng.toFixed(4)}</div>
          <div><b>Accuracy:</b> ~${result.coordinates.accuracyKm} km radius</div>
        </div>
      </div>
    `;

    markerRef.current.bindPopup(popupContent);

    // Update or add circle
    const radiusMeters = (result.coordinates.accuracyKm || 25) * 1000;
    if (circleRef.current) {
      circleRef.current.setLatLng([result.coordinates.lat, result.coordinates.lng]);
      circleRef.current.setRadius(radiusMeters);
    } else {
      circleRef.current = L.circle([result.coordinates.lat, result.coordinates.lng], {
        radius: radiusMeters,
        color: '#06b6d4',
        fillColor: '#0891b2',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);
    }

    const targetZoom = result.coordinates.accuracyKm < 0.1 ? 16 : result.coordinates.accuracyKm < 5 ? 13 : result.coordinates.accuracyKm < 50 ? 11 : 8;
    map.setView([result.coordinates.lat, result.coordinates.lng], targetZoom, { animate: true });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

  }, [result, activeLayer]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const targetZoom = result.coordinates.accuracyKm < 0.1 ? 16 : result.coordinates.accuracyKm < 5 ? 13 : result.coordinates.accuracyKm < 50 ? 11 : 8;
      mapInstanceRef.current.setView([result.coordinates.lat, result.coordinates.lng], targetZoom, { animate: true });
    }
  };

  const handleDownloadHtml = () => {
    const html = generateFoliumHtml(result);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location_${result.e164 || 'phone'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-[560px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* Top Map Toolbar: Open-Source Search + Layer Switcher */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        
        {/* OpenStreetMap Search Bar */}
        <div className="pointer-events-auto relative w-full sm:w-72">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setIsSearchOpen(true); }}
              placeholder="Search place or Plus Code (e.g. XXXX+XX City)..."
              className="w-full pl-8 pr-8 py-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 shadow-lg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]); setIsSearchOpen(false); }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-xl overflow-hidden divide-y divide-slate-800 max-h-60 overflow-y-auto text-xs z-50">
              {searchResults.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectPlace(p)}
                  className="p-2.5 hover:bg-slate-800/80 cursor-pointer flex items-start gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-slate-200 font-medium truncate">{p.displayName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · {p.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side controls: Layer Switcher & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto pointer-events-auto">
          {/* Layer Switcher: Standard, Satellite, Terrain, Dark */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveLayer('standard')}
              title="OpenStreetMap Standard"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeLayer === 'standard'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Standard</span>
            </button>
            <button
              onClick={() => setActiveLayer('satellite')}
              title="Esri Satellite Imagery"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeLayer === 'satellite'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setActiveLayer('terrain')}
              title="OpenTopoMap Elevation Contours"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeLayer === 'terrain'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Terrain</span>
            </button>
            <button
              onClick={() => setActiveLayer('dark')}
              title="CartoDB Dark Matter"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeLayer === 'dark'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>

          {/* Action Controls */}
          <button
            onClick={handleRecenter}
            title="Center Map on Target Coordinates"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900/90 backdrop-blur-md text-slate-200 hover:text-cyan-400 border border-slate-800 rounded-lg shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Recenter</span>
          </button>
          <button
            onClick={handleDownloadHtml}
            title="Download Standalone Folium HTML Map"
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold rounded-lg shadow-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export HTML</span>
          </button>
        </div>
      </div>

      {/* Main Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Bottom Floating Telemetry HUD */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg px-4 py-2.5 shadow-lg text-xs flex flex-col gap-1 pointer-events-auto max-w-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Open-Source GIS</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="uppercase text-[11px] text-slate-300">{activeLayer}</span>
            <span aria-hidden="true">·</span>
            <span>Zoom {zoomLevel}x</span>
          </div>
          <div className="flex items-center gap-2 font-mono tabular-nums text-slate-300">
            <span>{result.coordinates.lat.toFixed(4)}°</span>
            <span className="text-slate-600">/</span>
            <span>{result.coordinates.lng.toFixed(4)}°</span>
            <span className="text-slate-500 text-[11px] ml-1">
              ({toDms(result.coordinates.lat, true)}, {toDms(result.coordinates.lng, false)})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {inspectedPlace ? inspectedPlace.name : result.coordinates.displayName}
          </div>
          <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-800">
            Tip: Click anywhere on map to reverse-geocode with OpenStreetMap
          </div>
        </div>
      </div>
    </div>
  );
};
