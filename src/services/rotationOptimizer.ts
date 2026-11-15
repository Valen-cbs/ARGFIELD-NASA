import { Alert, CropRotationPlan, FarmProfile } from '../types';

/**
 * Synthesizes NASA & Space Agency observations, local soil characteristics,
 * current crop, and farmer priorities to generate 3 actionable, resilient crop rotation strategies.
 */
export function generateRotationStrategies(
  farm: FarmProfile,
  activeAlerts: Alert[]
): CropRotationPlan[] {
  const topCriticalAlert = activeAlerts.find(a => a.severity === 'critical') || activeAlerts[0];
  const isSevereMoistureDeficit = activeAlerts.some(
    a => a.type === 'soil_moisture_deficit' && a.score >= 70
  );
  const isRainfallDeficit = activeAlerts.some(
    a => a.type === 'rainfall_deficit' && a.score >= 60
  );
  const isHeatStress = activeAlerts.some(
    a => a.type === 'temperature_anomaly' && a.score >= 50
  );

  const plans: CropRotationPlan[] = [];

  // ==========================================
  // PLAN 1: ESTRATEGIA DE BLINDAJE HÍDRICO & COBERTURA
  // ==========================================
  const plan1: CropRotationPlan = {
    id: 'plan_water_shield',
    title: 'Blindaje Hídrico & Mulch Vivo Conservacionista',
    theme: 'Máxima retención de agua en perfil radicular y freno a evaporación',
    resilienceScore: isSevereMoistureDeficit ? 94 : 88,
    primaryGoal: 'Retener hasta 45mm adicionales de agua útil en los primeros 50cm',
    waterSavingsPct: 28,
    soilCarbonPotential: '+1.8 t C/ha/año en biomasa aérea y radicular',
    nasaDataTrigger: `Activada por ${topCriticalAlert ? `${topCriticalAlert.source} ${topCriticalAlert.mission}` : 'NASA SMAP / CONAE SAOCOM'} detectando humedad en zona radicular por debajo de umbral de resiliencia.`,
    summary:
      'Reemplaza el barbecho químico limpio por un cultivo de servicios multiespecie (Vicia villosa + Centeno) con secado anticipado a floración. Genera un colchón de rastrojo que suprime la temperatura estival del suelo hasta 7°C y evita la pérdida evaporativa directa.',
    steps: [
      {
        season: 'Otoño - Invierno (Año 1)',
        crop: 'Centeno secale + Vicia villosa (Consorciado)',
        scientificName: 'Secale cereale + Vicia villosa',
        purpose: 'moisture_preserver',
        waterDemand: 'low',
        rootDepthMeters: 1.2,
        soilHealthBenefit:
          'Fijación biológica de hasta 80 kg N/ha por la vicia; el centeno provee lignina de lenta descomposición para el colchón de mulch.',
        adaptationRationale:
          'El secado a los 90-110 días previene consumo hídrico excesivo y asegura recarga antes de la siembra gruesa.',
        expectedSoilMoistureConservation: '+35 mm de agua almacenada en presiembra'
      },
      {
        season: 'Verano (Año 1 - 2)',
        crop: farm.currentCrop === 'maize' ? 'Maíz tardío de baja densidad' : 'Girasol de ciclo intermedio',
        scientificName: farm.currentCrop === 'maize' ? 'Zea mays (siembra tardía)' : 'Helianthus annuus',
        purpose: 'cash_crop',
        waterDemand: 'moderate',
        rootDepthMeters: 2.1,
        soilHealthBenefit:
          'Raíz pivotante profunda que aprovecha agua del estrato 1.0 a 2.0 m sin competir con horizontes superficiales.',
        adaptationRationale:
          'Al sembrar en fechas tardías (diciembre), el período crítico de floración esquiva el pico histórico de estrés térmico de enero detectado por MODIS.',
        expectedSoilMoistureConservation: 'Alta eficiencia de uso del agua (EUA: 14 kg/mm)'
      },
      {
        season: 'Invierno (Año 2)',
        crop: 'Cebada cervecera de ciclo corto',
        scientificName: 'Hordeum vulgare',
        purpose: 'cash_crop',
        waterDemand: 'low',
        rootDepthMeters: 1.1,
        soilHealthBenefit:
          'Liberación temprana del lote (fines de noviembre) que maximiza la ventana de recarga para el verano subsiguiente.',
        adaptationRationale:
          'Consume 20% menos milímetros que el trigo pan, reduciendo el riesgo de balance hídrico negativo.',
        expectedSoilMoistureConservation: '+20 mm remanentes al corte'
      },
      {
        season: 'Verano (Año 2 - 3)',
        crop: 'Soja de segunda sobre rastrojo no-till intacto',
        scientificName: 'Glycine max',
        purpose: 'cash_crop',
        waterDemand: 'moderate',
        rootDepthMeters: 1.3,
        soilHealthBenefit:
          'Protección total contra impacto de gota de lluvia torrencial y prevención de planchado superficial.',
        adaptationRationale:
          'Aprovecha el nitrógeno residual y la excelente infiltración generada por las raíces de la cebada previa.',
        expectedSoilMoistureConservation: 'Reducción del 50% en escurrimiento superficial'
      }
    ]
  };

  // ==========================================
  // PLAN 2: ESTRATEGIA DE REGENERACIÓN RADICULAR PROFUNDA
  // ==========================================
  const plan2: CropRotationPlan = {
    id: 'plan_deep_roots',
    title: 'Descompactación Biológica & Ciclo Profundo de Nutrientes',
    theme: 'Bioperforación edáfica, exploración freática y regeneración microbiológica',
    resilienceScore: farm.soilType === 'clay_vertisol' ? 96 : 89,
    primaryGoal: 'Crear macroporos biológicos para elevar la infiltración de lluvias de 8 a 32 mm/hora',
    waterSavingsPct: 22,
    soilCarbonPotential: '+2.4 t C/ha/año (alta tasa de secuestro en profundidad)',
    nasaDataTrigger:
      'Respuesta a observaciones SAR de deformación/compactación (AEE/ASI) y descenso de reservas profundas (CONAE SAOCOM 1A).',
    summary:
      'Utiliza la fuerza biomecánica de raíces tipo pivotante agresiva (Rábano forrajero / Nabo forrajero) combinadas con cereales C4 de gran volumen radical (Sorgo granífero) para romper capas densas o "piso de arado" sin disturbar mecánicamente el suelo.',
    steps: [
      {
        season: 'Invierno (Año 1)',
        crop: 'Rábano Forrajero (Daikon) + Avena sativa',
        scientificName: 'Raphanus sativus var. oleiferus + Avena sativa',
        purpose: 'deep_break',
        waterDemand: 'low',
        rootDepthMeters: 1.8,
        soilHealthBenefit:
          'Los "bio-tubérculos" de hasta 5 cm de diámetro abren canales verticales que persisten tras su descomposición, guiando futuras raíces de cultivos comerciales.',
        adaptationRationale:
          'Aumenta drásticamente la tasa de infiltración, capturando tormentas convectivas severas sin escurrimiento ni encharcamiento.',
        expectedSoilMoistureConservation: 'Triplica la tasa de infiltración de lluvias intensas'
      },
      {
        season: 'Verano (Año 1 - 2)',
        crop: 'Sorgo granífero rústico (Tolerante a estrés)',
        scientificName: 'Sorghum bicolor',
        purpose: 'cash_crop',
        waterDemand: 'low',
        rootDepthMeters: 2.2,
        soilHealthBenefit:
          'Desarrolla más de 3.000 kg/ha de biomasa de raíces finas, segregando exudados que reactivan hongos micorrícicos arbusculares (HMA).',
        adaptationRationale:
          'Capacidad genética de entrar en dormición vegetativa durante sequías estivales de 20 días y reactivarse con una lluvia.',
        expectedSoilMoistureConservation: '40% menor consumo que un maíz bajo las mismas condiciones térmicas'
      },
      {
        season: 'Invierno (Año 2)',
        crop: 'Trigo pan con fertilización balanceada P-S',
        scientificName: 'Triticum aestivum',
        purpose: 'cash_crop',
        waterDemand: 'moderate',
        rootDepthMeters: 1.5,
        soilHealthBenefit:
          'Las raíces del trigo penetran fácilmente a través de los canales dejados por el rábano previo, alcanzando reservas de agua más profundas.',
        adaptationRationale:
          'Mayor exploración volumétrica de suelo: el cultivo sufre significativamente menos ante pulsos secos en floración.',
        expectedSoilMoistureConservation: 'Aprovechamiento de agua útil hasta 140 cm'
      },
      {
        season: 'Verano (Año 2 - 3)',
        crop: 'Soja grupo de madurez adaptado con inoculación doble',
        scientificName: 'Glycine max',
        purpose: 'cash_crop',
        waterDemand: 'moderate',
        rootDepthMeters: 1.4,
        soilHealthBenefit:
          'Nodulación óptima gracias a la oxigenación del suelo lograda por la estructura macroporosa.',
        adaptationRationale:
          'Estabilidad de rendimiento en años con eventos Niño o Niña moderados.',
        expectedSoilMoistureConservation: 'Reserva acumulada en profundidad'
      }
    ]
  };

  // ==========================================
  // PLAN 3: ESTRATEGIA DE DIVERSIFICACIÓN CLIMÁTICA & DILUCIÓN DE RIESGO
  // ==========================================
  const plan3: CropRotationPlan = {
    id: 'plan_climate_resilience',
    title: 'Diversificación Escalonada & Tolerancia a Shocks Extremos',
    theme: 'Dilución del riesgo pluviométrico mediante cosechas escalonadas y cultivos C3/C4 alternados',
    resilienceScore: isRainfallDeficit || isHeatStress ? 95 : 86,
    primaryGoal: 'Eliminar el riesgo de pérdida total de campaña por olas de calor o baches pluviométricos',
    waterSavingsPct: 32,
    soilCarbonPotential: '+2.1 t C/ha/año con balance mineralizado equilibrado',
    nasaDataTrigger:
      'Grounded en pronósticos GPM de ventanas secas prolongadas y modelos de anomalía térmica MODIS.',
    summary:
      'Evita concentrar el capital del agricultor en una única ventana de siembra estival. Escala la producción entre cereales de invierno resistentes al frío, oleaginosas profundas y cultivos de verano rústicos, asegurando flujos de caja y conservación biológica.',
    steps: [
      {
        season: 'Otoño - Invierno (Año 1)',
        crop: 'Centeno forrajero / grano para cobertura',
        scientificName: 'Secale cereale',
        purpose: 'moisture_preserver',
        waterDemand: 'low',
        rootDepthMeters: 1.3,
        soilHealthBenefit:
          'Efecto alelopático natural que suprime el banco de malezas de difícil control (Amaranthus, Conyza) sin gasto excesivo de herbicidas.',
        adaptationRationale:
          'Tolera heladas extremas de hasta -8°C (crucial si el modelo UKSA/CSA proyecta frentes polares antárticos).',
        expectedSoilMoistureConservation: 'Ahorro de evaporación equivalente a 40 mm de lluvia'
      },
      {
        season: 'Primavera - Verano (Año 1 - 2)',
        crop: 'Girasol confitero / aceitero de siembra temprana',
        scientificName: 'Helianthus annuus',
        purpose: 'cash_crop',
        waterDemand: 'low',
        rootDepthMeters: 2.3,
        soilHealthBenefit:
          'Excelente descompactador de estratos medios y tolerante a condiciones de salinidad moderada en el suelo.',
        adaptationRationale:
          'Cosecha anticipada en febrero que evita el estrés hídrico de final de verano y permite sembrar verde sobre verde.',
        expectedSoilMoistureConservation: 'Consumo eficiente en estratos profundos'
      },
      {
        season: 'Invierno (Año 2)',
        crop: 'Trébol rojo / Vicia sativa como abono verde',
        scientificName: 'Trifolium pratense / Vicia sativa',
        purpose: 'nitrogen_fixer',
        waterDemand: 'low',
        rootDepthMeters: 1.0,
        soilHealthBenefit:
          'Aporte de nitrógeno orgánico disponible de liberación gradual para el cultivo de maíz siguiente.',
        adaptationRationale:
          'No genera exportación de grano; todo el material vegetal se incorpora como materia orgánica viva al suelo.',
        expectedSoilMoistureConservation: '+90 kg N/ha biológico gratuito'
      },
      {
        season: 'Verano (Año 2 - 3)',
        crop: 'Maíz de siembra tardía de alta eficiencia hídrica',
        scientificName: 'Zea mays',
        purpose: 'cash_crop',
        waterDemand: 'moderate',
        rootDepthMeters: 1.9,
        soilHealthBenefit:
          'Generación de 9 a 12 toneladas de rastrojo carbonoso con alta relación C/N para cerrar el ciclo de 3 años.',
        adaptationRationale:
          'Se implanta con el perfil colmado de agua y nutrientes biológicos aportados por el trébol previo.',
        expectedSoilMoistureConservation: 'Alta estabilidad de rendimiento (CV < 12%)'
      }
    ]
  };

  plans.push(plan1, plan2, plan3);

  // Sort plans so the one that best matches farmer priority or severe alert is first
  if (farm.priority === 'conserve_moisture') {
    return [plan1, plan2, plan3];
  } else if (farm.priority === 'build_soil_organic') {
    return [plan2, plan1, plan3];
  } else {
    return [plan3, plan1, plan2];
  }
}
