import { MainCrop, SoilType, IrrigationType, FarmerPriority } from '../types';

export interface CropInfo {
  id: MainCrop;
  name: string;
  nameEs: string;
  type: string;
  cycleDays: number;
  waterNeedMm: number;
  rootDepthM: number;
  droughtResistance: 'low' | 'medium' | 'high';
  soilBenefit: string;
  vulnerabilityFactor: string;
}

export const CROPS_DATABASE: Record<MainCrop, CropInfo> = {
  soybean: {
    id: 'soybean',
    name: 'Soybean',
    nameEs: 'Soja de primera',
    type: 'Oleaginosa de verano',
    cycleDays: 135,
    waterNeedMm: 550,
    rootDepthM: 1.2,
    droughtResistance: 'medium',
    soilBenefit: 'Fijación biológica moderada de nitrógeno si se inocula adecuadamente.',
    vulnerabilityFactor: 'Sensible al déficit hídrico en R3-R5 (llenado de grano); deja escaso rastrojo protector.'
  },
  maize: {
    id: 'maize',
    name: 'Maize (Corn)',
    nameEs: 'Maíz tardío / temprano',
    type: 'Cereal de verano C4',
    cycleDays: 140,
    waterNeedMm: 620,
    rootDepthM: 1.8,
    droughtResistance: 'medium',
    soilBenefit: 'Elevado aporte de carbono al suelo y abundante rastrojo con alta relación C/N para frenar evaporación.',
    vulnerabilityFactor: 'Pérdidas drásticas si falta agua o hay calor extremo 15 días antes y después de floración (VT/R1).'
  },
  wheat: {
    id: 'wheat',
    name: 'Winter Wheat',
    nameEs: 'Trigo pan de invierno',
    type: 'Cereal fino de invierno C3',
    cycleDays: 160,
    waterNeedMm: 380,
    rootDepthM: 1.4,
    droughtResistance: 'medium',
    soilBenefit: 'Cobertura del suelo durante el invierno y primavera temprana, raíces densas en los primeros 30cm.',
    vulnerabilityFactor: 'Golpes de calor tardíos en floración/llenado y heladas en espigazón.'
  },
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    nameEs: 'Girasol',
    type: 'Oleaginosa rústica',
    cycleDays: 120,
    waterNeedMm: 450,
    rootDepthM: 2.2,
    droughtResistance: 'high',
    soilBenefit: 'Raíz pivotante profunda que explora estratos freáticos y descompacta naturalmente capas densas.',
    vulnerabilityFactor: 'Poca tolerancia al encharcamiento prolongado y rastrojo de rápida degradación.'
  },
  sorghum: {
    id: 'sorghum',
    name: 'Grain Sorghum',
    nameEs: 'Sorgo granífero / forrajero',
    type: 'Cereal rústico C4',
    cycleDays: 125,
    waterNeedMm: 400,
    rootDepthM: 2.0,
    droughtResistance: 'high',
    soilBenefit: 'Excelente aporte de biomasa radicular, mejora la agregación del suelo y tolera suelos marginales.',
    vulnerabilityFactor: 'Sensible al frío en la implantación y ataque de pulgón amarillo si hay estrés térmico.'
  },
  pasture: {
    id: 'pasture',
    name: 'Perennial Pasture (Alfalfa / Festuca)',
    nameEs: 'Pastura perenne (Alfalfa + Gramíneas)',
    type: 'Perenne polifítica',
    cycleDays: 365,
    waterNeedMm: 750,
    rootDepthM: 3.5,
    droughtResistance: 'high',
    soilBenefit: 'Máxima regeneración de estructura edáfica, recarga de materia orgánica y descompactación profunda.',
    vulnerabilityFactor: 'Requiere amortización plurianual y manejo cuidadoso de pastoreo.'
  },
  barley: {
    id: 'barley',
    name: 'Malting Barley',
    nameEs: 'Cebada cervecera',
    type: 'Cereal invernal de ciclo corto',
    cycleDays: 135,
    waterNeedMm: 340,
    rootDepthM: 1.1,
    droughtResistance: 'medium',
    soilBenefit: 'Cosecha anticipada que libera el lote para siembras tempranas de segunda y conserva humedad.',
    vulnerabilityFactor: 'Sensible a excesos hídricos en maduración y enfermedades foliares bajo alta humedad.'
  }
};

export const SOIL_DATABASE: Record<SoilType, {
  name: string;
  nameEs: string;
  waterRetention: string;
  organicMatterPct: string;
  erosionRisk: string;
  advisoryTip: string;
}> = {
  mollisol_deep: {
    name: 'Deep Mollisol (Humid Pampa Loam)',
    nameEs: 'Molisol profundo (Franco limoso pampeano)',
    waterRetention: 'Alta (180-220 mm útiles en 1m)',
    organicMatterPct: '2.8% - 3.8%',
    erosionRisk: 'Moderado (hídrica en pendientes, planchado superficial)',
    advisoryTip: 'Priorizar rastrojo continuo y cultivos de servicios para evitar compactación por tránsito de maquinaria.'
  },
  sandy_loam: {
    name: 'Sandy Loam (Central/Western Pampa)',
    nameEs: 'Franco arenoso (Pampa seca / Córdoba oeste)',
    waterRetention: 'Baja a moderada (90-130 mm útiles en 1m)',
    organicMatterPct: '1.2% - 1.8%',
    erosionRisk: 'Muy alto (erosión eólica severa si queda descubierto)',
    advisoryTip: 'Prohibido barbecho químico limpio prolongado; sembrar centeno o vicia como cultivo de cobertura protector.'
  },
  clay_vertisol: {
    name: 'Clay Vertisol (Entre Ríos / Chaco)',
    nameEs: 'Vertisol arcilloso (Grietas de contracción)',
    waterRetention: 'Muy alta pero lenta infiltración inicial',
    organicMatterPct: '2.2% - 3.1%',
    erosionRisk: 'Alto por escurrimiento superficial en lluvias torrenciales',
    advisoryTip: 'Favorecer raíces fibrosas de gramíneas para mejorar la macroporosidad y evitar el anegamiento superficial.'
  },
  aridisol_calcareous: {
    name: 'Aridisol / Calcareous (Patagonia / Cuyo)',
    nameEs: 'Aridisol esquelético / aluvial',
    waterRetention: 'Muy baja (50-80 mm útiles)',
    organicMatterPct: '0.6% - 1.2%',
    erosionRisk: 'Extremo por vientos dominantes',
    advisoryTip: 'Indispensable cortinas forestales, rastrojo en pie y acolchados orgánicos para mitigar evaporación crítica.'
  }
};

export const PRIORITY_DATABASE: Record<FarmerPriority, {
  label: string;
  labelEs: string;
  description: string;
  targetMetric: string;
}> = {
  conserve_moisture: {
    label: 'Conserve Soil Moisture',
    labelEs: 'Conservación crítica de humedad edáfica',
    description: 'Priorizar cultivos de baja evapotranspiración y cobertura viva para acumular milímetros.',
    targetMetric: '+35mm de agua útil acumulada al momento de siembra'
  },
  build_soil_organic: {
    label: 'Build Soil Organic Matter',
    labelEs: 'Regeneración y aumento de Materia Orgánica',
    description: 'Secuencia intensiva rica en gramíneas de alta biomasa y leguminosas fijadoras de N.',
    targetMetric: '+0.2% de Materia Orgánica en horizonte A en 3 años'
  },
  drought_resilience: {
    label: 'Drought & Climate Shock Resilience',
    labelEs: 'Resiliencia ante sequía y shocks climáticos',
    description: 'Alternar sistemas radiculares profundos (girasol/sorgo) y ciclos escalonados para diluir riesgo.',
    targetMetric: 'Reducción del 60% en la variabilidad interanual de rindes'
  },
  erosion_control: {
    label: 'Wind & Water Erosion Control',
    labelEs: 'Control de erosión eólica e hídrica',
    description: 'Mantener cobertura vegetal verde o rastrojo no-till los 365 días del año.',
    targetMetric: 'Cero días de suelo desnudo expuesto a viento o impacto de gota'
  },
  maximize_margin: {
    label: 'Yield Stability with Balanced Margin',
    labelEs: 'Estabilidad de margen económico y bajo riesgo financiero',
    description: 'Evitar sobreinversión en fertilizantes bajo pronósticos adversos de La Niña.',
    targetMetric: 'Optimización del retorno sobre insumos hídricos y nitrogenados'
  }
};
