import { MAGYP_CROPS, type MagypCrop } from '../data/magypCrops';
import type { RotationEngineInput } from './engineTypes';

type Objective = 'water' | 'soil' | 'succession' | 'margin';
interface ManagementProfile {
  system: 'annual' | 'perennial' | 'semi_perennial';
  water: string;
  soil: string;
  succession: string;
  margin: string;
}

// Qualitative decision rules. These profiles carry no yield, Kc or water-saving estimates.
function profile(system: ManagementProfile['system'], water: string, soil: string, succession: string, margin: string): ManagementProfile {
  return { system, water, soil, succession, margin };
}

export const CROP_MANAGEMENT_PROFILES: Record<MagypCrop, ManagementProfile> = {
  'Ajo': profile('annual', 'Revisar humedad durante formación del bulbo y ajustar riego a la madurez.', 'Evaluar drenaje y salinidad antes de preparar la cama de plantación.', 'Alternar con familias distintas de ajo, cebolla y puerro según antecedentes sanitarios.', 'Comparar calidad de semilla, clasificación de bulbos y costos de curado y almacenamiento.'),
  'Algodón': profile('annual', 'Priorizar el seguimiento del agua en floración y formación de cápsulas.', 'Conservar residuos y evitar compactación en las calles de tránsito.', 'Planificar alternancia con gramíneas y manejo sanitario del rastrojo.', 'Comparar fecha de siembra, calidad de fibra y costos de cosecha y desmote.'),
  'Alpiste': profile('annual', 'Verificar reserva hídrica antes de sembrar y seguir espigazón y llenado.', 'Mantener rastrojos y revisar implantación en suelos con riesgo de encostramiento.', 'Alternar el cereal con una familia diferente y revisar malezas gramíneas.', 'Confirmar comprador y requisitos de limpieza y pureza del grano.'),
  'Arroz': profile('annual', 'Revisar nivelación, pérdidas de conducción y control del agua según el sistema arrocero.', 'Evaluar infiltración, drenaje y salinidad del lote y del agua.', 'Planificar descansos o alternancias compatibles con el drenaje y el control de arroz maleza.', 'Comparar bombeo, energía, disponibilidad de agua y costo de secado.'),
  'Arveja': profile('annual', 'Seguir humedad en floración y formación de vainas y evitar anegamientos.', 'Revisar drenaje e inoculación específica antes de la siembra.', 'Alternar con gramíneas y revisar antecedentes de enfermedades de leguminosas.', 'Comparar destino verde o seco, calidad comercial y logística de cosecha.'),
  'Avena': profile('annual', 'Adecuar fecha y destino del cultivo a la reserva de agua para la campaña siguiente.', 'Conservar cobertura y ajustar pastoreo para proteger el suelo.', 'Alternar con leguminosas y revisar enfermedades compartidas con otros cereales.', 'Comparar grano, forraje y servicio según demanda y costos de utilización.'),
  'Banana': profile('perennial', 'Controlar continuidad del abastecimiento de agua y drenaje de la plantación.', 'Mantener cobertura orgánica y limitar compactación entre hileras.', 'Planificar renovación por sectores y selección de hijuelos con seguimiento sanitario.', 'Revisar descarte, calidad de racimos y logística de maduración y transporte.'),
  'Caña de azúcar': profile('semi_perennial', 'Evaluar agua durante implantación y crecimiento de caña planta y socas.', 'Conservar cobertura de cosecha y limitar tránsito sobre suelo húmedo.', 'Definir renovación de cañaverales por vigor de socas y antecedentes sanitarios.', 'Comparar productividad de socas, costos de renovación, cosecha y transporte al ingenio.'),
  'Cártamo': profile('annual', 'Verificar agua del perfil y seguir floración y llenado pese a su rusticidad.', 'Revisar profundidad efectiva y evitar sectores con anegamiento.', 'Alternar con familias diferentes y revisar antecedentes de enfermedades de raíz.', 'Confirmar contrato, contenido de aceite y costos de cosecha y flete.'),
  'Cebada cervecera': profile('annual', 'Seguir humedad en encañazón, espigazón y llenado.', 'Ajustar nutrición con análisis de suelo y conservar el rastrojo.', 'Evaluar cultivo siguiente según fecha real de cosecha y agua remanente.', 'Ajustar manejo a los requisitos de proteína, calibre y germinación del comprador.'),
  'Cebada forrajera': profile('annual', 'Ajustar uso forrajero o cosecha al agua disponible y al cultivo siguiente.', 'Regular extracción de biomasa para conservar cobertura.', 'Alternar con leguminosas y revisar sanidad de cereales consecutivos.', 'Comparar grano y forraje por costo de materia seca aprovechable.'),
  'Cebada total': profile('annual', 'Revisar agua en etapas reproductivas de cada lote de cebada.', 'Conservar rastrojos y definir nutrición con análisis de suelo.', 'Separar lotes por destino y planificar la ocupación posterior a cosecha.', 'Desagregar cebada cervecera y forrajera antes de comparar calidad y margen.'),
  'Cebolla total': profile('annual', 'Seguir humedad en bulbificación y ajustar frecuencia al suelo y sistema de riego.', 'Revisar salinidad, nivelación y drenaje de la cama de cultivo.', 'Alternar con familias diferentes de las aliáceas según historial sanitario.', 'Comparar variedad, fotoperíodo, calibre, curado y pérdidas de almacenamiento.'),
  'Centeno': profile('annual', 'Definir fecha de terminación del cultivo de servicio según agua y cultivo siguiente.', 'Mantener rastrojo protector en sectores expuestos a erosión.', 'Planificar alternancia y revisar malezas y enfermedades de gramíneas.', 'Comparar destino grano, forraje y cobertura con el costo de implantación y terminación.'),
  'Colza': profile('annual', 'Revisar agua en implantación y floración y evitar encharcamientos.', 'Evaluar cama de siembra y nutrición nitrogenada y azufrada con análisis.', 'Alternar con familias diferentes de las brasicáceas y revisar residualidad de herbicidas.', 'Comparar pérdidas por dehiscencia, fecha de cosecha y bonificación por aceite.'),
  'Garbanzo': profile('annual', 'Seguir agua de perfil y humedad en floración y llenado evitando excesos.', 'Priorizar drenaje y revisar inoculación específica.', 'Evitar sucesiones de leguminosas con enfermedades de suelo compartidas.', 'Comparar calibre, calidad sanitaria, contrato y acondicionamiento.'),
  'Girasol': profile('annual', 'Revisar agua profunda y seguir floración y llenado.', 'Evaluar profundidad efectiva y preservar cobertura tras la cosecha.', 'Alternar familias y revisar antecedentes de enfermedades compartidas con otras oleaginosas.', 'Comparar contenido de aceite, pérdidas de cosecha y costo de flete.'),
  'Jojoba': profile('perennial', 'Ajustar riego al estado de la plantación y verificar calidad del agua.', 'Evaluar drenaje y salinidad y proteger las calles de la erosión.', 'Revisar distribución de plantas masculinas y femeninas y renovación de plantas improductivas.', 'Comparar recolección, extracción y calidad comercial de la cera.'),
  'Lenteja': profile('annual', 'Seguir humedad en floración y llenado y evitar lotes anegables.', 'Revisar nivelación para cosecha e inoculación específica.', 'Alternar con gramíneas y revisar historial de enfermedades de leguminosas.', 'Comparar calibre, limpieza, pérdidas de cosecha y demanda comercial.'),
  'Limón': profile('perennial', 'Seguir humedad durante floración, cuaje y crecimiento de frutos.', 'Evaluar drenaje, salinidad y cobertura compatible entre hileras.', 'Planificar poda y renovación por sectores considerando portainjerto y sanidad.', 'Comparar destino fresco e industria, calidad y costo de cosecha.'),
  'Lino': profile('annual', 'Revisar agua disponible en implantación, floración y llenado.', 'Conservar estructura superficial y ajustar nutrición al análisis del suelo.', 'Alternar con familias diferentes y revisar sanidad del lote.', 'Comparar destino oleaginoso o fibra, calidad y disponibilidad de comprador.'),
  'Maíz': profile('annual', 'Priorizar seguimiento del agua alrededor de floración y comienzo del llenado.', 'Ajustar nutrición y densidad a la oferta del lote y conservar rastrojos.', 'Alternar con leguminosas y escalonar fechas según riesgo local.', 'Comparar fechas, híbridos, costo de secado y margen con precios del establecimiento.'),
  'Mandarina': profile('perennial', 'Seguir agua durante cuaje y crecimiento y ajustar al ciclo de cada variedad.', 'Revisar drenaje y mantener cobertura manejada en las calles.', 'Planificar poda y renovación según variedad, portainjerto y sanidad.', 'Comparar calendario de cosecha, calibre, calidad de cáscara y descarte.'),
  'Maní': profile('annual', 'Revisar humedad durante formación y llenado de vainas.', 'Evaluar estructura de la zona de fructificación y riesgo de erosión tras el arrancado.', 'Planificar alternancia y retorno según enfermedades de suelo y antecedentes del lote.', 'Comparar calidad de grano, arrancado, secado y exigencias sanitarias del comprador.'),
  'Mijo': profile('annual', 'Ajustar siembra a humedad de implantación y seguir panojamiento y llenado.', 'Conservar cobertura y evitar una cama de siembra encostrada.', 'Alternar con otra familia y revisar control de gramíneas.', 'Confirmar especie, destino comercial y capacidad de cosecha y limpieza.'),
  'Naranja': profile('perennial', 'Seguir humedad en floración, cuaje y crecimiento del fruto.', 'Evaluar drenaje, calidad del agua y cobertura entre hileras.', 'Planificar poda y renovación según variedad, portainjerto y sanidad.', 'Comparar destino jugo o fresco, calidad interna y costos de cosecha.'),
  'Papa total': profile('annual', 'Seguir humedad en inicio de tuberización y crecimiento de tubérculos.', 'Revisar estructura de camellones, drenaje y compactación.', 'Alternar familias y usar antecedentes sanitarios para definir el retorno de solanáceas.', 'Comparar semilla, destino industrial o fresco, calibre y almacenamiento.'),
  'Pomelo': profile('perennial', 'Seguir humedad en cuaje y crecimiento de frutos y revisar calidad del agua.', 'Mantener drenaje y cobertura manejada entre hileras.', 'Revisar poda y renovación según variedad, portainjerto y sanidad.', 'Comparar calibre, calidad interna, destino fresco o industria y demanda comercial.'),
  'Poroto alubia': profile('annual', 'Seguir agua durante floración y llenado de vainas evitando excesos.', 'Revisar drenaje, estructura e inoculación compatible con el cultivo.', 'Alternar con gramíneas y revisar enfermedades compartidas por leguminosas.', 'Priorizar blancura, calibre e integridad del grano en cosecha y acondicionamiento.'),
  'Poroto negro': profile('annual', 'Revisar humedad en floración y llenado y evitar anegamientos.', 'Evaluar drenaje e inoculación específica.', 'Alternar con gramíneas según historial sanitario.', 'Comparar uniformidad de color, calibre, daño mecánico y contrato comercial.'),
  'Poroto otros': profile('annual', 'Identificar tipo de poroto y seguir humedad en floración y llenado.', 'Revisar drenaje e inoculación según especie y tipo comercial.', 'Definir alternancia según especie y enfermedades presentes en el lote.', 'Precisar variedad y clase comercial antes de comparar compradores y márgenes.'),
  'Poroto total': profile('annual', 'Desagregar lotes por tipo y seguir humedad en etapas reproductivas.', 'Evaluar drenaje, estructura e inoculación en cada lote.', 'Planificar alternancia con gramíneas según antecedentes de cada tipo de poroto.', 'Separar alubia, negro y otros para comparar costos, calidad y precios sin duplicar superficie.'),
  'Soja 1ra': profile('annual', 'Seguir agua durante formación de vainas y llenado de granos.', 'Revisar nodulación y conservar cobertura del antecesor.', 'Alternar con gramíneas y evaluar enfermedades de suelo.', 'Comparar grupo de madurez, fecha, costos e ingreso esperado con datos propios.'),
  'Soja 2da': profile('annual', 'Verificar agua remanente tras el antecesor y ajustar implantación a la ventana disponible.', 'Distribuir uniformemente el rastrojo y revisar nodulación.', 'Confirmar cosecha del cultivo invernal y compatibilidad real del doble cultivo.', 'Comparar margen conjunto del doble cultivo incluyendo demora de siembra y cosecha.'),
  'Soja total': profile('annual', 'Separar primera y segunda ocupación para revisar disponibilidad de agua.', 'Revisar nodulación y cobertura en cada lote.', 'Desagregar soja de primera y segunda antes de diseñar la secuencia.', 'Comparar costos y márgenes por ocupación evitando duplicar superficies agregadas.'),
  'Sorgo': profile('annual', 'Verificar agua de implantación y seguir floración y llenado.', 'Conservar biomasa y ajustar extracción si el destino es forrajero.', 'Alternar familias y revisar residualidad de herbicidas y sanidad.', 'Comparar destino granífero o forrajero, calidad y costo de aprovechamiento.'),
  'Té': profile('perennial', 'Seguir humedad durante brotación y evitar competencia excesiva de coberturas.', 'Evaluar acidez, nutrición y protección del suelo entre hileras.', 'Planificar poda y renovación por sectores según vigor de las plantas.', 'Comparar frecuencia de cosecha, calidad de brotes y logística a secadero.'),
  'Trigo candeal': profile('annual', 'Seguir agua en espigazón, floración y llenado.', 'Ajustar nutrición con análisis y conservar rastrojos.', 'Alternar familias y verificar ventana del cultivo posterior.', 'Confirmar contrato y requisitos de proteína, vitreosidad y calidad industrial.'),
  'Trigo total': profile('annual', 'Revisar agua en encañazón, floración y llenado según tipo de trigo.', 'Ajustar nutrición al suelo y conservar rastrojos.', 'Precisar tipo de trigo y compatibilidad del cultivo siguiente.', 'Desagregar trigo pan y candeal para comparar calidad, contrato y margen.'),
  'Tung': profile('perennial', 'Revisar humedad durante establecimiento y desarrollo de frutos.', 'Proteger suelo entre hileras y verificar drenaje.', 'Planificar poda y renovación por sectores según vigor y sanidad.', 'Confirmar capacidad de recolección, procesamiento y comprador del aceite.'),
  'Yerba mate': profile('perennial', 'Seguir humedad durante implantación y brotación y manejar competencia de coberturas.', 'Conservar cobertura y revisar erosión, acidez y fertilidad del yerbal.', 'Planificar poda, descansos y renovación por sectores según vigor.', 'Comparar intensidad de cosecha, recuperación de plantas y logística a secadero.')
};

export interface CropManagementRecommendation {
  crop: MagypCrop;
  system: ManagementProfile['system'];
  basis: 'qualitative_rules';
  actions: Array<{ objective: Objective; title: string; detail: string }>;
  context: string[];
}

const normalize = (value: string) => value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const aliases: Record<string, MagypCrop> = {
  soybean: 'Soja 1ra', soja: 'Soja 1ra', soja1: 'Soja 1ra', 'soja de primera': 'Soja 1ra',
  soja2: 'Soja 2da', 'soja de segunda': 'Soja 2da', maize: 'Maíz', corn: 'Maíz',
  wheat: 'Trigo total', trigo: 'Trigo total', sunflower: 'Girasol', sorghum: 'Sorgo', barley: 'Cebada cervecera', cebada: 'Cebada total'
};

export function resolveManagementCrop(value: string): MagypCrop | null {
  const key = normalize(value);
  return MAGYP_CROPS.find(crop => normalize(crop) === key) ?? aliases[key] ?? null;
}

export function recommendCropManagement(input: RotationEngineInput): CropManagementRecommendation[] {
  const crops = [...new Set((input.currentCropIds ?? []).map(resolveManagementCrop).filter((crop): crop is MagypCrop => crop !== null))];
  const first: Objective = ({ conserve_moisture: 'water', drought_resilience: 'water', build_soil_organic: 'soil', erosion_control: 'soil', maximize_margin: 'margin' } as const)[input.priorities.priority] ?? 'succession';
  const titles: Record<Objective, string> = { water: 'Optimizar el manejo del agua', soil: 'Proteger suelo y nutrición', succession: 'Planificar continuidad y sucesión', margin: 'Revisar eficiencia y margen' };
  const objectives: Objective[] = [first, ...(['water', 'soil', 'succession', 'margin'] as const).filter(objective => objective !== first)];
  return crops.map(crop => {
    const definition = CROP_MANAGEMENT_PROFILES[crop];
    const context: string[] = [];
    if (input.irrigationAvailable) {
      context.push(Number.isFinite(input.maxMonthlyIrrigationMm) && input.maxMonthlyIrrigationMm! >= 0
        ? `Riego declarado de hasta ${input.maxMonthlyIrrigationMm} mm/mes. Verificar distribución y humedad del suelo antes de programar aplicaciones.`
        : 'Riego disponible. Registrar volumen y eficiencia de aplicación para evaluar ajustes.');
    } else context.push('Secano. Revisar reserva del perfil y pronóstico local al definir labores y ocupación del suelo.');
    if (input.soil.type === 'sandy_loam') context.push('Suelo franco arenoso. Priorizar cobertura y seguimiento frecuente de humedad por su menor retención.');
    if (input.soil.type === 'clay_vertisol') context.push('Suelo arcilloso. Verificar drenaje y transitabilidad antes de regar o ingresar maquinaria.');
    if (input.soil.type === 'aridisol_calcareous') context.push('Suelo árido o calcáreo. Revisar salinidad, calidad de agua y protección frente a erosión.');
    if (input.previousCropId) context.push(`Antecesor declarado ${input.previousCropId}. Revisar familia, sanidad y residualidad antes de definir la sucesión.`);
    return { crop, system: definition.system, basis: 'qualitative_rules', actions: objectives.map(objective => ({ objective, title: titles[objective], detail: definition[objective] })), context };
  });
}
