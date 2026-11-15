import {
  Alert,
  FarmProfile,
  RawSensorObservation,
  Severity,
  Timeframe
} from '../types';
import { haversineDistance, analyzeHydrologicalRelation } from './geo';

/**
 * Calculates severity category based on final 0-100 relevance score.
 */
export function calculateSeverity(score: number): Severity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Estimates urgency timeframe based on score and alert type.
 */
export function calculateTimeframe(score: number, type: string): Timeframe {
  if (score >= 75) {
    if (type === 'soil_moisture_deficit' || type === 'frost_risk') return 'immediate';
    return 'this_week';
  }
  if (score >= 50) return 'next_2_weeks';
  return 'monitor';
}

/**
 * Core 5-Factor Relevance Scoring Engine as defined in Section 9 of design.md
 */
export function scoreObservation(
  obs: RawSensorObservation,
  farm: FarmProfile
): Alert {
  const farmLoc = farm.location;
  const distanceKm = obs.distanceKm ?? haversineDistance(obs.location, farmLoc);
  const hydroRelation = analyzeHydrologicalRelation(
    obs.location,
    farmLoc,
    farmLoc.basinId,
    obs.isUpstream
  );

  let score = 0;
  const factors: string[] = [];

  // ============ FACTOR 1: SPATIAL PROXIMITY ============
  if (distanceKm <= 35) {
    score += 35;
    factors.push(`Impacto directo local: a solo ${distanceKm} km del lote`);
  } else if (distanceKm <= 120) {
    score += 25;
    factors.push(`Contexto zonal cercano: a ${distanceKm} km`);
  } else if (distanceKm <= 250) {
    score += 15;
    factors.push(`Micro-región agronómica: a ${distanceKm} km`);
  } else if (distanceKm <= 600 && hydroRelation === 'upstream') {
    score += 10;
    factors.push(`Distancia regional (${distanceKm} km) conectada hidrológicamente`);
  } else {
    score += 5;
    factors.push(`Sensor distante (${distanceKm} km), relevancia contextual`);
  }

  // ============ FACTOR 2: HYDROLOGICAL CONNECTIVITY ============
  if (hydroRelation === 'upstream') {
    score += 25;
    factors.push(`Cuenca alta upstream: altera el régimen hídrico hacia tu campo`);
  } else if (hydroRelation === 'same_basin') {
    score += 15;
    factors.push(`Misma cuenca hidrográfica (${farmLoc.basinName})`);
  } else if (hydroRelation === 'shared_aquifer') {
    score += 15;
    factors.push(`Acuífero compartido (${farmLoc.aquifer || 'Subterráneo'})`);
  } else if (hydroRelation === 'direct_field') {
    score += 20;
    factors.push('Lectura satelital centrada sobre la celda del predio');
  }

  // ============ FACTOR 3: TEMPORAL TREND ============
  if (obs.trend === 'worsening') {
    score += 20;
    factors.push('Tendencia de degradación acelerada (exige intervención preventiva)');
  } else if (obs.trend === 'stable') {
    score += 5;
    factors.push('Condición persistente sin mejoría');
  }

  // ============ FACTOR 4: AGRICULTURAL TIMING & SOIL VULNERABILITY ============
  if (obs.type === 'soil_moisture_deficit') {
    if (farm.soilType === 'sandy_loam') {
      score += 15;
      factors.push('Suelo arenoso de muy baja retención: agota reservas un 40% más rápido');
    } else {
      score += 10;
      factors.push('Impacto directo en ventana de rotación y llenado radicular');
    }
  }

  if (obs.type === 'rainfall_deficit' && farm.irrigation === 'dryland') {
    score += 15;
    factors.push('Lote 100% a secano: nula capacidad de suplementación hídrica');
  }

  if (obs.type === 'frost_risk' && farm.location.region === 'sur') {
    score += 20;
    factors.push('Patagonia/Sur: alto riesgo de helada tardía en yemas y brotes');
  }

  if (obs.type === 'atmospheric_river' && farm.location.region === 'sur') {
    score += 15;
    factors.push('Vientos extremos atlánticos / desecación eólica');
  }

  if (obs.type === 'deforestation_runoff' && hydroRelation === 'upstream') {
    score += 20;
    factors.push('Pérdida de esponja vegetal aguas arriba: anticipa sequías de estiaje');
  }

  // ============ FACTOR 5: CRITICAL THRESHOLD CROSSING ============
  if (obs.type === 'soil_moisture_deficit' || obs.type === 'rainfall_deficit') {
    if (obs.value <= obs.criticalThreshold) {
      score += 20;
      factors.push(`Umbral crítico superado (${obs.value}${obs.unit} < ${obs.criticalThreshold}${obs.unit})`);
    } else if (obs.value <= obs.warningThreshold) {
      score += 10;
      factors.push(`Nivel de advertencia activa (${obs.value}${obs.unit} < ${obs.warningThreshold}${obs.unit})`);
    }
  } else if (obs.type === 'temperature_anomaly') {
    if (obs.value >= obs.criticalThreshold) {
      score += 20;
      factors.push(`Anomalía térmica extrema (+${obs.value}${obs.unit})`);
    } else if (obs.value >= obs.warningThreshold) {
      score += 10;
      factors.push(`Temperatura superficial elevada (+${obs.value}${obs.unit})`);
    }
  } else {
    score += 10;
  }

  // Cap at 100
  const finalScore = Math.min(100, Math.max(15, score));
  const severity = calculateSeverity(finalScore);
  const timeframe = calculateTimeframe(finalScore, obs.type);

  // Generate localized actions and scientific explanations
  const { suggestedAction, scientificContext, localImpact, title } = generateActionAndContext(
    obs,
    farm,
    severity,
    hydroRelation,
    distanceKm
  );

  return {
    id: obs.id,
    type: obs.type,
    source: obs.source,
    mission: obs.mission,
    instrument: obs.instrument,
    severity,
    score: finalScore,
    title,
    relevanceReason: factors.slice(0, 3).join(' • '),
    factors,
    actionable: finalScore >= 45,
    timeframe,
    suggestedAction,
    scientificContext,
    localImpact,
    currentValue: obs.value,
    unit: obs.unit,
    baseline: obs.baselineNormal,
    trend: obs.trend,
    distanceKm,
    observationLocation: obs.location,
    observationLocationName: obs.locationName,
    detectedAt: obs.timestamp,
    dataQuality: obs.confidence,
    satellitePassInfo: `${obs.mission} (${obs.instrument}) • Res: ${obs.resolution}`,
    hydrologicalRelation: hydroRelation
  };
}

/**
 * Generates tailored agronomic advice, scientific explanation, and clear rationale.
 */
function generateActionAndContext(
  obs: RawSensorObservation,
  farm: FarmProfile,
  severity: Severity,
  relation: string,
  distanceKm: number
): {
  title: string;
  suggestedAction: string;
  scientificContext: string;
  localImpact: string;
} {
  const isUrgent = severity === 'critical' || severity === 'high';

  switch (obs.type) {
    case 'soil_moisture_deficit':
      return {
        title: isUrgent
          ? 'Alerta Crítica: Déficit Severo de Humedad en Zona Radicular (0-50 cm)'
          : 'Monitoreo de Humedad en Perfil Subsuperficial de Suelo',
        suggestedAction: isUrgent
          ? `URGENTE: Sembrar cultivo de cobertura de baja evapotranspiración (Vicia villosa + Centeno) o ajustar densidad de ${farm.currentCrop}. Mantener 100% rastrojo para reducir evaporación directa.`
          : `Evaluar retención de agua en perfil edáfico antes del próximo ciclo. Preparar barbecho con cobertura orgánica viva en lugar de químico desnudo.`,
        scientificContext: `La banda L de microondas (1.275 GHz en SAOCOM y 1.41 GHz en SMAP) penetra la vegetación y hasta 50 cm en el suelo, midiendo la constante dieléctrica del agua libre en el perfil radicular.`,
        localImpact: `La reserva útil cayó a ${obs.value}${obs.unit} (normal: ${obs.baselineNormal}${obs.unit}). En ${farm.location.name}, esto restringe el agua de absorción crítica para ${farm.currentCrop}, reduciendo el potencial de rinde en hasta un 32% si no se ajusta la rotación.`
      };

    case 'rainfall_deficit':
      return {
        title: 'Anomalía de Precipitaciones y Tendencia de Sequía Regional',
        suggestedAction: isUrgent
          ? `Planificar rotación hacia cultivos con menor demanda hídrica estival (Girasol o Sorgo granífero con raíz pivotante profunda). Reducir fertilización nitrogenada inicial para no sobreestimular biomasa foliar temprana.`
          : `Monitorear proyecciones GPM decádicas. Ajustar fecha de siembra hacia ventanas tardías para esquivar el pico de déficit estival.`,
        scientificContext: `GPM IMERG combina sensores pasivos de microondas y radar de precipitación satelital de NASA/JAXA para calcular tasas pluviométricas acumuladas cada 30 minutos sin depender de pluviómetros terrestres aislados.`,
        localImpact: `Las lluvias de los últimos 30 días marcaron solo ${obs.value}${obs.unit} frente a una media histórica de ${obs.baselineNormal}${obs.unit}. La falta de recarga en el horizonte superficial afecta la cama de siembra en ${farm.location.province}.`
      };

    case 'upstream_water_level':
      return {
        title: 'Variación de Caudal y Nivel Hidrométrico Cuenca Arriba',
        suggestedAction: isUrgent
          ? `Anticipar baja de napas freáticas y menor presión de canales. Si cuenta con riego suplementario, adelantar turnos de bombeo o revisar profundidad de tomas antes del estiaje.`
          : `Monitorear niveles en estaciones telemétricas AEP/CONAE. Planificar cultivos con raíces que exploren más allá de 1.5 metros.`,
        scientificContext: `Estaciones telemétricas satelitales (AEP/CONAE) y radar altimétrico monitorean pulsos hidrológicos a lo largo del Río Paraná y la Cuenca del Plata, detectando ondas de sequía antes de que lleguen a las tomas de riego downstream.`,
        localImpact: `Registrado a ${distanceKm} km aguas arriba (${obs.locationName}). El pulso de descenso en el río principal tiene un retraso de 10-18 días en propagarse a las zonas de recarga de ${farm.location.name}.`
      };

    case 'deforestation_runoff':
      return {
        title: 'Impacto Hidrológico por Pérdida de Cobertura Forestal Upstream',
        suggestedAction: `Introducir cultivos perennes o pasturas polifíticas en las rotaciones para actuar como amortiguadores de humedad locales e incrementar la infiltración propia del suelo.`,
        scientificContext: `Sensores ópticos (CBERS-4A / Amazonia-1 / Sentinel-2) captan pérdida de dosel arbóreo en la cuenca alta. La deforestación reduce la evapotranspiración regional y altera los ríos voladores de vapor de agua.`,
        localImpact: `Ubicado a ${distanceKm} km en cuenca compartida. La degradación de cabeceras de cuenca provoca que las temporadas secas se extiendan 2 a 3 semanas más en ${farm.location.province}.`
      };

    case 'temperature_anomaly':
      return {
        title: 'Anomalía Térmica Superficial y Estrés Evaporativo',
        suggestedAction: `Incrementar la cobertura de rastrojo en superficie para reducir la temperatura del suelo hasta 6°C al mediodía. Evitar labores que expongan la materia orgánica a mineralización acelerada por calor.`,
        scientificContext: `NASA MODIS y VIIRS calculan la Temperatura de Superficie Terrestre (LST) midiendo la radiación infrarroja térmica diurna y nocturna corregida por emisividad de cobertura vegetal.`,
        localImpact: `Anomalía detectada de +${obs.value}°C sobre la media estacional. El estrés térmico acelera la senescencia foliar de ${farm.currentCrop} y multiplica la tasa de evapotranspiración potencial.`
      };

    case 'frost_risk':
      return {
        title: 'Alerta Temprana de Heladas Tardías / Frente Polar Antártico',
        suggestedAction: `Demorar la siembra de cultivos susceptibles de verano. Aplicar bioestimulantes osmoprotectores si hay brotación activa y mantener suelo húmedo en superficie para mayor inercia térmica.`,
        scientificContext: `Modelos de circulación atmosférica de la UK Space Agency combinados con sensores polares detectan intrusiones de masas de aire polar subantártico con hasta 10 días de anticipación.`,
        localImpact: `Pronóstico de descenso térmico a ${obs.value}°C en la madrugada. En ${farm.location.name}, las heladas tardías causan quemado de plántulas jóvenes y meristemas reproductivos.`
      };

    case 'atmospheric_river':
      return {
        title: 'Río Atmosférico y Evento de Vientos Extremos del Atlántico Sur',
        suggestedAction: `Establecer cortinas rompevientos vegetales temporales con sorgo forrajero o centeno alto. Proteger silos bolsa y suspender aplicaciones pulverizadoras por deriva extrema.`,
        scientificContext: `Transporte troposférico estrecho y concentrado de vapor de agua desde el Atlántico Sur monitoreado por satélites de dinámica atmosférica. Genera gradientes báricos con ráfagas superiores a 85 km/h.`,
        localImpact: `Riesgo de erosión eólica severa en lotes descubiertos en ${farm.location.province} y voladura de la fracción más fértil de limos y materia orgánica.`
      };

    case 'vegetation_vigor_drop':
    default:
      return {
        title: 'Descenso en Índice de Vigor Vegetativo y Clorofila (NDVI)',
        suggestedAction: `Rotar lote con gramínea de invierno (cebada o centeno) para reactivar la microbiología rizosférica y regenerar la agregación estructural del suelo.`,
        scientificContext: `Sentinel-2 MSI mide la reflectancia en el infrarrojo cercano (B8) y el rojo (B4) para cuantificar la biomasa fotosintéticamente activa y la densidad del dosel.`,
        localImpact: `El índice NDVI cayó a ${obs.value} (esperado: ${obs.baselineNormal}). La vegetación muestra ralentización metabólica antes de ser perceptible a simple vista.`
      };
  }
}
