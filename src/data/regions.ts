import { FarmLocation, HydrologicalBasin, RegionKey } from '../types';

export const BASINS: Record<string, HydrologicalBasin> = {
  parana: {
    id: 'parana',
    name: 'Cuenca del Plata - Río Paraná',
    majorRiver: 'Río Paraná (Paraguay & Brasil upstream)',
    upstreamRegions: ['Paraguay (Alto Paraná)', 'Brasil (Mato Grosso / Pantanal)', 'Misiones', 'Corrientes'],
    aquiferName: 'Sistema Acuífero Guaraní'
  },
  salado_bonaerense: {
    id: 'salado_bonaerense',
    name: 'Cuenca Río Salado (Pampa Húmeda)',
    majorRiver: 'Río Salado del Sur / Lagunas Encadenadas',
    upstreamRegions: ['Noroeste de Buenos Aires', 'Sur de Santa Fe'],
    aquiferName: 'Acuífero Puelche / Pampeano'
  },
  rio_quinto: {
    id: 'rio_quinto',
    name: 'Cuenca Endorreica Río Quinto / Mar Chiquita',
    majorRiver: 'Río Quinto (Popopis) & Río Cuarto',
    upstreamRegions: ['Sierras de Córdoba', 'San Luis'],
    aquiferName: 'Acuífero Freático Pampeano Central'
  },
  uruguay: {
    id: 'uruguay',
    name: 'Cuenca del Río Uruguay',
    majorRiver: 'Río Uruguay',
    upstreamRegions: ['Sur de Brasil (Santa Catarina / RS)', 'Misiones', 'Corrientes'],
    aquiferName: 'Sistema Acuífero Guaraní'
  },
  chubut: {
    id: 'chubut',
    name: 'Cuenca del Río Chubut / Patagonia',
    majorRiver: 'Río Chubut',
    upstreamRegions: ['Cordillera de los Andes', 'Meseta Central Patagónica'],
    aquiferName: 'Acuíferos Aluviales del Valle Inferior'
  },
  bermejo: {
    id: 'bermejo',
    name: 'Cuenca Río Bermejo - Gran Chaco',
    majorRiver: 'Río Bermejo / Teuco',
    upstreamRegions: ['Cordillera Boliviana', 'Salta', 'Chaco'],
    aquiferName: 'Acuífero Cretácico Chaqueño'
  }
};

export const PRESET_FARMS: FarmLocation[] = [
  {
    name: 'Establecimiento La Campana - Bragado',
    province: 'Buenos Aires',
    region: 'centro',
    lat: -35.1189,
    lng: -60.4897,
    basinId: 'salado_bonaerense',
    basinName: 'Cuenca del Río Salado (Pampa Húmeda)',
    mainRiver: 'Río Salado',
    aquifer: 'Acuífero Puelche / Pampeano'
  },
  {
    name: 'Chacra Alto Paraná - Oberá',
    province: 'Misiones',
    region: 'norte',
    lat: -27.4871,
    lng: -55.1206,
    basinId: 'parana',
    basinName: 'Cuenca del Plata - Alto Paraná',
    mainRiver: 'Río Paraná',
    aquifer: 'Sistema Acuífero Guaraní'
  },
  {
    name: 'Agropecuaria El Quebracho - Presidencia Roque Sáenz Peña',
    province: 'Chaco',
    region: 'norte',
    lat: -26.7852,
    lng: -60.4388,
    basinId: 'bermejo',
    basinName: 'Cuenca Río Bermejo - Gran Chaco',
    mainRiver: 'Río Bermejo / Teuco',
    aquifer: 'Acuífero Chaqueño'
  },
  {
    name: 'Campo San Esteban - Río Cuarto',
    province: 'Córdoba',
    region: 'centro',
    lat: -33.1232,
    lng: -64.3492,
    basinId: 'rio_quinto',
    basinName: 'Cuenca Río Quinto / Pampa Seca',
    mainRiver: 'Río Chocancharava',
    aquifer: 'Acuífero Pampeano'
  },
  {
    name: 'Estancia La Rinconada - Gualeguaychú',
    province: 'Entre Ríos',
    region: 'centro',
    lat: -33.0102,
    lng: -58.5172,
    basinId: 'uruguay',
    basinName: 'Cuenca del Río Uruguay',
    mainRiver: 'Río Gualeguaychú / Uruguay',
    aquifer: 'Acuífero Guaraní Inferior'
  },
  {
    name: 'Valle Hermoso - Trelew / VIRCH',
    province: 'Chubut',
    region: 'sur',
    lat: -43.2494,
    lng: -65.3051,
    basinId: 'chubut',
    basinName: 'Cuenca del Río Chubut / Patagonia',
    mainRiver: 'Río Chubut',
    aquifer: 'Acuífero Aluvial Patagónico'
  }
];

export const REGION_DETAILS: Record<RegionKey, {
  name: string;
  tagline: string;
  climate: string;
  keyRisks: string[];
  keySatellites: string[];
  soilCharacteristics: string;
}> = {
  norte: {
    name: 'Región Norte (Misiones, Chaco, Formosa, Corrientes)',
    tagline: 'Sensible al Río Paraná, deforestación en Brasil/Paraguay y variabilidad subtropical',
    climate: 'Subtropical húmedo a semiárido chaqueño con balance hídrico variable',
    keyRisks: ['Bajante hidrométrica del Paraná', 'Deforestación 50km cuenca arriba', 'Olas de calor extremas'],
    keySatellites: ['CONAE SAOCOM 1B', 'NASA SMAP', 'AEB CBERS-4A', 'AEP Telemetry'],
    soilCharacteristics: 'Ultisoles rojos ferralíticos en Misiones y Mollisoles/Vertisoles arcillosos en el Chaco'
  },
  centro: {
    name: 'Región Central (Buenos Aires, Córdoba, Santa Fe, Entre Ríos)',
    tagline: 'Cinturón granario mayor (soja, maíz, trigo) con dependencia de napas freáticas y ENSO',
    climate: 'Templado pampeano con ciclos alternantes Niño/Niña y variabilidad pluviométrica estival',
    keyRisks: ['Déficit de humedad en profundidad', 'Caída de napa freática en Córdoba', 'Encharcamientos súbitos'],
    keySatellites: ['CONAE SAOCOM (SAR L-Band)', 'NASA GPM IMERG', 'NASA ECOSTRESS', 'ESA Sentinel-2'],
    soilCharacteristics: 'Mollisoles profundos ricos en materia orgánica pero susceptibles a pérdida de estructura'
  },
  sur: {
    name: 'Región Sur (Patagonia, Chubut, Río Negro, Santa Cruz)',
    tagline: 'Vientos antárticos, ríos atmosféricos oceánicos y riesgo severo de heladas tardías',
    climate: 'Semiárido frío con fuertes vientos del oeste y precipitaciones invernales en cordillera',
    keyRisks: ['Heladas tardías primaverales', 'Ríos atmosféricos y vientos de 90 km/h', 'Desecación eólica superficial'],
    keySatellites: ['UKSA Atmospheric Models', 'CSA RADARSAT', 'NASA MODIS Temp', 'CONAE SAOCOM'],
    soilCharacteristics: 'Aridisoles y Entisoles esqueléticos de baja retención hídrica y alta vulnerabilidad eólica'
  },
  cuyo: {
    name: 'Región Cuyo (Mendoza, San Juan, San Luis)',
    tagline: 'Agricultura bajo riego dependiente de nevadas andinas y deshielos',
    climate: 'Árido de piedemonte con alta radiación solar',
    keyRisks: ['Disminución del caudal de deshielo andino', 'Granizo estival', 'Salinización de suelos'],
    keySatellites: ['NASA MODIS Snow Cover', 'CONAE SAOCOM', 'ESA Sentinel-2'],
    soilCharacteristics: 'Suelos aluviales estratificados con sectores calcáreos y salinos'
  },
  noa: {
    name: 'Región NOA (Salta, Jujuy, Tucumán, Santiago del Estero)',
    tagline: 'Valles templados y transición a pedemonte yungueño con régimen monzónico',
    climate: 'Subtropical con estación seca prolongada (invierno-primavera)',
    keyRisks: ['Retraso en el inicio de lluvias de verano', 'Erosión hídrica en pendientes', 'Estrés térmico'],
    keySatellites: ['NASA GPM', 'CONAE SAOCOM', 'ESA Sentinel-1'],
    soilCharacteristics: 'Suelos francos y aluviales en valles, susceptibles a encostramiento'
  }
};
