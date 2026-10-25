import { PhoneLookupResult } from '../types/phone';
import { USER_DEFAULT_OPENCAGE_KEY } from './openCageService';

export function generateExactUserScript(
  targetNumber: string = '<NUMBER>',
  apiKey: string = USER_DEFAULT_OPENCAGE_KEY,
  maskKey: boolean = true
): string {
  const cleanNumber = targetNumber.replace(/[^\d+]/g, '');
  const keyExpression = maskKey
    ? 'os.environ.get("OPENCAGE_API_KEY", "your_opencage_key_here")  # Kept secure via environment variable'
    : `"${apiKey}"  # Geocoder API Key`;

  return `import os
import phonenumbers
from phonenumbers import geocoder
from phonenumbers import carrier
import opencage
from opencage.geocoder import OpenCageGeocode
import folium

key = ${keyExpression}
number = input("${cleanNumber}: ") or "${cleanNumber}"
# Add leading '+' for international format if omitted
if not number.startswith("+"):
    number = "+" + number

new_number = phonenumbers.parse(number)
location = geocoder.description_for_number(new_number, "en")
print(f"Location: {location}")

service_name = carrier.name_for_number(new_number, "en")
print(f"Carrier:  {service_name}")

geocoder = OpenCageGeocode(key)
query = str(location)
result = geocoder.geocode(query)

if result and len(result) > 0:
    lat = result[0]['geometry']['lat']
    lng = result[0]['geometry']['lng']
    print(f"Coordinates: {lat}, {lng}")

    my_map = folium.Map(location=[lat, lng], zoom_start=9)
    folium.Marker([lat, lng], popup=location).add_to(my_map)

    my_map.save("location.html")
    print("location tracking completed")
    print("Thank you")
else:
    print(f"Could not find coordinates for query: {query}")
`;
}

export function generatePythonScript(
  phoneResult: PhoneLookupResult,
  openCageKey: string = USER_DEFAULT_OPENCAGE_KEY,
  maskKey: boolean = true
): string {
  const numberStr = phoneResult.international || phoneResult.rawInput || '+CC NNNNNNNNN';
  const numberLiteral = JSON.stringify(numberStr);
  const keyExpression = maskKey
    ? 'os.environ.get("OPENCAGE_API_KEY", "your_opencage_key_here")'
    : JSON.stringify(openCageKey);
  const countryAreaOnly = phoneResult.isValid && phoneResult.coordinates.isApproximate && phoneResult.coordinates.accuracyKm >= 100;
  const accuracyRadiusMeters = phoneResult.isValid && Number.isFinite(phoneResult.coordinates.accuracyKm) && phoneResult.coordinates.accuracyKm > 0
    ? Math.round(phoneResult.coordinates.accuracyKm * 1000)
    : 0;
  const mapZoom = !phoneResult.isValid ? 1.6
    : countryAreaOnly ? 5
    : accuracyRadiusMeters === 0 ? 9
    : accuracyRadiusMeters < 100 ? 16
    : accuracyRadiusMeters < 5000 ? 13
    : accuracyRadiusMeters < 50000 ? 11
    : 8;

  const geocodeBlock = countryAreaOnly
    ? [
        'lat, lng = default_lat, default_lng',
        'print("[!] Phone metadata identifies only a broad country/region, not a handset location.")',
      ].join('\n')
    : [
        'try:',
        '    results = geocoder_client.geocode(query)',
        '    if results and len(results) > 0:',
        "        lat = results[0]['geometry']['lat']",
        "        lng = results[0]['geometry']['lng']",
        "        formatted_address = results[0]['formatted']",
        '        print(f"[+] Geocoded Coordinates: {lat}, {lng}")',
        '        print(f"[+] Address: {formatted_address}")',
        '    else:',
        '        print("[-] Query returned empty results. Using regional fallback coordinates.")',
        '        lat, lng = default_lat, default_lng',
        'except Exception as e:',
        '    print(f"[-] Geocoding error ({e}). Using regional fallback coordinates.")',
        '    lat, lng = default_lat, default_lng',
      ].join('\n');

  const mapBlock = [
    'phone_map = folium.Map(location=[lat, lng], zoom_start=' + mapZoom + ', tiles="CartoDB dark_matter")',
    'if not country_only:',
    '    popup_html = f"""',
    '    <div style="font-family: sans-serif; width: 240px;">',
    '        <h4 style="margin: 0 0 8px 0; color: #0284c7;">{target_number}</h4>',
    '        <p style="margin: 4px 0;"><b>Region:</b> {location_description}</p>',
    '        <p style="margin: 4px 0;"><b>Carrier:</b> {service_carrier or "Cellular"}</p>',
    '        <p style="margin: 4px 0;"><b>Lat/Lng:</b> {lat:.4f}, {lng:.4f}</p>',
    '        <p style="margin: 4px 0;"><b>Estimate:</b> {f"Approximate radius: {accuracy_radius_m} m" if accuracy_radius_m else "Accuracy not reported"}</p>',
    '    </div>',
    '    """',
    '    folium.Marker([lat, lng], popup=folium.Popup(popup_html, max_width=300), tooltip=f"{target_number} ({location_description})", icon=folium.Icon(color="red", icon="phone", prefix="fa")).add_to(phone_map)',
    'if accuracy_radius_m > 0:',
    '    folium.Circle(',
    '        radius=accuracy_radius_m,',
    '        location=[lat, lng],',
    '        color="#0284c7",',
    '        dash_array="6, 6" if country_only else None,',
    '        fill=True,',
    '        fill_color="#38bdf8",',
    '        fill_opacity=0.08 if country_only else 0.2,',
    '        popup="Country-level approximate area, not a handset position." if country_only else "Approximate regional area, not a GPS fix.",',
    '    ).add_to(phone_map)',
    'else:',
    '    print("[!] No accuracy radius was reported; no uncertainty circle was drawn.")',
  ].join('\n');

  return `#!/usr/bin/env python3
"""
Phone Number Tracker & Geolocation Map Visualizer
Requirements:
    pip install phonenumbers folium geocoder opencage
"""

import os
import phonenumbers
from phonenumbers import geocoder, carrier, timezone
from opencage.geocoder import OpenCageGeocode
import folium

# 1. Target Phone Number
target_number = ${numberLiteral}

# 2. Parse phone number
parsed_number = phonenumbers.parse(target_number)

# 3. Extract Country and Region / State Description
location_description = geocoder.description_for_number(parsed_number, "en")
print(f"[+] Region / Country: {location_description}")

# 4. Extract Telecom Carrier Name
service_carrier = carrier.name_for_number(parsed_number, "en")
print(f"[+] Service Carrier: {service_carrier or 'Not specified / Mobile'}")

# 5. Extract Time Zones
time_zones = timezone.time_zones_for_number(parsed_number)
print(f"[+] Time Zones: {', '.join(time_zones)}")

# 6. Geocode the location coordinates using OpenCage Geocoder
KEY = ${keyExpression}
geocoder_client = OpenCageGeocode(KEY)
query = str(location_description)

default_lat = ${phoneResult.coordinates.lat}
default_lng = ${phoneResult.coordinates.lng}
country_only = ${countryAreaOnly ? 'True' : 'False'}
accuracy_radius_m = ${accuracyRadiusMeters}

${geocodeBlock}

${mapBlock}

# 8. Save map as standalone HTML file
output_file = "location.html"
phone_map.save(output_file)
print(f"[✓] Success! Interactive map saved to: {output_file}")
print("    Open 'location.html' in any browser to inspect the Folium map.")
`;
}

export function generateStandalonePythonScript(phoneResult: PhoneLookupResult): string {
  const numberStr = phoneResult.international || phoneResult.rawInput || '+CC NNNNNNNNN';
  const numberLiteral = JSON.stringify(numberStr);
  const countryOnly = phoneResult.isValid && phoneResult.coordinates.isApproximate && phoneResult.coordinates.accuracyKm >= 100;
  const accuracyRadiusMeters = phoneResult.isValid && Number.isFinite(phoneResult.coordinates.accuracyKm) && phoneResult.coordinates.accuracyKm > 0
    ? Math.round(phoneResult.coordinates.accuracyKm * 1000)
    : 0;
  const zoom = countryOnly ? 5 : accuracyRadiusMeters === 0 ? 9 : accuracyRadiusMeters < 100 ? 16 : accuracyRadiusMeters < 5000 ? 13 : accuracyRadiusMeters < 50000 ? 11 : 8;

  if (!phoneResult.isValid) {
    return `#!/usr/bin/env python3
import folium

print("Invalid phone number: no location can be plotted.")
folium.Map(location=[20, 20], zoom_start=1.6).save("phone_location.html")
`;
  }

  return `#!/usr/bin/env python3
"""
Zero-Key Phone Tracker with Folium Map (Free OpenStreetMap Nominatim)
Requires:
    pip install phonenumbers folium geopy
"""

import phonenumbers
from phonenumbers import geocoder, carrier, timezone
from geopy.geocoders import Nominatim
import folium

target_number = ${numberLiteral}
parsed_number = phonenumbers.parse(target_number)

location = geocoder.description_for_number(parsed_number, "en")
service_provider = carrier.name_for_number(parsed_number, "en")
tz_list = timezone.time_zones_for_number(parsed_number)

print(f"Target Number: {target_number}")
print(f"Location:      {location}")
print(f"Carrier:       {service_provider}")
print(f"Timezones:     {tz_list}")

geolocator = Nominatim(user_agent="geophone_tracker_app")
country_only = ${countryOnly ? 'True' : 'False'}
accuracy_radius_m = ${accuracyRadiusMeters}
default_lat, default_lng = ${phoneResult.coordinates.lat}, ${phoneResult.coordinates.lng}
geo = None if country_only else geolocator.geocode(location)

if country_only:
    lat, lng = default_lat, default_lng
    print("Country-level metadata only; the handset's current location is unknown.")
elif geo:
    lat, lng = geo.latitude, geo.longitude
    print(f"Approximate region coordinates: {lat}, {lng}")
else:
    lat, lng = default_lat, default_lng
    print(f"Using regional fallback coordinates: {lat}, {lng}")

my_map = folium.Map(location=[lat, lng], zoom_start=${zoom})
if not country_only:
    folium.Marker([lat, lng], popup=f"{target_number} - {location}. This is region metadata, not live GPS.").add_to(my_map)
if accuracy_radius_m > 0:
    folium.Circle(
        radius=accuracy_radius_m,
        location=[lat, lng],
        color="#0284c7",
        dash_array="6, 6" if country_only else None,
        fill=True,
        fill_color="#38bdf8",
        fill_opacity=0.08 if country_only else 0.2,
        popup="Country-level approximate area, not a handset position." if country_only else "Approximate region area, not GPS accuracy.",
    ).add_to(my_map)
else:
    print("No accuracy radius was reported; no uncertainty circle was drawn.")
my_map.save("phone_location.html")
print("Saved to phone_location.html")
`;
}

export function generateFoliumHtml(phoneResult: PhoneLookupResult): string {
  const { coordinates, carrier, countryName, regionOrCity, international, lineType } = phoneResult;
  const hasValidCoordinates =
    phoneResult.isValid &&
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180;
  const countryAreaOnly = hasValidCoordinates && coordinates.isApproximate && coordinates.accuracyKm >= 100;
  const accuracyKm = Number.isFinite(coordinates.accuracyKm) && coordinates.accuracyKm > 0
    ? coordinates.accuracyKm
    : 0;
  const radiusMeters = hasValidCoordinates ? Math.round(accuracyKm * 1000) : 0;
  const mapZoom = !hasValidCoordinates ? 1.6
    : countryAreaOnly ? 5
    : radiusMeters === 0 ? 9
    : radiusMeters < 100 ? 16
    : radiusMeters < 5000 ? 13
    : radiusMeters < 50000 ? 11
    : 8;
  const accuracyLabel = !hasValidCoordinates
    ? 'No location available for this invalid phone number.'
    : countryAreaOnly
    ? 'Country-level approximate area only; this is not the handset location.'
    : radiusMeters > 0
    ? `Approximate radius: ${accuracyKm} km.`
    : 'Accuracy not reported.';
  // JSON data is kept out of HTML interpolation so untrusted labels cannot inject markup.
  const popupPayload = JSON.stringify({
    title: international || 'Phone Geolocation',
    fields: {
      Country: countryName,
      Region: regionOrCity,
      Carrier: carrier,
      Type: lineType,
      Coordinates: hasValidCoordinates ? `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : 'Unavailable',
      Estimate: accuracyLabel,
    },
  }).replace(/</g, '\\u003c');
  const markerScript = hasValidCoordinates && !countryAreaOnly
    ? [
        `var marker = L.marker([${coordinates.lat}, ${coordinates.lng}], {}).addTo(map);`,
        'marker.bindPopup(buildPopup()).openPopup();',
      ].join('\n')
    : '';
  const circleScript = radiusMeters > 0
    ? [
        `var circle = L.circle([${coordinates.lat}, ${coordinates.lng}], {`,
        '  "color": "#06b6d4",',
        '  "dashArray": ' + (countryAreaOnly ? '"6, 6"' : 'null') + ',',
        '  "fill": true,',
        '  "fillColor": "#0891b2",',
        `  "fillOpacity": ${countryAreaOnly ? 0.08 : 0.2},`,
        `  "radius": ${radiusMeters},`,
        '  "weight": 2',
        '}).addTo(map);',
        'circle.bindPopup(buildPopup());',
        ...(countryAreaOnly ? ['map.fitBounds(circle.getBounds());'] : []),
      ].join('\n')
    : '';

  return `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
    <title>GeoPhone Location Map</title>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
        html, body {width: 100%; height: 100%; margin: 0; padding: 0;}
        #map_container {position: absolute; top: 0; bottom: 0; right: 0; left: 0;}
        .folium-popup {font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #1e293b;}
        .folium-popup h3 {margin: 0 0 6px 0; color: #0f172a; font-size: 15px;}
        .folium-popup div {margin: 4px 0; overflow-wrap: anywhere;}
    </style>
</head>
<body>
    <div id="map_container"></div>
    <script>
        var map = L.map("map_container", {
            center: [${hasValidCoordinates ? coordinates.lat : 20}, ${hasValidCoordinates ? coordinates.lng : 20}],
            crs: L.CRS.EPSG3857,
            zoom: ${mapZoom},
            zoomControl: true,
            preferCanvas: false,
        });

        var standardLayer = L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {"attribution": "&copy; OpenStreetMap contributors", "maxZoom": 19}
        );

        var satelliteLayer = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {"attribution": "&copy; Esri, Maxar, Earthstar Geographics", "maxZoom": 18}
        );

        var terrainLayer = L.tileLayer(
            "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
            {"attribution": "&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap", "maxZoom": 17}
        );

        var darkLayer = L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            {"attribution": "&copy; CARTO &copy; OpenStreetMap", "maxZoom": 19}
        );

        standardLayer.addTo(map);

        var baseMaps = {
            "Standard (OpenStreetMap)": standardLayer,
            "Satellite (Esri Imagery)": satelliteLayer,
            "Terrain (OpenTopoMap)": terrainLayer,
            "Dark (CartoDB)": darkLayer
        };
        L.control.layers(baseMaps, null, { collapsed: false, position: 'topright' }).addTo(map);

        const popupData = ${popupPayload};
        function buildPopup() {
            const container = document.createElement('div');
            container.className = 'folium-popup';
            const heading = document.createElement('h3');
            heading.textContent = popupData.title;
            container.appendChild(heading);
            Object.entries(popupData.fields).forEach(([label, value]) => {
                const row = document.createElement('div');
                row.textContent = label + ': ' + value;
                container.appendChild(row);
            });
            return container;
        }

        ${markerScript}
        ${circleScript}
    </script>
</body>
</html>`;
}
