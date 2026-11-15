import { Alert, CropRotationPlan, FarmProfile } from '../types';

const PERENNIAL = /yerba mate|\bté\b|limón|mandarina|naranja|pomelo|banana|jojoba|tung/i;
const mainCropNames: Record<FarmProfile['currentCrop'], string> = {
  soybean: 'Soja', maize: 'Maíz', wheat: 'Trigo', sunflower: 'Girasol', sorghum: 'Sorgo', pasture: 'Pastura perenne', barley: 'Cebada'
};

/** Qualitative alternatives only; this module does not estimate yield, water savings or success probability. */
export function generateRotationStrategies(farm: FarmProfile, activeAlerts: Alert[]): CropRotationPlan[] {
  const crops = farm.cropAllocations?.map(item => item.crop) ?? [];
  const crop = crops[0] ?? mainCropNames[farm.currentCrop];
  const perennials = crops.filter(item => PERENNIAL.test(item));
  const isPerennial = perennials.length > 0;
  const drySignal = activeAlerts.some(alert => alert.type === 'soil_moisture_deficit' || alert.type === 'rainfall_deficit');
  const wetSignal = activeAlerts.some(alert => alert.type === 'excess_precipitation');
  const cue = drySignal
    ? 'Hay una observación vigente asociada a falta de agua; verificá el lote antes de cambiar la secuencia.'
    : wetSignal
      ? 'El pronóstico indica precipitaciones abundantes; verificá drenaje y transitabilidad antes de definir labores.'
      : 'No hay una alerta ambiental vigente que permita priorizar una alternativa.';
  const steps = (season: string, cropName: string, purpose: CropRotationPlan['steps'][number]['purpose'], text: string): CropRotationPlan['steps'] => [{
    season, crop: cropName, scientificName: '', purpose, waterDemand: 'moderate', rootDepthMeters: 0,
    soilHealthBenefit: 'El efecto depende del suelo, manejo, especie y condiciones del lote; ArgField no lo cuantifica.',
    adaptationRationale: text,
    expectedSoilMoistureConservation: 'No estimada: faltan mediciones y antecedentes del lote.'
  }];
  const make = (id: string, title: string, theme: string, summary: string, list: CropRotationPlan['steps']): CropRotationPlan => ({
    id, title, theme, resilienceScore: 0, primaryGoal: isPerennial ? 'Orientar el manejo del cultivo permanente existente.' : `Explorar opciones de manejo para ${crop}.`,
    waterSavingsPct: 0, soilCarbonPotential: 'Sin estimación local verificable.', summary: `${summary} ${cue} Contrastá cualquier cambio con un profesional agronómico local.`,
    steps: list, nasaDataTrigger: cue
  });

  if (isPerennial) {
    const perennial = perennials.join(', ');
    return [
      make('perennial-cover', 'Mantener cobertura entre hileras', 'Manejo de cultivo perenne', 'Conservar cobertura compatible con el cultivo permanente y controlar competencia por agua según la estación.', steps('Manejo actual', perennial, 'moisture_preserver', 'Evaluar cobertura y competencia con el cultivo perenne; la selección de especies depende de clima, suelo y manejo local.')),
      make('perennial-water', 'Revisar agua y suelo del lote', 'Seguimiento antes de intervenir', 'Combinar las observaciones ambientales disponibles con recorridas de campo antes de ajustar riego o labores.', steps('Seguimiento', perennial, 'cash_crop', 'La lectura satelital es puntual y no reemplaza mediciones del suelo ni inspección del cultivo.')),
      make('perennial-residue', 'Proteger el suelo y planificar labores', 'Cuidado de la estructura del suelo', 'Priorizar prácticas que mantengan el suelo cubierto y eviten tránsito con exceso de humedad.', steps('Manejo entre campañas', perennial, 'moisture_preserver', 'Adecuar cobertura, poda y tránsito a la especie perenne y al calendario de la región.'))
    ];
  }

  return [
    make('cover-crop', 'Evaluar un cultivo de cobertura', 'Cobertura y protección del suelo', `Considerar un cultivo de servicio entre campañas de ${crop}.`, steps('Entre campañas', 'Cultivo de cobertura adaptado a la zona', 'moisture_preserver', 'Elegir especie y fecha según agua disponible, objetivo de cobertura y ventana de siembra del cultivo siguiente.')),
    make('crop-diversity', 'Diversificar la secuencia', 'Alternancia de familias y calendarios', `Comparar una secuencia que alterne ${crop} con otra familia de cultivo compatible.`, steps('Próxima campaña', 'Cultivo de otra familia, a definir localmente', 'cash_crop', 'Validar fecha de siembra, mercado, sanidad y requerimientos del suelo antes de decidir.')),
    make('residue', 'Conservar cobertura y revisar el lote', 'Manejo conservacionista', `Mantener residuos vegetales y evaluar el estado del lote antes de modificar la secuencia de ${crop}.`, steps('Planificación', crop, 'cash_crop', 'La cobertura, el tránsito y las labores deben ajustarse a la condición observada en el lote.'))
  ];
}
