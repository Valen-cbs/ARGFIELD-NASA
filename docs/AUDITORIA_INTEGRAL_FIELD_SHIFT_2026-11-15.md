# Auditoría integral de ArgField — Field Shift

Fecha: **15 de noviembre de 2026** (Argentina). Versión examinada: **`aa6dadc8094a934f072e5974839b0e44090076da`**, rama `main` de `Valen-cbs/ARGFIELD-NASA`.

Alcance: inspección del repositorio, trazabilidad de datos, ejecución de las pruebas existentes, experimentos en memoria sobre funciones exportadas y consultas reales en dos puntos públicos. No se modificó código de aplicación, tests, configuración ni la interfaz de registro. Este informe es el único archivo destinado al commit, conforme a la instrucción posterior de publicar el resultado en `main`. Los hallazgos describen el commit indicado; no atribuyen estado definitivo a cambios que otro desarrollador esté preparando.

Convenciones: **observación** = código o ejecución comprobados; **inferencia** = consecuencia razonada de esa evidencia; **recomendación** = trabajo futuro, no implementado. Las respuestas externas son una fotografía temporal, no una garantía de servicio ni un diagnóstico de un establecimiento.

## 1. Veredicto general

**¿ArgField cumple Field Shift? Parcialmente.**

El enunciado oficial exige combinar observaciones NASA, información local del suelo, características de cultivos y prioridades del productor para explorar rotaciones que protejan el suelo y permitan adaptarse. La aplicación sí obtiene observaciones ambientales reales por coordenada, distingue fechas y estados de calidad, registra múltiples estancias y tiene avisos iniciales. Sin embargo, **su motor no genera ni compara secuencias agrícolas concretas condicionadas por esos cuatro insumos**.

La evidencia decisiva está en `generateRotationStrategies` (`src/services/rotationOptimizer.ts:9`): elige entre dos conjuntos fijos de tres mensajes, cada uno con un solo paso. Para anuales propone una cobertura sin especie definida, otro cultivo sin identificar y conservar residuos. No calcula compatibilidad ni ordena alternativas. Cambiar suelo, riego, coordenadas, cultivo anterior o prioridad dejó la salida JSON idéntica en los experimentos. Un aviso de déficit o exceso de agua solo cambió una frase común a los tres planes.

Además, **ninguna observación NASA de las integraciones activas influye actualmente en la elección de la rotación**. El aviso de sequedad que sí modifica esa frase nace del percentil SAOCOM (CONAE); el aviso de lluvia abundante proviene de Open-Meteo. SMAP, GPM IMERG, estatus hídrico derivado de GPM y MODIS llegan a visualización, pero no a una evaluación de alternativas.

La calificación parcial reconoce trabajo funcional y datos reales; no implica que el núcleo agrícola esté resuelto. Tampoco se penalizan la ausencia de autenticación, backend obligatorio, infraestructura compleja ni IA.

### Evaluación de las seis dimensiones

| Dimensión | Evaluación fundamentada |
| --- | --- |
| A. Cumplimiento funcional | Parcial: registro y monitoreo presentes; falta explorar secuencias concretas con restricciones y objetivos. |
| B. Calidad de datos | Hay procedencia, conversión y estados explícitos; disponibilidad variable, productos antiguos y representatividad puntual. No hay propiedades locales verificadas del suelo. |
| C. Fundamento agronómico | Insuficiente para recomendar una rotación: base reducida, sin referencias por parámetro, calendarios, compatibilidad ni balance hídrico. |
| D. Utilidad para el productor | Útil para consultar condiciones y orientar una recorrida. Aún no permite elegir justificadamente entre rotaciones viables. |
| E. Transparencia | Buena distinción de NoData/antigüedad y límites satelitales; contradicciones entre Inicio, Optimizador, README y exportación. |
| F. Viabilidad del MVP | Viable con un conjunto agrícola acotado, datos de suelo declarados con procedencia y reglas cualitativas trazables. No requiere añadir infraestructura. |

## 2. Matriz de cumplimiento

| Requisito NASA | Estado | Implementación encontrada | Evidencia | Qué falta |
| --- | --- | --- | --- | --- |
| Observaciones NASA | Parcial | SMAP y GPM por CONAE; MODIS por STAC. Valores reales, fechas y filtros. | `satelliteProducts.ts`, `satelliteApi.ts`; consultas de §4. | Participación efectiva y explicada en evaluación de rotaciones; comportamiento útil ante ausencia o antigüedad. |
| Información local del suelo | No cumple | `soilType` y cuatro fichas genéricas; valor inicial `mollisol_deep`. | `App.tsx:116`, `data/crops.ts`, `FarmRegistryModal.tsx:104`. | Propiedades del lote o declaración explícita del productor con fuente, fecha, profundidad y desconocidos. Consumirlas en decisiones. |
| Características de cultivos | Parcial | 41 nombres MAGyP y fichas de siete `MainCrop`, con ciclo, agua, raíz y resistencia. | `data/magypCrops.ts`, `data/crops.ts:16`. | Identidad agrícola consistente, anuales/perennes, referencias, ventanas y reglas de compatibilidad. El motor no importa estas fichas. |
| Prioridades del productor | Parcial | Inicio permite seleccionar cuatro objetivos y cambia un ejemplo fijo. Los tipos contemplan cinco. | `FarmProfileView.tsx:88`, `:139`, `:263`. | Que afecten las alternativas y sus compromisos en el motor común. |
| Estrategias de rotación | No cumple | Tres orientaciones fijas de un paso; dos grupos según detector textual de perennes. | `rotationOptimizer.ts:21`, `:33`, `:42`. | Secuencias concretas por lote, precedencia, calendario, restricciones y comparación. |
| Salud del suelo | Parcial | Textos de cobertura, residuos y diversificación; beneficios locales no estimados. | `rotationOptimizer.ts:23`, `RotationStrategies.tsx`. | Evaluación cualitativa específica y documentada; no hace falta inventar carbono o rendimiento. |
| Adaptación climática | Parcial | Avisos de calor, lluvia y percentil seco; solo agua cambia el resumen de planes. | `weatherAlerts.ts`, `satelliteAlerts.ts`, `rotationOptimizer.ts:14`. | Que agua, clima y contexto modifiquen viabilidad/advertencias de secuencias. No equiparar siete días de pronóstico a clima estacional. |
| Apoyo a decisiones | Parcial | Monitoreo, avisos y selección entre tres tarjetas. | `FarmProfileView.tsx`, `RotationStrategies.tsx`. | Comparación de opciones concretas con datos usados/faltantes, objetivos, razones y restricciones verificables. |

## 3. Auditoría del optimizador

### Funcionamiento real y fragmentos decisivos

```ts
const crops = farm.cropAllocations?.map(item => item.crop) ?? [];
const crop = crops[0] ?? mainCropNames[farm.currentCrop];
const perennials = crops.filter(item => PERENNIAL.test(item));
const isPerennial = perennials.length > 0;
const drySignal = activeAlerts.some(alert =>
  alert.type === 'soil_moisture_deficit' || alert.type === 'rainfall_deficit');
const wetSignal = activeAlerts.some(alert => alert.type === 'excess_precipitation');
```

`rotationOptimizer.ts:10`: toma el primer cultivo por orden de selección, no por mayor superficie. El resto de anuales no modifica los planes. `:21` crea un arreglo con **un solo paso** para cada opción; `:27` arma los objetos. No hay búsqueda, simulación, función objetivo, ordenamiento ni filtro agronómico. Tampoco hay requisito de usar un algoritmo complejo: faltan incluso reglas cualitativas de viabilidad.

Los tres planes anuales (`:42`) son siempre `cover-crop`, `crop-diversity`, `residue`. Si cualquier nombre coincide con `PERENNIAL`, devuelve exclusivamente `perennial-cover`, `perennial-water`, `perennial-residue` (`:33`). Son orientaciones prudentes de manejo, no rotaciones multianuales calculadas.

### Respuestas a las 18 preguntas obligatorias

| Nº | Pregunta | Respuesta comprobada |
| --- | --- | --- |
| 1 | ¿Cómo genera rotaciones? | Instancia tres plantillas de un paso según presencia de perennes. No genera secuencias. |
| 2 | ¿Qué cultivos combina? | Ninguna combinación concreta en el motor. Dos pasos anuales tienen especie sin definir y el tercero repite el cultivo inicial. |
| 3 | ¿Cómo determina compatibilidad? | No la determina. No consulta familias, ventanas, duración, sanidad ni restricciones regionales. |
| 4 | ¿Usa los cultivos reales? | Parcial: primer nombre para el texto; todos los nombres solo para detectar perennes. Ignora hectáreas y el resto de anuales. |
| 5 | ¿Usa cultivo anterior? | No; `previousCrop` se guarda pero no se lee en este módulo. |
| 6 | ¿Considera coordenadas? | No directamente. Sí se consultan por coordenada los servicios que producen avisos; la influencia indirecta solo es una frase de agua. |
| 7 | ¿Usa precipitaciones? | No recibe acumulados. `excess_precipitation` de Open-Meteo cambia el texto; GPM no produce ese aviso. |
| 8 | ¿Usa humedad? | Solo presencia de un aviso de déficit SAOCOM. No recibe porcentaje, percentil, fecha ni profundidad para evaluar cada alternativa. |
| 9 | ¿Usa propiedades del suelo? | No; ni siquiera lee `soilType`. No existen mediciones locales de textura, carbono o fertilidad en el modelo de decisión. |
| 10 | ¿Considera riego? | No lee `irrigation` ni `irrigationAvailable`. |
| 11 | ¿Considera prioridades? | No lee `priority`. Inicio tiene una lógica independiente que cambia ejemplos. |
| 12 | ¿Distingue anuales/perennes? | Parcial y defectuoso: regex de nombres; falla para `Té`, omite caña de azúcar y no clasifica `currentCrop: pasture` si no hay asignaciones. Un perenne convierte toda la estancia mixta en manejo perenne. |
| 13 | ¿Evalúa salud del suelo? | Solo textos generales. No compara cobertura, diversidad, residuos o familias de secuencias concretas. |
| 14 | ¿Permite comparar? | Permite alternar tres tarjetas. El modo tabla cambia la presentación de los pasos del plan seleccionado; no compara los tres planes lado a lado. |
| 15 | ¿Explica cada alternativa? | Da razones generales y una frase ambiental compartida. No muestra qué dato favoreció una especie frente a otra. |
| 16 | ¿Qué pasa si faltan datos? | Sigue devolviendo tres opciones; sin avisos dice que no hay alerta que permita priorizar. No distingue datos normales de falta de cobertura o fallo de proveedor. |
| 17 | ¿Hay constantes o simulaciones? | `resilienceScore=0`, `waterSavingsPct=0`, raíz 0 y demanda `moderate` son rellenos del contrato. La UI muestra “No estimado” o “A evaluar”, pero JSON exporta los ceros. No son estimaciones validadas. |
| 18 | ¿Influyen las observaciones NASA? | No en la ruta activa de recomendación: SMAP, GPM, estatus hídrico GPM y MODIS se visualizan, pero `deriveSatelliteAlerts` no genera avisos a partir de ellos. |

El fallo de `Té` es reproducible: `/\bté\b/i.test('Té')` es falso por la definición de límite de palabra usada por JavaScript. No es una cuestión de que falte el nombre en el catálogo.

### Recorrido de variables, de origen a interfaz

| Variable | Fuente → transformación → evaluación → resultado → interfaz |
| --- | --- |
| Cultivos y hectáreas | Registro MAGyP → `cropAllocations` en localStorage → primer nombre + regex en `generateRotationStrategies` → textos o rama perenne → `RotationStrategies`. Hectáreas no intervienen. |
| Cultivo anterior | Select del registro → `previousCrop` → persistencia → **sin lectura en evaluación** → no cambia los planes. |
| Ubicación | OSM/coordenadas → `FarmLocation` → `loadSensorObservations` y Open-Meteo → lecturas/avisos → Inicio/Mapa/Alertas. En rotaciones, solo el aviso de agua puede cambiar una frase. |
| SMAP | CONAE WMS → campo `HUMEDAD_DE_SUELO` ×100 → fecha/NoData/rango → `SatelliteReading` → Inicio/Mapa; **sin uso en planes**. |
| GPM diario/mensual | CONAE WMS → campos `PA1D`/`PA1M` en mm → fecha/rango → lectura → Inicio/Mapa; **sin balance, línea de base ni uso en planes**. |
| Estatus hídrico GPM | WMS `PCNTLAPI` → percentil API → lectura → Inicio/Mapa; **no activa `drySignal`**, aunque describa una condición seca. |
| Humedad SAOCOM | WMS `DSS_MSM` → % vol. del producto modelado → lectura → pantalla; **el porcentaje no entra en planes**. |
| Percentil SAOCOM | WMS `DSS_PSM` → valor válido, vigente y no cacheado → `deriveSatelliteAlerts` ≤20 → aviso `soil_moisture_deficit` → Alertas y frase compartida en planes; no cambia especies ni pasos. |
| NDVI/radar/LST | STAC → píxel, calidad y conversiones → lectura → Inicio/Mapa; **sin uso para rotación**. |
| Pronóstico | Open-Meteo con coordenadas → máximas/suma diaria → `forecastHazardAlerts` → calor o exceso de lluvia → Inicio/Alertas; únicamente exceso cambia frase de planes. |
| ET0 | Open-Meteo en `WeatherView` → parser/presentación meteorológica → **sin ruta al optimizador ni balance de agua**. |
| Suelo | Valor por defecto/heredado o selector de componente antiguo → `soilType` → etiqueta en Optimizador; **no evaluación**. `SOIL_DATABASE` contiene fichas genéricas, no análisis del lote. |
| Riego | Checkbox → `irrigationAvailable` y `irrigation` → persistencia → **sin lectura del motor**. Puede quedar `true` junto a `dryland` por heredar `template.irrigation`. |
| Prioridad | Botones en Inicio → `priority` guardada → `switch` de `FarmProfileView` → ejemplo fijo en Inicio. `App` recalcula el optimizador, pero su función no lee esta variable. |

**Dos lógicas distintas de recomendación.** `FarmProfileView.tsx:88` sí muestra secuencias nominales: por ejemplo, “Vicia villosa → Maíz Tardío → Trigo” para conservar agua o “Sorgo Granífero → Vicia → Girasol” para resiliencia. Son textos fijos según prioridad, no salidas del motor. No verifican suelo, ubicación, agua ni cultivo permanente. El usuario puede ver una secuencia en Inicio y tres orientaciones diferentes en Optimizador. La etiqueta Demo limita la pretensión, pero no corrige esa desconexión.

### Experimentos de sensibilidad ejecutados

Perfil base sintético: 100 ha de Soja 1ra, punto público de Resistencia (-27.4514, -58.9867), `mollisol_deep`, secano y conservar humedad, sin alertas. Las funciones se importaron con `node --import tsx --input-type=module`; se comparó `JSON.stringify` y se inspeccionaron `steps`. No se añadieron tests al repositorio.

| Cambio aislado | Resultado observado |
| --- | --- |
| `previousCrop='Maíz'` | JSON idéntico. |
| `soilType='sandy_loam'` | JSON idéntico. |
| `irrigation='surface_canal'` | JSON idéntico. |
| `irrigationAvailable=true` | JSON idéntico. |
| `priority='drought_resilience'` | JSON idéntico. |
| 100 → 900 ha | JSON idéntico. |
| Resistencia → Trelew, región sur | JSON idéntico con los mismos avisos. Esto aísla el motor, no simula nuevas consultas de servicios. |
| Aviso de calor `temperature_anomaly` | JSON idéntico. |
| Aviso de sequedad o exceso de lluvia | Cambia resumen/`nasaDataTrigger`; pasos idénticos. Se inyectó solo `type` para aislar la rama, no una observación real. |
| Solo `Té` o solo `Caña de azúcar` | Devuelve las tres plantillas anuales. |
| Yerba mate + Maíz | Devuelve tres propuestas exclusivamente para yerba mate; maíz queda fuera. |
| Maíz + Soja 1ra | Los textos se refieren a maíz; no compone una estrategia para ambas superficies. |
| SMAP actual con humedad baja | `deriveSatelliteAlerts` devuelve cero avisos; no existe regla SMAP activa. |

## 4. Auditoría de datos y comprobaciones

### Integraciones implementadas y alcance real

`satelliteApi.ts` separa consulta, parseo y validación. Rechaza errores HTTP/OGC, NoData y campos arbitrarios; no usa el primer número del JSON como medición. WMS conserva fecha de metadatos, bounds publicados y condición queryable. STAC busca 90 días, hasta 24 ítems y hasta 12 candidatos; revisa calidad de píxel, no solo existencia de escenas. Estos límites no garantizan encontrar todos los datos posibles.

| Fuente | Transformación comprobada en código | Uso real y límite |
| --- | --- | --- |
| SMAP/SMOS vía CONAE | Fracción ×100 a % vol.; fecha del catálogo; clasificación de antigüedad. | Visualización. No equivalen a textura, fertilidad o agua útil. SMAP superficial no mide directamente todo el perfil radicular. |
| GPM IMERG | Acumulado diario `PA1D`, mensual `PA1M`; mensual fechado por fin del intervalo. | Visualización, no diagnóstico de déficit ni rotación. `maxAgeDays=3/70` es política local de frescura, no validación agronómica. |
| Estatus hídrico | Percentil del índice de precipitación antecedente. | Mostrado; no participa en la regla de sequedad activa. Es un indicador derivado de lluvia, no una medición de propiedades del suelo. |
| SAOCOM | Producto de humedad modelada 0–50 cm y percentil por zonas homogéneas. | Solo percentil vigente genera aviso seco. Cobertura declarada pampeana; además se comprueban bounds/NoData. Un punto no representa todas las hectáreas. |
| Sentinel-2 | `(NIR-rojo)/(NIR+rojo)`, corrección de baseline/escala; clases SCL admitidas 4, 5 y 6. | NDVI puntual, admite agua. No demuestra estrés ni tendencia con una lectura; mapa óptico en color natural, no mapa NDVI calculado para toda la estancia. |
| Sentinel-1 RTC | `10*log10(vv)` para VV positivo. | Retrodispersión gamma nought; no conversión a humedad/compactación. |
| MODIS | Escala del asset o 0.02, Kelvin → Celsius; control QC. | Compuesto diurno de 8 días, no temperatura instantánea del aire ni anomalía estacional. |
| VIIRS/GOES, inundaciones | Productos WMS en catálogo/Mapa; consulta puntual si el servicio lo permite. | No están en la carga de Inicio ni producen avisos automáticos de proximidad o rotación. No se repitieron consultas reales de estas capas en esta auditoría. |
| Fusariosis | % incidencia modelada CONAE, vigencia y cultivo `currentCrop==='wheat'`. | Aviso de seguimiento sin fenología comprobada. Si trigo es un cultivo secundario del registro, puede omitirse. |
| Anomalías de rinde CONAE | Capas de escenarios, no rendimiento medido del lote. | Mapa/contexto; sin uso en motor. No se verificó su disponibilidad en vivo. |
| Open-Meteo | Inicio pide máximas/mínimas, precipitación, temperatura actual, humedad del aire y código de tiempo. Clima pide además variables horarias, viento y ET0. | Pronóstico meteorológico de siete días y avisos; no proyección climática estacional. Dos flujos/cachés separados. |
| SoilGrids/INTA | No se encontró cliente ni ingestión efectiva de propiedades locales. | Las menciones institucionales y fichas no prueban integración. ISRIC sigue publicando aviso de pausa de REST; no se debe prometer disponibilidad. |
| Otras misiones del catálogo | `satelliteMissions.ts` distingue `productIds`; varias están vacías. | Fichas informativas no cuentan como sensores conectados. Amazonia-1 permanece como fuente pendiente; no se encontró CBERS-4A en el código de producción examinado. |

### Consultas reales de esta auditoría

Ejecución iniciada **2026-11-15 13:55:11 ART / 16:55:11 UTC**. Se llamó a `loadSatelliteProduct` con los once productos de Inicio en dos centros urbanos públicos; se tradujeron las rutas proxy a sus destinos fijos como hace el script de auditoría existente. Timeout adicional de transporte de 12 s por solicitud. No se ejecutó `audit:satellites` porque sobrescribe los informes anteriores. No se enviaron perfiles personales. Son píxeles de centros urbanos y **no validan aptitud agronómica de un campo**.

| Producto | Resistencia (-27.4514, -58.9867) | Pergamino (-33.896, -60.573) |
| --- | --- | --- |
| SAOCOM humedad | Error HTTP 503, sin valor | Error HTTP 503, sin valor |
| SAOCOM percentil | Error HTTP 503, sin valor | Error HTTP 503, sin valor |
| Fusariosis | Error HTTP 503, sin valor | Error HTTP 503, sin valor |
| SMAP | NoData; metadatos 2023-11-21 | NoData; metadatos 2023-11-21 |
| SMOS | 33.659 % vol., **antiguo**, 2026-01-14 | 6.353 % vol., **antiguo**, 2026-01-14 |
| GPM diario | 24.4 mm/día, 2026-11-14, disponible | 0.1 mm/día, 2026-11-14, disponible |
| GPM mensual | 98.715 mm, octubre; fin 2026-10-31 | 124.615 mm, octubre; fin 2026-10-31 |
| Percentil API | 17.942, 2026-11-14, disponible | 52.224, 2026-11-14, disponible |
| Sentinel-2 NDVI | 0.250, 2026-11-11, disponible | -0.049, 2026-11-11, disponible |
| Sentinel-1 VV | -10.024 dB, 2026-11-06, disponible | -6.144 dB, 2026-11-13, disponible |
| MODIS LST | 28.81 °C superficie; fin 2026-10-31 | 23.17 °C superficie; fin 2026-10-31 |

La validación no se limitó a HTTP 200: los valores anteriores atravesaron los parsers, conversión, selección de banda, control de calidad y clasificación temporal de producción. Esto valida el recorrido técnico en esos puntos y momentos; no es calibración independiente de exactitud física. Un HTTP 503 no demuestra ausencia de cobertura; tampoco permite afirmar que SAOCOM funcione hoy en esos puntos. El histórico `docs/AUDITORIA_SATELITAL.md` registra otros resultados previos y diez productos por punto; no se confundió con esta ronda de once.

Ejemplos de escenas devueltas, identificables en Planetary Computer:

- Resistencia NDVI: `S2B_MSIL2A_20261111T135749_R067_T21JUK_20261111T191733`.
- Pergamino NDVI: `S2B_MSIL2A_20261111T135749_R067_T20HQH_20261111T191733`.
- Resistencia radar: `S1C_IW_GRDH_1SDV_20261106T092027_20261106T092052_010214_014658_rtc`.
- Pergamino radar: `S1C_IW_GRDH_1SDV_20261113T091406_20261113T091431_010316_0149A9_rtc`.
- MODIS Resistencia: `MYD11A2.A2026297.h12v11.061.2026307171701`; Pergamino: `MOD11A2.A2026297.h12v12.061.2026307171559`. La fecha mostrada es fin del compuesto, no una adquisición instantánea el 31 de octubre.

Open-Meteo respondió con estructura, unidades y fechas coherentes para Resistencia: temperatura a 2 m 30.8 °C, hora del proveedor `2026-11-15T13:45`; siete días del 15 al 21, máximas `[31.3,33.5,32.4,28.1,32.4,27.1,30.6]` °C y lluvia `[0,0.3,2.2,19.4,4.5,19.5,0]` mm (45.9 mm). Es una consulta reducida a temperatura actual y variables diarias, no una prueba de todos los campos de Clima. No dispara las reglas de calor o exceso; ausencia de esas alertas no equivale a ausencia de riesgo agrícola.

### Alertas: reglas, unidades y límites

`forecastHazardAlerts` implementa correctamente los comparadores inclusivos de **35 °C en tres elementos contiguos**, **50 mm en un día** o **100 mm acumulados**, para el payload esperado de siete días consecutivos. La solicitud fija Celsius/mm. Cultivos solo se enumeran en el texto; no cambian umbrales ni se conoce etapa fenológica. Los umbrales están documentados como orientativos, sin bibliografía de calibración por cultivo/región. No hay pérdida de rendimiento estimada en este flujo.

La función no valida antigüedad, continuidad de fechas ni longitud exactamente siete. Experimentos comprobados: fechas de 2020 generan un aviso titulado pronóstico; tres fechas alternadas con 35 °C dicen “tres días consecutivos”; tres días con `[40,40,40]` mm dicen “120 mm en siete días”. También exige simultáneamente series completas de temperatura y lluvia: si falta una, suprime incluso el aviso de la otra. Son defectos de robustez, no prueba de que Open-Meteo esté entregando esos payloads hoy.

`deriveSatelliteAlerts` filtra `available`, fecha vigente y caché offline. Usa percentil SAOCOM ≤20; ≤2 obtiene score 85 y el resto 65. Fusariosis usa ≥20 con score 50, o ≥40 con score 70. Esos scores y severidades son constantes de implementación, **no probabilidad de daño calibrada**. No hay justificación por etapa del trigo. El factor genérico de percentil también aparece en el aviso de fusariosis. No existe regla activa de déficit de precipitación GPM ni alerta de calor MODIS.

`scoring.ts` contiene otro motor de cinco factores con porcentajes y afirmaciones sin respaldo local (pérdida de rinde de hasta 32%, agotamiento 40% más rápido y referencias generalizadas a 50 cm). **No está importado por la ruta de producción de `App`**; no corresponde atribuir esos cálculos a las recomendaciones actuales. Debe retirarse o corregirse antes de reutilizarlo. El caso SMAP superficial es incompatible con generalizar una medición directa a 50 cm; productos modelados de zona radicular requieren identificación propia.

### Pruebas automatizadas y alcance de verificación

| Comprobación | Resultado de esta sesión |
| --- | --- |
| Instalación | `npm ci --ignore-scripts` completó; Node 24.22.1. No cambió lockfile. |
| `npm test` | Bloqueó el launcher `tsx` por socket IPC (`EPERM`). Se usó el mismo archivo con `node --import tsx --test tests/satellite.test.ts`. |
| Suite unitaria equivalente | **24/24 aprobadas**. Cubre parsing, fechas, NoData, conversiones, bounds, errores, candidatos STAC y avisos satelitales. |
| `npm run lint` | Aprobado; el script ejecuta `tsc --noEmit`, no un linter de estilo independiente. |
| `npm run build` | Aprobado con Vite 8.3.8. JS principal 834.07 kB / gzip 254.62 kB; advertencia de chunk mayor a 500 kB. |
| `npm run test:e2e` | Once casos no llegaron a ejecutar interacciones: falta Chrome en `/opt/google/chrome/chrome`. |
| Reintento con Chromium instalado | Config temporal fuera del repo, `/usr/bin/chromium`; el navegador abortó por `socket() Operation not permitted`. **Navegador no verificado**, no once defectos funcionales demostrados. |
| Sensibilidad del motor/avisos | Ejecutada en memoria; resultados de §3 y esta sección. No integra la suite de 24 casos. |
| Registro y persistencia en navegador | Implementación y test existentes inspeccionados; ejecución funcional no verificada en este entorno. |
| APIs reales | 22 lecturas de productos procesadas + consulta meteorológica reducida, según tabla anterior. No se probó despliegue público/CORS del hosting. |

Las pruebas de navegador usan respuestas sintéticas y bloquean proveedores externos; aun aprobadas no demostrarían disponibilidad en vivo ni validez agronómica. La suite unitaria no contiene pruebas de `generateRotationStrategies`, prioridades, catálogo MAGyP o reglas meteorológicas. La aprobación técnica no demuestra cumplimiento agrícola.

Para reproducir los casos mínimos del motor sin escribir archivos:

```sh
node --import tsx --input-type=module <<'JS'
import { generateRotationStrategies as gen } from './src/services/rotationOptimizer.ts';
const f = { location: { lat: -27.4514, lng: -58.9867 },
  fieldSizeHectares: 100, currentCrop: 'soybean',
  cropAllocations: [{crop: 'Soja 1ra', hectares: 100}],
  soilType: 'mollisol_deep', irrigation: 'dryland', priority: 'conserve_moisture' };
const base = JSON.stringify(gen(f, []));
for (const patch of [{previousCrop:'Maíz'}, {soilType:'sandy_loam'},
  {irrigation:'surface_canal'}, {priority:'drought_resilience'}])
  console.log(patch, JSON.stringify(gen({...f, ...patch}, [])) === base);
console.log(gen({...f, cropAllocations:[{crop:'Té', hectares:100}]}, []).map(p=>p.id));
JS
```

Debe imprimir `true` en las cuatro comparaciones y los tres IDs anuales para Té en el commit auditado. Es JavaScript de diagnóstico; el perfil mínimo solo contiene los campos leídos por el experimento, no una validación completa de `FarmProfile`.

### Registro y catálogo: observaciones estáticas, sujetas al trabajo paralelo

`FarmRegistryModal` contempla productor opcional, nombre, búsqueda OSM, ha/m² (factor 0.0001), cultivos, áreas, anterior y checkbox de riego. Valida áreas positivas y suma no superior al total. `App` guarda lista y estancia activa en localStorage y permite CRUD. El registro permite elegir un resultado de búsqueda OSM; no incluye un mapa Leaflet embebido para posicionar el punto dentro del lote. Mapa y editor de ubicación existen como flujos separados.

Los 41 nombres solicitados figuran en `MAGYP_CROPS`. No fue posible cotejar en vivo el reporte MAGyP porque la consulta web devolvió HTTP 403; se comprobó coincidencia con el listado del adjunto, no actualidad oficial del catálogo. `canAddMagypCrop` evita combinar totales con variantes, pero **también impide variantes entre sí**: con Soja 1ra seleccionada no permite Soja 2da, y el helper de sustitución elimina la primera. La restricción excede evitar doble cómputo de agregaciones y limita registrar superficies distintas.

`cropToMain` convierte todo cultivo sin uno de seis nombres reconocidos a `pasture`: arroz, algodón, té y otros pasan a tener esa identidad auxiliar, aunque `cropAllocations` conserve el nombre correcto. El perfil tampoco registra cultivos anteriores, suelo o riego por lote; la estancia completa comparte un punto y un anterior. `irrigationAvailable=true` puede coexistir con `irrigation='dryland'`. Nuevas estancias heredan suelo y prioridad de `template`; eso no constituye medición local. Estos son hallazgos del commit, no indicaciones de alterar ahora el registro en desarrollo paralelo.

## 5. Problemas críticos

1. **Falta el núcleo de rotaciones evaluables.** Plantillas genéricas de un paso no permiten comparar secuencias viables; no usan características de los cultivos ni antecedentes.
2. **No hay información local del suelo utilizable en decisiones.** Una clase por defecto y una ficha regional no sustituyen datos declarados o medidos con procedencia. Se necesita, además, representar explícitamente lo desconocido.
3. **Las observaciones NASA quedan fuera de la decisión.** La app transforma datos en lecturas útiles, pero no en restricciones o razones específicas de una rotación. Con SAOCOM caído o fuera de cobertura, tampoco obtiene por esa regla una señal de humedad aplicable al NEA.
4. **Prioridades y contexto no gobiernan el mismo motor.** Inicio cambia una secuencia fija; Optimizador ignora prioridad, riego, suelo y anterior. La experiencia promete una conexión que el código no implementa.
5. **Identidad y unidad agrícola inconsistentes.** Fallback a pastura, perennes mal detectados y mezcla de cultivos de toda la estancia impiden orientar correctamente el manejo de cada superficie. Hay que resolverlo antes de afirmar cobertura de los 41 cultivos.
6. **Falta trazabilidad de viabilidad agronómica.** No hay calendario/familia/precedencia, fuentes por regla ni razones de descarte. La advertencia de consultar un profesional es prudente pero no sustituye esas reglas de apoyo.

## 6. Problemas secundarios

- Robustecer fechas y datos incompletos de pronóstico; mostrar que un proveedor falló en vez de sugerir que no hay información para priorizar sin distinguir la causa. Calor no influye en planes.
- Describir umbrales y scores como reglas iniciales; documentar y revisar sus cortes. La categoría “critical” no debería interpretarse como daño comprobado.
- Unificar procedencia y modo de operación: README y `ExportReportModal` todavía dicen que el clima es demo; el flujo activo consulta Open-Meteo real. “Aporte Edáfico / INTA” y About atribuyen respaldo/integración sin referencias efectivas del lote.
- Cambiar contratos a valores ausentes explícitos para métricas desconocidas: los ceros de agua, raíces y resiliencia viajan al JSON aunque la pantalla diga no estimado.
- Corregir conflictos MAGyP entre variantes, sincronizar los dos campos de riego y evitar atribuir propiedades del suelo heredadas al nuevo establecimiento.
- Mantener límites de representatividad: la superficie declarada no convierte un píxel en promedio del campo. Los polígonos y estadísticas zonales serían una mejora posterior, no condición para un MVP puntual honesto.
- Caché satelital solo en memoria y sin refresco periódico automático en `useSatelliteData`; al recargar offline puede perderse. La vigencia se reevalúa al derivar avisos, pero las tarjetas no tienen temporizador propio de actualización. Confirmar UX cuando haya navegador disponible.
- Reducir bundle mediante carga diferida cuando el núcleo funcione. La advertencia de 500 kB no impide compilar ni justifica rediseñar la infraestructura.
- Eliminar o aislar módulos desconectados como `scoring.ts` y el antiguo `LocationPicker` (sin importadores encontrados), para evitar reactivar afirmaciones no verificadas.

## 7. Plan mínimo de corrección (no implementado)

| Prioridad / tarea | Problema y archivos probables | Comportamiento que debe conseguirse | Verificación de aceptación |
| --- | --- | --- | --- |
| P0 — Definir unidad de decisión e identidad de cultivos | `types/index.ts`, `data/magypCrops.ts`, `data/crops.ts`, registro cuando termine el trabajo paralelo. | Seleccionar una asignación/lote para explorar. IDs estables, ciclo anual/perenne explícito, sin convertir desconocidos a pastura. Catálogo estadístico separado de especies parametrizadas; cultivos sin soporte se informan. | Té/perennes no reciben rotaciones anuales; un lote anual no desaparece por coexistir con yerba mate. Soja 1ra/2da pueden ocupar áreas distintas sin sumar “total”. |
| P0 — Incorporar suelo local declarado y procedencia | `types/index.ts`, formulario de perfil, `data/crops.ts`. | Textura/drenaje y antecedentes disponibles con fuente/fecha/profundidad, permitiendo desconocido. Datos aportados por productor o análisis; no inferirlos de humedad/NDVI. Sin esperar REST SoilGrids. | Dos perfiles de suelo cambian advertencias justificadas; un campo desconocido nunca aparece como medición. Persistencia entre estancias sin herencia inadvertida. |
| P0 — Construir alternativas concretas y motor común | `rotationOptimizer.ts`, `data/crops.ts`, `FarmProfileView.tsx`. | Empezar con un subconjunto documentado y validado de cultivos argentinos. Proponer al menos dos secuencias de dos o más campañas para el lote anual elegido; usar actual/anterior, familias, ventanas y restricciones. Inicio muestra el mismo resultado que Optimizador. | Casos de precedencia y calendario rechazan incompatibles; cada secuencia tiene cultivos/estaciones concretos, explicación y fuentes. No exige optimización matemática ni rendimiento simulado. |
| P0 — Hacer intervenir NASA y agua sin extrapolar | `rotationOptimizer.ts`, `App.tsx`, `satelliteApi.ts`, `weatherAlerts.ts`. | Pasar contexto ambiental con valor/unidad/fecha/calidad a la evaluación. Usar, por ejemplo, GPM y estatus hídrico ya conectados como evidencia contextual, con reglas justificadas y límites explícitos. Un dato diario aislado no declara sequía estacional. | Manteniendo el perfil, cambiar solo una observación NASA válida modifica una restricción/advertencia/razón identificable. Dato antiguo/NoData no se convierte en cero ni en condición favorable. Registrar qué producto se utilizó. |
| P0 — Prioridades y riego con efecto explicable | `rotationOptimizer.ts`, `types/index.ts`, `FarmProfileView.tsx`. | Unificar riego y aplicar objetivo seleccionado como criterio transparente entre alternativas viables. Mostrar compromisos cualitativos de agua, cobertura y diversidad; no prometer ahorros porcentuales. | Con iguales datos, cambiar objetivo modifica la comparación o se explica por qué no hay diferencia. Secano/riego altera restricciones pertinentes sin asumir caudal disponible. |
| P1 — Comparación e incertidumbre | `RotationStrategies.tsx`, `types/index.ts`, `ExportReportModal.tsx`, `DemoBadge.tsx`, README/About. | Comparación paralela de secuencias, datos utilizados/faltantes, razones de descarte y limitaciones. `null`/estado desconocido en métricas sin cálculo. Separar observaciones, inferencias y opciones. | UI y exportación coinciden, sin ceros confundibles con mediciones, atribuciones INTA no respaldadas ni clima real etiquetado demo. |
| P1 — Fortalecer avisos y regresiones | `weatherAlerts.ts`, `satelliteAlerts.ts`, tests existentes y nuevos casos de dominio. | Validar continuidad/vigencia de fechas; independencia de variables; cultivos secundarios y etapa desconocida; documentar umbrales. Mantener monitoreo separado de daño confirmado. | Pruebas de fechas viejas/no consecutivas, lluvia incompleta, trigo secundario y NoData; no aparecen diagnósticos o probabilidades inventadas. |

Orden sugerido: definir identidad/unidad y suelo mínimo, construir secuencias documentadas, conectar evidencia NASA y prioridades a ese mismo motor, luego presentar la comparación. La validación agronómica debe limitar la cobertura a los cultivos/regiones respaldados; los 41 nombres no obligan a fingir soporte agronómico de todos. Ninguna tarea necesita autenticación, backend nuevo, IA ni otra misión satelital.

## 8. Evaluación final

**A. ¿Apoyo real a decisiones agrícolas o principalmente visualizador?** Actualmente es principalmente un visualizador ambiental por punto, con registro funcional y avisos de seguimiento. Tiene componentes útiles de apoyo, pero aún no transforma esos datos en una comparación de rotaciones suficientemente específica para ayudar a elegir una secuencia.

**B. ¿Qué mínimo falta en el optimizador?** Unidades/lotes e identidad agrícola coherentes; características documentadas para un conjunto soportado; suelo local declarado o medido; antecedentes y ventanas; generación de secuencias concretas; reglas que usen evidencia NASA, agua y riego; prioridades que afecten la comparación; razones y datos faltantes visibles. Puede ser cualitativo y determinista.

**C. Tres correcciones de mayor impacto antes de presentar:**

1. **Reemplazar las plantillas por dos o tres secuencias concretas para un lote y conjunto acotado de cultivos respaldados**, usando actual/anterior y separando perennes. Es la demostración central del desafío.
2. **Completar contexto de suelo y conectar las fuentes NASA existentes a reglas explicables de evaluación**, preservando fechas, calidad y desconocidos. No añadir satélites para compensar la falta de lógica.
3. **Unificar Inicio y Optimizador, hacer efectiva la prioridad y comparar alternativas con limitaciones visibles**, retirando métricas de relleno y atribuciones sin evidencia. El productor debe entender por qué una opción es pertinente y qué no se puede concluir.

### Referencias y trazabilidad

Fuentes externas consultadas el 15/11/2026; se resume su contenido, sin reproducir extensamente sus textos:

- [Enunciado oficial NASA Space Apps 2026: Field Shift](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/). El buscador recuperó el enunciado; apertura directa devolvió 502. Sustenta los cuatro insumos y el objetivo, no un algoritmo obligatorio.
- [ISRIC: SoilGrids](https://isric.org/explore/soilgrids/) y [documentación de acceso](https://docs.isric.org/globaldata/soilgrids/): aviso de pausa REST y alternativas. No se ejecutó una integración SoilGrids.
- [NASA JPL: descripción de SMAP](https://smap.jpl.nasa.gov/mission/description/) y [producto SMAP/CYGNSS de NASA](https://data.nasa.gov/dataset/smap-cygnss-ease-grid-soil-moisture-v001): humedad superficial; este último identifica los primeros 5 cm. No equiparar con propiedades edáficas ni medición directa de todo el perfil.
- [MAGyP: Estimaciones](https://datosestimaciones.magyp.gob.ar/reportes.php?reporte=Estimaciones): acceso web bloqueado con 403; cotejo oficial en vivo no verificado.
- [Catálogo CONAE](https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html), endpoints de `data/conaeLayers.ts` y [STAC Planetary Computer](https://planetarycomputer.microsoft.com/api/stac/v1): procedencia de las consultas efectivamente realizadas.
- [Open-Meteo Forecast API](https://api.open-meteo.com/v1/forecast?latitude=-27.4514&longitude=-58.9867&current=temperature_2m&daily=temperature_2m_max,precipitation_sum&forecast_days=7&timezone=auto): consulta real reproducible; cambia con el tiempo.

Enlaces al código **fijados al commit auditado**:

- [Motor de rotaciones](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/services/rotationOptimizer.ts#L9).
- [Cableado de servicios y planes](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/App.tsx#L163).
- [Avisos satelitales](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/services/satelliteAlerts.ts#L7) y [meteorológicos](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/services/weatherAlerts.ts#L11).
- [Parseo y conversiones](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/services/satelliteApi.ts#L122), [capas WMS](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/data/conaeLayers.ts) y [productos/edades](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/data/satelliteProducts.ts).
- [Características de cultivos/suelos](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/data/crops.ts), [catálogo MAGyP](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/data/magypCrops.ts) y [registro](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/components/FarmRegistryModal.tsx#L20).
- [Lógica fija de Inicio por prioridad](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/components/FarmProfileView.tsx#L88), [presentación de planes](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/components/RotationStrategies.tsx) y [JSON exportado](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/components/ExportReportModal.tsx#L28).
- [24 tests unitarios](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/tests/satellite.test.ts), [11 casos de navegador](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/tests/browser/satellites.spec.ts) y [scoring desconectado](https://github.com/Valen-cbs/ARGFIELD-NASA/blob/aa6dadc8094a934f072e5974839b0e44090076da/src/services/scoring.ts).
