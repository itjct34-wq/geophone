export interface RawCellDumpItem {
  network: {
    mcc: number;
    mnc: number;
  };
  technology: string;
  cid: number;
  area: number; // LAC / TAC
  code?: number; // Signal or timing advance code
  frequency?: number; // ARFCN or EARFCN
  latitude?: number;
  longitude?: number;
  location?: string;
}

export interface ResolvedUserCell {
  id: string;
  cid: number;
  lac: number;
  mcc: number;
  mnc: number;
  operatorName: string;
  operatorShort: 'Zong' | 'Jazz' | 'Telenor' | 'Ufone' | 'Warid';
  technology: string;
  band: string;
  code: number;
  frequency: number;
  region: string;
  city: string;
  lat: number;
  lng: number;
  isApproximate: boolean;
}

// User-provided raw cells dump string
export const RAW_USER_CELLS_STRING = `[{"network":{"mcc":410,"mnc":6},"technology":"GSM","cid":3862,"area":473,"code":57,"frequency":78,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":7823,"area":7347,"code":44,"frequency":1018,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":7826,"area":7347,"code":41,"frequency":728,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":11276,"area":10460,"code":39,"frequency":8,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":11303,"area":7371,"code":40,"frequency":1021,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":11441,"area":10460,"code":60,"frequency":8,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":12169,"area":25042,"code":35,"frequency":76,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":12192,"area":52259,"code":47,"frequency":54,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":12458,"area":52250,"code":26,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":12458,"area":25042,"code":26,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":12874,"area":52250,"code":38,"frequency":49,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":13274,"area":10460,"code":47,"frequency":120,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":13867,"area":10460,"code":33,"frequency":122,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":13917,"area":10246,"code":50,"frequency":9,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":14104,"area":10246,"code":22,"frequency":9,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":14231,"area":10460,"code":45,"frequency":7,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":14294,"area":10460,"code":63,"frequency":2,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":14360,"area":52250,"code":4,"frequency":60,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":14366,"area":52250,"code":19,"frequency":62,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":14763,"area":10477,"code":32,"frequency":1,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":14939,"area":10460,"code":6,"frequency":6,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":15382,"area":52250,"code":45,"frequency":49,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":15390,"area":25034,"code":14,"frequency":73,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":15500,"area":25040,"code":32,"frequency":80,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":15509,"area":25042,"code":32,"frequency":81,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":15630,"area":52291,"code":29,"frequency":51,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":15716,"area":52208,"code":54,"frequency":49,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":15822,"area":25035,"code":48,"frequency":79,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":15890,"area":52204,"code":50,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":15890,"area":25040,"code":50,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":16649,"area":52250,"code":62,"frequency":50,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":17131,"area":25042,"code":29,"frequency":86,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":18251,"area":7347,"code":31,"frequency":1019,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":18254,"area":7347,"code":7,"frequency":653,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":19804,"area":5227,"code":39,"frequency":726,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":19806,"area":5227,"code":50,"frequency":724,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":21363,"area":7344,"code":62,"frequency":1015,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":21711,"area":7347,"code":35,"frequency":1022,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":22026,"area":10477,"code":30,"frequency":10,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":22137,"area":52204,"code":10,"frequency":58,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":22459,"area":52250,"code":39,"frequency":61,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":22895,"area":7347,"code":43,"frequency":728,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":23323,"area":7347,"code":41,"frequency":1018,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":23399,"area":52259,"code":18,"frequency":60,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":23715,"area":10477,"code":34,"frequency":9,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":23821,"area":10460,"code":34,"frequency":6,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":24104,"area":10246,"code":38,"frequency":12,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":24231,"area":10460,"code":53,"frequency":1,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":24366,"area":52250,"code":19,"frequency":26,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":24763,"area":10477,"code":33,"frequency":6,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":24835,"area":52259,"code":14,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":25019,"area":10460,"code":46,"frequency":11,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":25165,"area":52259,"code":40,"frequency":59,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":25382,"area":52250,"code":45,"frequency":60,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":25402,"area":25042,"code":0,"frequency":74,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":25446,"area":25042,"code":39,"frequency":81,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":25453,"area":10477,"code":52,"frequency":7,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":25700,"area":52259,"code":11,"frequency":54,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":26649,"area":52250,"code":62,"frequency":52,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":30694,"area":10477,"code":61,"frequency":11,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":32026,"area":10477,"code":32,"frequency":6,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":32028,"area":10477,"code":57,"frequency":124,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":32387,"area":52259,"code":60,"frequency":58,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":32459,"area":52250,"code":39,"frequency":55,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":32463,"area":52250,"code":7,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":32873,"area":52250,"code":41,"frequency":53,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":32888,"area":52250,"code":28,"frequency":25,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":32889,"area":52251,"code":3,"frequency":49,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":33274,"area":10460,"code":28,"frequency":118,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":33384,"area":52250,"code":19,"frequency":57,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":33570,"area":10240,"code":39,"frequency":10,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":33715,"area":10477,"code":19,"frequency":123,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":33721,"area":7342,"code":5,"frequency":1018,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":33815,"area":10460,"code":19,"frequency":124,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":33823,"area":10460,"code":17,"frequency":5,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34141,"area":52259,"code":0,"frequency":0,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34215,"area":52250,"code":8,"frequency":51,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":34275,"area":7341,"code":34,"frequency":652,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34360,"area":52250,"code":4,"frequency":58,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":34377,"area":25040,"code":47,"frequency":77,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":1},"technology":"GSM","cid":34642,"area":10240,"code":43,"frequency":2,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":34721,"area":5227,"code":0,"frequency":0,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34777,"area":52259,"code":35,"frequency":59,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34883,"area":52259,"code":25,"frequency":59,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34949,"area":52259,"code":18,"frequency":52,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":34952,"area":52259,"code":10,"frequency":51,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":35474,"area":25039,"code":22,"frequency":81,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":11},"technology":"GSM","cid":35530,"area":25040,"code":22,"frequency":69,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":35848,"area":52259,"code":24,"frequency":60,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":36252,"area":1070,"code":5,"frequency":1015,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":36737,"area":52250,"code":13,"frequency":61,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":36740,"area":52259,"code":25,"frequency":58,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":37861,"area":5227,"code":15,"frequency":1015,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":37881,"area":5227,"code":38,"frequency":1021,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":38033,"area":7344,"code":23,"frequency":1018,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":38151,"area":7344,"code":49,"frequency":1017,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":38688,"area":52204,"code":20,"frequency":49,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":38692,"area":52259,"code":37,"frequency":57,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":40662,"area":7345,"code":44,"frequency":1017,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":42331,"area":7347,"code":23,"frequency":1021,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":44323,"area":7347,"code":27,"frequency":1021,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":3},"technology":"GSM","cid":45582,"area":52258,"code":51,"frequency":49,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":45862,"area":7344,"code":12,"frequency":1022,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":46871,"area":5227,"code":11,"frequency":1020,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":50696,"area":7348,"code":14,"frequency":652,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":54022,"area":7347,"code":31,"frequency":1014,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":54023,"area":7347,"code":29,"frequency":988,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":55351,"area":7344,"code":12,"frequency":1020,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":55352,"area":7344,"code":51,"frequency":1016,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":55353,"area":7344,"code":57,"frequency":1014,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":56522,"area":7711,"code":25,"frequency":1020,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"GSM","cid":58362,"area":7347,"code":33,"frequency":1019,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":777986,"area":60022,"code":172,"frequency":1555,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802818,"area":60023,"code":294,"frequency":1555,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802821,"area":60023,"code":295,"frequency":1555,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802877,"area":60023,"code":292,"frequency":1555,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802918,"area":60023,"code":291,"frequency":50,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802921,"area":60023,"code":292,"frequency":50,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802977,"area":60023,"code":289,"frequency":50,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"},{"network":{"mcc":410,"mnc":4},"technology":"LTE","cid":802987,"area":60023,"code":290,"frequency":50,"latitude":2.147483647E9,"longitude":2.147483647E9,"location":"-"}]`;

// Map Pakistani MNC to Operator names
export function getOperatorFromMnc(mnc: number): { name: string; short: ResolvedUserCell['operatorShort'] } {
  switch (mnc) {
    case 4:
      return { name: 'Zong 4G (CMPak)', short: 'Zong' };
    case 1:
      return { name: 'Jazz (Mobilink PMCL)', short: 'Jazz' };
    case 6:
      return { name: 'Telenor Pakistan', short: 'Telenor' };
    case 3:
      return { name: 'Ufone (PTML)', short: 'Ufone' };
    case 11:
      return { name: 'Warid Telecom (Jazz/Warid)', short: 'Warid' };
    default:
      return { name: `MNC ${mnc} Cellular Network`, short: 'Zong' };
  }
}

// Map Pakistani LAC / TAC area codes to known geographical telecom cluster coordinates
export function getClusterForArea(area: number, cid: number): { city: string; region: string; lat: number; lng: number } {
  // Area codes 10460, 10477, 10246, 10240 -> Islamabad & Rawalpindi Capital
  if ([10460, 10477, 10246, 10240].includes(area)) {
    const latOffset = ((cid % 25) - 12) * 0.0035;
    const lngOffset = ((cid % 17) - 8) * 0.0038;
    return {
      city: 'Islamabad / Rawalpindi',
      region: 'Federal Capital Area, Pakistan',
      lat: 33.6844 + latOffset,
      lng: 73.0479 + lngOffset,
    };
  }

  // Area codes 7347, 7371, 7344, 7345, 7348, 7342, 7341, 7711 -> Rawalpindi & Northern Punjab
  if ([7347, 7371, 7344, 7345, 7348, 7342, 7341, 7711, 473, 1070].includes(area)) {
    const latOffset = ((cid % 23) - 11) * 0.0032;
    const lngOffset = ((cid % 19) - 9) * 0.0036;
    return {
      city: 'Rawalpindi / North Punjab',
      region: 'Rawalpindi District & Cantonment, Pakistan',
      lat: 33.5973 + latOffset,
      lng: 73.0479 + lngOffset,
    };
  }

  // Area codes 52250, 52259, 52204, 52208, 52291, 52251, 52258, 5227 -> Peshawar / KPK Region
  if ([52250, 52259, 52204, 52208, 52291, 52251, 52258, 5227].includes(area)) {
    const latOffset = ((cid % 21) - 10) * 0.0034;
    const lngOffset = ((cid % 15) - 7) * 0.0037;
    return {
      city: 'Peshawar / KPK',
      region: 'Khyber Pakhtunkhwa Telecom Circle, Pakistan',
      lat: 34.0151 + latOffset,
      lng: 71.5249 + lngOffset,
    };
  }

  // Area codes 25042, 25034, 25040, 25035, 25039 -> Warid / Jazz Central Punjab
  if ([25042, 25034, 25040, 25035, 25039].includes(area)) {
    const latOffset = ((cid % 20) - 10) * 0.0031;
    const lngOffset = ((cid % 16) - 8) * 0.0033;
    return {
      city: 'Punjab Central / Lahore',
      region: 'Central Punjab Cellular Cluster, Pakistan',
      lat: 31.5204 + latOffset,
      lng: 74.3587 + lngOffset,
    };
  }

  // Area codes 60022, 60023 -> 4G LTE High-speed TAC
  if ([60022, 60023].includes(area)) {
    const latOffset = ((cid % 15) - 7) * 0.0028;
    const lngOffset = ((cid % 13) - 6) * 0.0031;
    return {
      city: 'Islamabad / Rawalpindi 4G LTE',
      region: 'Zong 4G High-Capacity Macro Cell eNodeB',
      lat: 33.6931 + latOffset,
      lng: 73.0533 + lngOffset,
    };
  }

  // Fallback
  return {
    city: 'Pakistan Nationwide',
    region: `LAC Area ${area}`,
    lat: 33.6844,
    lng: 73.0479,
  };
}

export function parseRawCellsJson(jsonText: string): ResolvedUserCell[] {
  try {
    let clean = jsonText.trim();
    // Repair trailing JSON if truncated
    if (!clean.endsWith(']')) {
      if (!clean.endsWith('}')) {
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace !== -1) {
          clean = clean.slice(0, lastBrace + 1);
        }
      }
      clean = clean + ']';
    }

    const rawList: RawCellDumpItem[] = JSON.parse(clean);

    return rawList.map((item, idx) => {
      const mcc = item.network?.mcc || 410;
      const mnc = item.network?.mnc || 4;
      const { name, short } = getOperatorFromMnc(mnc);
      const cluster = getClusterForArea(item.area, item.cid);

      // Determine frequency band from ARFCN / EARFCN
      let band = 'GSM 900';
      if (item.technology === 'LTE') {
        band = item.frequency === 1555 ? 'LTE Band 3 (1800 MHz)' : 'LTE Band 1 (2100 MHz)';
      } else if (item.frequency && item.frequency > 512) {
        band = 'DCS 1800 MHz';
      }

      return {
        id: `user-cell-${idx + 1}-${item.cid}`,
        cid: item.cid,
        lac: item.area,
        mcc,
        mnc,
        operatorName: name,
        operatorShort: short,
        technology: item.technology || 'GSM',
        band,
        code: item.code ?? 0,
        frequency: item.frequency ?? 0,
        city: cluster.city,
        region: cluster.region,
        lat: cluster.lat,
        lng: cluster.lng,
        isApproximate: true,
      };
    });
  } catch (err) {
    console.error('Failed to parse cells JSON:', err);
    return [];
  }
}
