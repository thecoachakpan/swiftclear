export interface TariffLookup {
  hsCode: string;
  item: string;
  category: string;
  baseDutyRate: number; // MFN (Most Favoured Nation) percentage
  afcftaDutyRate: number; // Preferential AfCFTA rate
  vat: number; // Local VAT percentage
  requiredDocuments: string[];
  unit: string;
  averageWeightPerPackageKg: number;
}

export interface TradeCorridor {
  id: string;
  origin: string;
  destination: string;
  region: 'ECOWAS' | 'EAC' | 'SADC' | 'Inter-Region';
  distanceKm: number;
  avgTransitDays: number;
  borderPort: string;
  handlingFeeUsd: number; // Flat port handling charges
  securityFeeUsd: number; // Border security/scanning
  escortFeeUsd?: number; // Transit security escort if any
}

export const TARIFF_DATABASE: Record<string, TariffLookup> = {
  hibiscus: {
    hsCode: '1211.90.00',
    item: 'Dried Hibiscus Flowers (Zobo)',
    category: 'Agricultural Produce',
    baseDutyRate: 20,
    afcftaDutyRate: 0,
    vat: 7.5,
    unit: 'bag (25kg)',
    averageWeightPerPackageKg: 25,
    requiredDocuments: [
      'Phytosanitary Certificate (NPPO)',
      'AfCFTA Certificate of Origin',
      'Export Bill of Lading',
      'Customs Declaration Form (SAD)',
      'ECOWAS Trade Liberalization Scheme (ETLS) Certificate'
    ]
  },
  shea_butter: {
    hsCode: '1515.90.80',
    item: 'Unrefined Shea Butter',
    category: 'Fats & Oils',
    baseDutyRate: 15,
    afcftaDutyRate: 0,
    vat: 18.0,
    unit: 'tub (50kg)',
    averageWeightPerPackageKg: 50,
    requiredDocuments: [
      'NAFDAC / Food Quality Certificate',
      'AfCFTA Certificate of Origin',
      'Commercial Invoice',
      'Packing List',
      'Certificate of Analysis'
    ]
  },
  cashew: {
    hsCode: '0801.31.00',
    item: 'Raw Cashew Nuts (In Shell)',
    category: 'Nuts & Seeds',
    baseDutyRate: 10,
    afcftaDutyRate: 0,
    vat: 16.0,
    unit: 'bag (80kg)',
    averageWeightPerPackageKg: 80,
    requiredDocuments: [
      'Export Clearance Permit',
      'Phytosanitary Certificate',
      'Packing List',
      'Certificate of Weight and Quality'
    ]
  },
  cocoa: {
    hsCode: '1801.00.00',
    item: 'Whole Cocoa Beans',
    category: 'Agricultural Produce',
    baseDutyRate: 30,
    afcftaDutyRate: 5,
    vat: 7.5,
    unit: 'bag (64kg)',
    averageWeightPerPackageKg: 64,
    requiredDocuments: [
      'Cocoa Board Export Quality Certificate',
      'AfCFTA Certificate of Origin',
      'Phytosanitary Inspection Certificate',
      'Fumigation Certificate',
      'Commercial Invoice'
    ]
  },
  coffee: {
    hsCode: '0901.11.00',
    item: 'Green Coffee Beans (Arabica)',
    category: 'Agricultural Produce',
    baseDutyRate: 25,
    afcftaDutyRate: 0,
    vat: 18.0,
    unit: 'bag (60kg)',
    averageWeightPerPackageKg: 60,
    requiredDocuments: [
      'ICO Certificate of Origin',
      'Phytosanitary Certificate',
      'Export Licence',
      'Phytosanitary Release Permit'
    ]
  }
};

export const TRADE_CORRIDORS: TradeCorridor[] = [
  {
    id: 'kano_cotonou',
    origin: 'Nigeria (Kano)',
    destination: 'Benin (Cotonou)',
    region: 'ECOWAS',
    distanceKm: 980,
    avgTransitDays: 3,
    borderPort: 'Seme-Krake Joint Border Post',
    handlingFeeUsd: 150,
    securityFeeUsd: 45
  },
  {
    id: 'accra_abidjan',
    origin: 'Ghana (Accra)',
    destination: 'Côte d\'Ivoire (Abidjan)',
    region: 'ECOWAS',
    distanceKm: 520,
    avgTransitDays: 2,
    borderPort: 'Elubo-Noé Border Post',
    handlingFeeUsd: 120,
    securityFeeUsd: 30
  },
  {
    id: 'kigali_mombasa',
    origin: 'Rwanda (Kigali)',
    destination: 'Kenya (Mombasa Port)',
    region: 'EAC',
    distanceKm: 1150,
    avgTransitDays: 5,
    borderPort: 'Gatuna-Katuna Border / Malaba',
    handlingFeeUsd: 250,
    securityFeeUsd: 75,
    escortFeeUsd: 100
  },
  {
    id: 'kampala_daressalaam',
    origin: 'Uganda (Kampala)',
    destination: 'Tanzania (Dar es Salaam)',
    region: 'EAC',
    distanceKm: 1650,
    avgTransitDays: 7,
    borderPort: 'Mutukula Joint Border Post',
    handlingFeeUsd: 220,
    securityFeeUsd: 60
  },
  {
    id: 'johannesburg_harare',
    origin: 'South Africa (Johannesburg)',
    destination: 'Zimbabwe (Harare)',
    region: 'SADC',
    distanceKm: 1100,
    avgTransitDays: 4,
    borderPort: 'Beitbridge Border Post',
    handlingFeeUsd: 300,
    securityFeeUsd: 90,
    escortFeeUsd: 50
  }
];

export interface CrossBorderDutyCalculation {
  hsCode: string;
  commodity: string;
  origin: string;
  destination: string;
  declaredValueUsd: number;
  weightKg: number;
  useAfCFTA: boolean;
  baseDutyRate: number;
  appliedDutyRate: number;
  baseDutyAmountUsd: number;
  appliedDutyAmountUsd: number;
  vatRate: number;
  vatAmountUsd: number;
  handlingFeeUsd: number;
  securityFeeUsd: number;
  escortFeeUsd: number;
  totalClearancePayableUsd: number;
  afcftaSavingsUsd: number;
  requiredDocuments: string[];
  region: string;
}

export function computeCrossBorderDuties(
  commodityKey: string,
  declaredValueUsd: number,
  quantity: number, // units/packages
  corridorId: string,
  useAfCFTA: boolean = true
): CrossBorderDutyCalculation {
  const item = TARIFF_DATABASE[commodityKey.toLowerCase()] || TARIFF_DATABASE['hibiscus'];
  const corridor = TRADE_CORRIDORS.find(c => c.id === corridorId) || TRADE_CORRIDORS[0];

  const dutyRate = useAfCFTA ? item.afcftaDutyRate : item.baseDutyRate;
  const baseDutyAmountUsd = (item.baseDutyRate / 100) * declaredValueUsd;
  const appliedDutyAmountUsd = (dutyRate / 100) * declaredValueUsd;
  const vatAmountUsd = (item.vat / 100) * (declaredValueUsd + appliedDutyAmountUsd); // Standard custom VAT valuation often includes duty
  const handlingFeeUsd = corridor.handlingFeeUsd;
  const securityFeeUsd = corridor.securityFeeUsd;
  const escortFeeUsd = corridor.escortFeeUsd || 0;

  const totalClearancePayableUsd = appliedDutyAmountUsd + vatAmountUsd + handlingFeeUsd + securityFeeUsd + escortFeeUsd;
  const afcftaSavingsUsd = baseDutyAmountUsd - appliedDutyAmountUsd;
  const weightKg = quantity * item.averageWeightPerPackageKg;

  return {
    hsCode: item.hsCode,
    commodity: item.item,
    origin: corridor.origin,
    destination: corridor.destination,
    declaredValueUsd,
    weightKg,
    useAfCFTA,
    baseDutyRate: item.baseDutyRate,
    appliedDutyRate: dutyRate,
    baseDutyAmountUsd,
    appliedDutyAmountUsd,
    vatRate: item.vat,
    vatAmountUsd,
    handlingFeeUsd,
    securityFeeUsd,
    escortFeeUsd,
    totalClearancePayableUsd,
    afcftaSavingsUsd,
    requiredDocuments: item.requiredDocuments,
    region: corridor.region
  };
}
