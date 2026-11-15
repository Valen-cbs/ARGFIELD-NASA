export type AgencySource = 
  | 'NASA'
  | 'CONAE'
  | 'AEB'
  | 'AEP'
  | 'UKSA'
  | 'ESA'
  | 'CSA'
  | 'ASI'
  | 'AEE'
  | 'NOAA';

export type AlertType = 
  | 'soil_moisture_deficit'
  | 'rainfall_deficit'
  | 'temperature_anomaly'
  | 'upstream_water_level'
  | 'deforestation_runoff'
  | 'frost_risk'
  | 'atmospheric_river'
  | 'excess_precipitation'
  | 'groundwater_depletion'
  | 'vegetation_vigor_drop'
  | 'crop_disease_risk';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Timeframe = 'immediate' | 'this_week' | 'next_2_weeks' | 'monitor';

export type Trend = 'worsening' | 'improving' | 'stable' | 'unknown';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface HydrologicalBasin {
  id: string;
  name: string;
  majorRiver: string;
  upstreamRegions: string[];
  aquiferName?: string;
}

export type RegionKey = 'norte' | 'centro' | 'sur' | 'cuyo' | 'noa';

export interface FarmLocation extends LatLng {
  name: string;
  province: string;
  region: RegionKey;
  basinId: string;
  basinName: string;
  mainRiver: string;
  aquifer?: string;
}

export type MainCrop = 
  | 'soybean'
  | 'maize'
  | 'wheat'
  | 'sunflower'
  | 'sorghum'
  | 'pasture'
  | 'barley';

export type SoilType = 
  | 'mollisol_deep'
  | 'sandy_loam'
  | 'clay_vertisol'
  | 'aridisol_calcareous';

export type IrrigationType = 
  | 'dryland'
  | 'supplemental_pivot'
  | 'surface_canal';

export type FarmerPriority = 
  | 'conserve_moisture'
  | 'build_soil_organic'
  | 'drought_resilience'
  | 'erosion_control'
  | 'maximize_margin';

export interface FarmProfile {
  producerName?: string;
  location: FarmLocation;
  fieldSizeHectares: number;
  currentCrop: MainCrop;
  cropAllocations?: Array<{ crop: string; hectares: number }>;
  previousCrop?: string;
  irrigationAvailable?: boolean;
  soilType: SoilType;
  irrigation: IrrigationType;
  priority: FarmerPriority;
}

export interface RawSensorObservation {
  id: string;
  type: AlertType;
  source: AgencySource;
  mission: string;
  instrument: string;
  location: LatLng;
  locationName: string;
  distanceKm?: number;
  value: number;
  unit: string;
  baselineNormal: number;
  trend: Trend;
  criticalThreshold: number;
  warningThreshold: number;
  basinId?: string;
  isUpstream?: boolean;
  timestamp: string;
  resolution: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Alert {
  id: string;
  type: AlertType;
  source: AgencySource | 'Open-Meteo';
  mission: string;
  instrument: string;
  severity: Severity;
  score: number; // 0-100
  title: string;
  relevanceReason: string;
  factors: string[];
  actionable: boolean;
  timeframe: Timeframe;
  suggestedAction: string;
  scientificContext: string;
  localImpact: string;
  currentValue: number;
  unit: string;
  baseline: number | null;
  sourceUrl?: string;
  trend: Trend;
  distanceKm: number;
  observationLocation: LatLng;
  observationLocationName: string;
  detectedAt: string;
  dataQuality: 'high' | 'medium' | 'low';
  satellitePassInfo: string;
  hydrologicalRelation: 'upstream' | 'same_basin' | 'shared_aquifer' | 'direct_field' | 'regional_weather';
}

export interface CropRotationStep {
  season: string;
  crop: string;
  scientificName: string;
  purpose: 'cash_crop' | 'cover_crop' | 'nitrogen_fixer' | 'moisture_preserver' | 'deep_break';
  waterDemand: 'low' | 'moderate' | 'high';
  rootDepthMeters: number;
  soilHealthBenefit: string;
  adaptationRationale: string;
  expectedSoilMoistureConservation: string;
}

export interface CropRotationPlan {
  id: string;
  title: string;
  theme: string;
  resilienceScore: number; // 0 - 100
  primaryGoal: string;
  waterSavingsPct: number;
  soilCarbonPotential: string;
  summary: string;
  steps: CropRotationStep[];
  nasaDataTrigger: string;
}
