import { PresetNumber } from '../types/phone';

export interface CountryGeoInfo {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  accuracyKm: number;
  timezones: string[];
  flag: string;
}

export const COUNTRY_GEO_DATA: Record<string, CountryGeoInfo> = {
  US: { name: 'United States', lat: 37.0902, lng: -95.7129, zoom: 4, accuracyKm: 450, timezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'], flag: '🇺🇸' },
  CA: { name: 'Canada', lat: 56.1304, lng: -106.3468, zoom: 4, accuracyKm: 600, timezones: ['America/Toronto', 'America/Vancouver'], flag: '🇨🇦' },
  GB: { name: 'United Kingdom', lat: 55.3781, lng: -3.4360, zoom: 6, accuracyKm: 120, timezones: ['Europe/London'], flag: '🇬🇧' },
  PK: { name: 'Pakistan', lat: 30.3753, lng: 69.3451, zoom: 6, accuracyKm: 250, timezones: ['Asia/Karachi'], flag: '🇵🇰' },
  IN: { name: 'India', lat: 20.5937, lng: 78.9629, zoom: 5, accuracyKm: 350, timezones: ['Asia/Kolkata'], flag: '🇮🇳' },
  AU: { name: 'Australia', lat: -25.2744, lng: 133.7751, zoom: 4, accuracyKm: 500, timezones: ['Australia/Sydney', 'Australia/Perth'], flag: '🇦🇺' },
  DE: { name: 'Germany', lat: 51.1657, lng: 10.4515, zoom: 6, accuracyKm: 150, timezones: ['Europe/Berlin'], flag: '🇩🇪' },
  FR: { name: 'France', lat: 46.2276, lng: 2.2137, zoom: 6, accuracyKm: 180, timezones: ['Europe/Paris'], flag: '🇫🇷' },
  JP: { name: 'Japan', lat: 36.2048, lng: 138.2529, zoom: 6, accuracyKm: 160, timezones: ['Asia/Tokyo'], flag: '🇯🇵' },
  BR: { name: 'Brazil', lat: -14.2350, lng: -51.9253, zoom: 4, accuracyKm: 600, timezones: ['America/Sao_Paulo'], flag: '🇧🇷' },
  AE: { name: 'United Arab Emirates', lat: 23.4241, lng: 53.8478, zoom: 7, accuracyKm: 90, timezones: ['Asia/Dubai'], flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', lat: 23.8859, lng: 45.0792, zoom: 5, accuracyKm: 300, timezones: ['Asia/Riyadh'], flag: '🇸🇦' },
  SG: { name: 'Singapore', lat: 1.3521, lng: 103.8198, zoom: 11, accuracyKm: 15, timezones: ['Asia/Singapore'], flag: '🇸🇬' },
  ZA: { name: 'South Africa', lat: -30.5595, lng: 22.9375, zoom: 5, accuracyKm: 300, timezones: ['Africa/Johannesburg'], flag: '🇿🇦' },
  IT: { name: 'Italy', lat: 41.8719, lng: 12.5674, zoom: 6, accuracyKm: 150, timezones: ['Europe/Rome'], flag: '🇮🇹' },
  ES: { name: 'Spain', lat: 40.4637, lng: -3.7492, zoom: 6, accuracyKm: 180, timezones: ['Europe/Madrid'], flag: '🇪🇸' },
  NL: { name: 'Netherlands', lat: 52.1326, lng: 5.2913, zoom: 7, accuracyKm: 60, timezones: ['Europe/Amsterdam'], flag: '🇳🇱' },
  SE: { name: 'Sweden', lat: 60.1282, lng: 18.6435, zoom: 5, accuracyKm: 250, timezones: ['Europe/Stockholm'], flag: '🇸🇪' },
  CH: { name: 'Switzerland', lat: 46.8182, lng: 8.2275, zoom: 7, accuracyKm: 50, timezones: ['Europe/Zurich'], flag: '🇨🇭' },
  MX: { name: 'Mexico', lat: 23.6345, lng: -102.5528, zoom: 5, accuracyKm: 400, timezones: ['America/Mexico_City'], flag: '🇲🇽' },
};

// Regional sub-code mapping (US/CA area codes and international mobile network codes)
export const REGIONAL_AREA_CODES: Record<string, { region: string; lat: number; lng: number; carrier?: string }> = {
  // US & Canada Area Codes (sample of prominent ones)
  '1212': { region: 'New York, NY', lat: 40.7128, lng: -74.0060, carrier: 'Verizon / AT&T' },
  '1415': { region: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, carrier: 'AT&T / T-Mobile' },
  '1312': { region: 'Chicago, IL', lat: 41.8781, lng: -87.6298, carrier: 'Verizon' },
  '1310': { region: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, carrier: 'T-Mobile / AT&T' },
  '1206': { region: 'Seattle, WA', lat: 47.6062, lng: -122.3321, carrier: 'T-Mobile' },
  '1512': { region: 'Austin, TX', lat: 30.2672, lng: -97.7431, carrier: 'AT&T' },
  '1416': { region: 'Toronto, ON (Canada)', lat: 43.6532, lng: -79.3832, carrier: 'Rogers / Bell' },
  '1604': { region: 'Vancouver, BC (Canada)', lat: 49.2827, lng: -123.1207, carrier: 'Telus / Rogers' },
  '1786': { region: 'Miami, FL', lat: 25.7617, lng: -80.1918, carrier: 'AT&T / T-Mobile' },
  '1617': { region: 'Boston, MA', lat: 42.3601, lng: -71.0589, carrier: 'Verizon' },

  // UK Area / Mobile prefixes
  '447911': { region: 'London & Southeast, UK', lat: 51.5074, lng: -0.1278, carrier: 'Vodafone UK' },
  '447400': { region: 'United Kingdom (Mobile)', lat: 52.4862, lng: -1.8904, carrier: 'EE (Everything Everywhere)' },
  '447700': { region: 'United Kingdom (Mobile)', lat: 53.4808, lng: -2.2426, carrier: 'O2 UK (Virgin Media)' },
  '447800': { region: 'United Kingdom (Mobile)', lat: 51.5074, lng: -0.1278, carrier: 'Three UK' },
  '4420': { region: 'London (Greater London), UK', lat: 51.5074, lng: -0.1278, carrier: 'BT Fixed Line' },

  // Pakistan Mobile Networks (0300 Jazz, 0310/0312 Zong, 0321 Warid/Jazz, 0333 Ufone, 0345 Telenor)
  '92310': { region: 'Islamabad / Rawalpindi, Pakistan', lat: 33.6844, lng: 73.0479, carrier: 'Zong 4G (CMPak)' },
  '92300': { region: 'Punjab / Lahore, Pakistan', lat: 31.5204, lng: 74.3587, carrier: 'Jazz (Mobilink)' },
  '92301': { region: 'Islamabad / Rawalpindi, Pakistan', lat: 33.6844, lng: 73.0479, carrier: 'Jazz (Mobilink)' },
  '92312': { region: 'Karachi / Sindh, Pakistan', lat: 24.8607, lng: 67.0011, carrier: 'Zong 4G (CMPak)' },
  '92313': { region: 'Pakistan Nationwide', lat: 30.3753, lng: 69.3451, carrier: 'Zong 4G (CMPak)' },
  '92321': { region: 'Lahore, Pakistan', lat: 31.5204, lng: 74.3587, carrier: 'Jazz (formerly Warid)' },
  '92333': { region: 'Islamabad / KPK, Pakistan', lat: 34.0151, lng: 71.5249, carrier: 'Ufone (PTCL)' },
  '92345': { region: 'Peshawar / Northern, Pakistan', lat: 34.0151, lng: 71.5249, carrier: 'Telenor Pakistan' },
  '92346': { region: 'Punjab, Pakistan', lat: 31.5204, lng: 74.3587, carrier: 'Telenor Pakistan' },
  '9251': { region: 'Islamabad Capital Territory, Pakistan', lat: 33.6844, lng: 73.0479, carrier: 'PTCL Fixed Line' },
  '9242': { region: 'Lahore, Punjab, Pakistan', lat: 31.5204, lng: 74.3587, carrier: 'PTCL Fixed Line' },
  '9221': { region: 'Karachi, Sindh, Pakistan', lat: 24.8607, lng: 67.0011, carrier: 'PTCL Fixed Line' },

  // India Mobile Networks
  '9198': { region: 'Delhi NCR / Mumbai, India', lat: 28.6139, lng: 77.2090, carrier: 'Airtel' },
  '9197': { region: 'Maharashtra / Karnataka, India', lat: 12.9716, lng: 77.5946, carrier: 'Reliance Jio' },
  '9199': { region: 'India Nationwide', lat: 20.5937, lng: 78.9629, carrier: 'Vodafone Idea (Vi)' },
  '9180': { region: 'Bengaluru, Karnataka, India', lat: 12.9716, lng: 77.5946, carrier: 'BSNL / Airtel Landline' },

  // Germany
  '49151': { region: 'Frankfurt / Hesse, Germany', lat: 50.1109, lng: 8.6821, carrier: 'Deutsche Telekom' },
  '49172': { region: 'Munich / Bavaria, Germany', lat: 48.1351, lng: 11.5820, carrier: 'Vodafone Deutschland' },
  '49176': { region: 'Berlin, Germany', lat: 52.5200, lng: 13.4050, carrier: 'Telefónica O2' },

  // France
  '336': { region: 'Paris / Île-de-France, France', lat: 48.8566, lng: 2.3522, carrier: 'Orange / SFR / Free Mobile' },
  '337': { region: 'Lyon / Auvergne-Rhône-Alpes, France', lat: 45.7640, lng: 4.8357, carrier: 'Bouygues Telecom' },

  // UAE
  '97150': { region: 'Dubai, United Arab Emirates', lat: 25.2048, lng: 55.2708, carrier: 'e& (Etisalat)' },
  '97155': { region: 'Abu Dhabi, United Arab Emirates', lat: 24.4539, lng: 54.3773, carrier: 'du Telecom' },

  // Australia
  '614': { region: 'Sydney / NSW, Australia', lat: -33.8688, lng: 151.2093, carrier: 'Telstra / Optus' },
};

export const PRESET_NUMBERS: PresetNumber[] = [];
