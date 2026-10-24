export interface PhoneLookupResult {
  rawInput: string;
  isValid: boolean;
  isPossible: boolean;
  phoneNumber?: string;
  e164?: string;
  international?: string;
  national?: string;
  rfc3966?: string;
  countryCode?: string;
  countryCallingCode?: string;
  countryName: string;
  regionOrCity: string;
  carrier: string;
  lineType: 'MOBILE' | 'FIXED_LINE' | 'TOLL_FREE' | 'VOIP' | 'PAGER' | 'PERSONAL_NUMBER' | 'UAN' | 'UNKNOWN';
  timezones: string[];
  localTime?: string;
  coordinates: {
    lat: number;
    lng: number;
    displayName: string;
    accuracyKm: number;
    isApproximate: boolean;
  };
  mccMnc?: string;
  confidence: number;
  subAllocation?: string;
  operatorMnc?: number;
  matchingSurveyCellsCount?: number;
  whyCentroidReason?: string;
}

export interface PresetNumber {
  id: string;
  label: string;
  number: string;
  country: string;
  flag: string;
  expectedCarrier: string;
  note: string;
}

export type MapTileLayer = 'standard' | 'satellite' | 'terrain' | 'dark';
